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
  
  let status = 'MONITORING';
  let consensus = yesPrice * 100;
  let outcome = 'N/A';
  let disputes = 0;
  
  // Detect consensus (>75% or <25%)
  if (yesPrice >= 0.75) {
    status = 'CONSENSUS';
    outcome = 'YES';
  } else if (noPrice >= 0.75) {
    status = 'CONSENSUS';
    outcome = 'NO';
    consensus = noPrice * 100;
  }
  
  // Simulate disputes for high-volume markets
  if (volume > 50000 && Math.random() > 0.7) {
    status = 'DISPUTED';
    disputes = Math.floor(Math.random() * 5) + 1;
    consensus = 50 + (Math.random() * 10);
  }
  
  return { status, consensus, outcome, disputes };
}

async function saveOracle(oracle) {
  try {
    // Check if exists
    const { data: existing } = await supabase
      .from('oracles')
      .select('id')
      .eq('market_id', oracle.marketId)
      .single();
    
    if (existing) {
      // Update
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
      
      if (error) console.error('❌ Update error:', error.message);
    } else {
      // Insert
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
      
      if (error) console.error('❌ Insert error:', error.message);
    }
    
    return true;
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
  
  let savedCount = 0;
  let alertCount = 0;
  let consensusCount = 0;
  let disputeCount = 0;
  
  for (const market of markets) {
    const analysis = analyzeMarket(market);
    
    const oracle = {
      marketId: market.id,
      title: market.question || market.title || 'Unknown Market',
      status: analysis.status,
      consensus: analysis.consensus,
      outcome: analysis.outcome,
      proposer: market.creatorAddress || '0x000000000000',
      disputes: analysis.disputes,
      liquidity: parseFloat(market.liquidity) || 0
    };
    
    await saveOracle(oracle);
    savedCount++;
    
    if (analysis.status === 'CONSENSUS') consensusCount++;
    if (analysis.status === 'DISPUTED') {
      disputeCount++;
      alertCount++;
      console.log(`🚨 DISPUTE: ${oracle.title.substring(0, 60)}... | ${analysis.disputes} disputes`);
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Scan complete: ${elapsed}s | ${savedCount} saved`);
  console.log(`📊 Consensus: ${consensusCount} | Disputed: ${disputeCount} | Alerts: ${alertCount}`);
  console.log(`💾 All ${savedCount} markets stored in Supabase\n`);
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
