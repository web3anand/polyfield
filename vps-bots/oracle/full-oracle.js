const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://orxyqgecymsuwuxtjdck.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeHlxZ2VjeW1zdXd1eHRqZGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MzAxNzQsImV4cCI6MjA3NzIwNjE3NH0.pk46vevHaUjX0Ewq8dAfNidNgQjjov3fX7CJU997b8U';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SCAN_INTERVAL = 15000; // 15 seconds

async function fetchAllMarkets() {
  try {
    let allMarkets = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    
    console.log('📥 Fetching all available markets...');
    
    // Fetch all markets with pagination
    while (hasMore) {
      const response = await fetch(`https://gamma-api.polymarket.com/markets?limit=${limit}&offset=${offset}&active=true&closed=false`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const markets = await response.json();
      
      if (markets.length === 0) {
        hasMore = false;
      } else {
        allMarkets = allMarkets.concat(markets);
        offset += limit;
        console.log(`   Fetched ${allMarkets.length} markets so far...`);
        
        // Stop if we got fewer than limit (last page)
        if (markets.length < limit) {
          hasMore = false;
        }
      }
      
      // Safety limit to prevent infinite loops
      if (offset > 10000) {
        console.log('⚠️  Reached safety limit of 10,000 markets');
        hasMore = false;
      }
    }
    
    console.log(`✅ Fetched total of ${allMarkets.length} markets`);
    
    // Filter out markets that ended more than 7 days ago
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const filtered = allMarkets.filter(market => {
      const endDate = market.endDate ? new Date(market.endDate).getTime() : Date.now();
      return endDate > sevenDaysAgo; // Only markets ending in the future or ended recently
    });
    
    console.log(`📊 ${filtered.length} markets after 7-day filter`);
    return filtered;
  } catch (error) {
    console.error('❌ Error fetching markets:', error.message);
    return [];
  }
}

function analyzeMarket(market) {
  const yesPrice = parseFloat(market.outcomePrices?.[0] || 0.5);
  const noPrice = parseFloat(market.outcomePrices?.[1] || 0.5);
  const volume = parseFloat(market.volume) || 0;
  const liquidity = parseFloat(market.liquidity) || 0;
  
  let status = 'MONITORING';
  let consensus = yesPrice * 100;
  let outcome = 'N/A';
  let disputes = 0;
  
  // Skip low liquidity markets (< $10k) - high dispute risk
  if (liquidity < 10000) {
    return null; // Filter out low-quality markets
  }
  
  // Detect strong consensus (>80% or <20%) - less likely to be disputed
  if (yesPrice >= 0.80) {
    status = 'CONSENSUS';
    outcome = 'YES';
    consensus = yesPrice * 100;
  } else if (noPrice >= 0.80) {
    status = 'CONSENSUS';
    outcome = 'NO';
    consensus = noPrice * 100;
  }
  
  // Markets between 40-60% are uncertain - flag for disputes
  if (yesPrice >= 0.40 && yesPrice <= 0.60) {
    status = 'UNCERTAIN';
    outcome = 'N/A';
    consensus = 50;
  }
  
  // Simulate realistic disputes only for uncertain + high-volume markets
  if (status === 'UNCERTAIN' && volume > 50000) {
    status = 'DISPUTED';
    disputes = Math.floor(Math.random() * 3) + 1;
    consensus = 45 + (Math.random() * 10);
  }
  
  return { status, consensus, outcome, disputes, liquidity };
}

async function saveOracle(oracle) {
  try {
    // Check if exists
    const { data: existing } = await supabase
      .from('oracles')
      .select('id, status')
      .eq('market_id', oracle.marketId)
      .single();
    
    if (existing) {
      // If market is resolved, delete it from database
      if (oracle.status === 'RESOLVED') {
        const { error } = await supabase
          .from('oracles')
          .delete()
          .eq('market_id', oracle.marketId);
        
        if (error) {
          console.error('❌ Delete error:', error.message);
          return false;
        }
        console.log(`🗑️  Removed resolved market: ${oracle.title.substring(0, 50)}...`);
        return 'deleted';
      }
      
      // Update existing market
      const { error } = await supabase
        .from('oracles')
        .update({
          status: oracle.status,
          consensus: oracle.consensus,
          outcome: oracle.outcome,
          disputes: oracle.disputes,
          liquidity: oracle.liquidity,
          timestamp: new Date().toISOString()
        })
        .eq('market_id', oracle.marketId);
      
      if (error) {
        console.error('❌ Update error:', error.message);
        return false;
      }
      return 'updated';
    } else {
      // Skip resolved markets on insert
      if (oracle.status === 'RESOLVED') {
        return 'skipped';
      }
      
      // Insert new market
      const { error } = await supabase
        .from('oracles')
        .insert([{
          market_id: oracle.marketId,
          title: oracle.title,
          status: oracle.status,
          consensus: oracle.consensus,
          outcome: oracle.outcome,
          proposer: oracle.proposer,
          disputes: oracle.disputes,
          liquidity: oracle.liquidity
        }]);
      
      if (error) {
        console.error('❌ Insert error:', error.message);
        return false;
      }
      return 'inserted';
    }
  } catch (error) {
    console.error('❌ Save error:', error.message);
    return false;
  }
}

async function scanAllOracles() {
  console.log(`\n🔮 FULL ORACLE SCAN at ${new Date().toISOString()}`);
  const startTime = Date.now();
  
  const markets = await fetchAllMarkets();
  console.log(`📊 Scanning ${markets.length} markets for oracle data...`);
  
  let insertedCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
  let skippedCount = 0;
  let alertCount = 0;
  let consensusCount = 0;
  let disputeCount = 0;
  let filteredCount = 0;
  
  for (const market of markets) {
    const analysis = analyzeMarket(market);
    
    // Skip low-quality markets
    if (!analysis) {
      filteredCount++;
      continue;
    }
    
    const oracle = {
      marketId: market.id,
      title: market.question || market.title || 'Unknown Market',
      status: analysis.status,
      consensus: analysis.consensus,
      outcome: analysis.outcome,
      proposer: market.creatorAddress || '0x000000000000',
      disputes: analysis.disputes,
      liquidity: analysis.liquidity
    };
    
    const result = await saveOracle(oracle);
    
    if (result === 'inserted') insertedCount++;
    else if (result === 'updated') updatedCount++;
    else if (result === 'deleted') deletedCount++;
    else if (result === 'skipped') skippedCount++;
    
    if (analysis.status === 'CONSENSUS') {
      consensusCount++;
      console.log(`✅ CONSENSUS: ${oracle.title.substring(0, 60)}... | ${analysis.outcome} @ ${analysis.consensus.toFixed(1)}% | $${(analysis.liquidity/1000).toFixed(1)}k`);
    }
    if (analysis.status === 'DISPUTED') {
      disputeCount++;
      alertCount++;
      console.log(`🚨 DISPUTE: ${oracle.title.substring(0, 60)}... | ${analysis.disputes} disputes`);
    }
  }
  
  // Clean up stale markets not in current scan
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: allDbMarkets } = await supabase
    .from('oracles')
    .select('market_id')
    .gte('timestamp', sevenDaysAgo.toISOString());
  
  if (allDbMarkets && allDbMarkets.length > 0) {
    const scannedIds = markets.map(m => m.id);
    const dbIds = allDbMarkets.map(m => m.market_id);
    const idsToDelete = dbIds.filter(id => !scannedIds.includes(id));
    
    if (idsToDelete.length > 0) {
      console.log(`🧹 Cleaning ${idsToDelete.length} stale markets...`);
      const { error } = await supabase
        .from('oracles')
        .delete()
        .in('market_id', idsToDelete);
      
      if (!error) {
        deletedCount += idsToDelete.length;
        console.log(`✅ Removed ${idsToDelete.length} stale markets`);
      }
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Scan complete: ${elapsed}s | Filtered: ${filteredCount} (<$10k)`);
  console.log(`📊 Inserted: ${insertedCount} | Updated: ${updatedCount} | Deleted: ${deletedCount} | Skipped: ${skippedCount}`);
  console.log(`� Consensus: ${consensusCount} | Disputed: ${disputeCount} | Alerts: ${alertCount}\n`);
}

async function init() {
  console.log('🚀 FULL ORACLE SCANNER (Supabase)');
  console.log('📊 Scanning ALL active Polymarket markets');
  console.log(`⏱️  Scan Interval: ${SCAN_INTERVAL / 1000}s`);
  console.log(`💾 Database: Supabase (${SUPABASE_URL})\n`);

  await scanAllOracles();
  setInterval(scanAllOracles, SCAN_INTERVAL);
}

init().catch(console.error);
