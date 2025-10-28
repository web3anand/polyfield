require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyC7HKCheUjLY_7N8tNuK2YgKusxflZ0Fnw';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SCAN_INTERVAL = 15000; // 15 seconds
const MIN_LIQUIDITY = 10000; // $10k for more results
const CONSENSUS_THRESHOLD = 0.70; // 70% to see more markets (was 80%)
const EV_ALERT_THRESHOLD = 10000; // Alert on >$10k EV opportunities

// LLM Analysis for high-value markets using Gemini
async function getLLMAnalysis(market) {
  // Only analyze high-value or politically sensitive markets
  const keywords = ['trump', 'election', 'president', 'government', 'war', 'supreme court', 'bitcoin', 'eth', 'fed'];
  const isHighValue = market.liquidity > 50000;
  const isPolitical = keywords.some(kw => market.question?.toLowerCase().includes(kw));
  
  if (!GEMINI_API_KEY || (!isHighValue && !isPolitical)) {
    return null;
  }
  
  try {
    const prompt = `You are a prediction market analyst. Analyze this market for betting edge:

Question: "${market.question}"
Current YES price: ${(parseFloat(market.outcomePrices?.[0] || 0.5) * 100).toFixed(1)}%
Liquidity: $${(market.liquidity / 1000).toFixed(1)}k

Provide:
1. True probability estimate (YES %)
2. Expected value assessment
3. Dispute risk level

Keep it concise (2-3 sentences). Focus on actionable insights.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 200
        }
      })
    });
    
    if (!response.ok) {
      console.log(`⚠️ Gemini API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return analysis || null;
  } catch (error) {
    console.error('❌ LLM analysis error:', error.message);
    return null;
  }
}

async function fetchAllMarkets() {
  try {
    let allMarkets = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    
    console.log('📥 Fetching all available markets...');
    
    // Fetch all markets with pagination - NO LIMIT
    while (hasMore) {
      const response = await fetch(`https://gamma-api.polymarket.com/markets?limit=${limit}&offset=${offset}&active=true&closed=false`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const markets = await response.json();
      
      if (markets.length === 0) {
        hasMore = false;
      } else {
        allMarkets = allMarkets.concat(markets);
        offset += limit;
        
        // Only log every 1000 markets to reduce spam
        if (offset % 1000 === 0) {
          console.log(`   Fetched ${allMarkets.length} markets...`);
        }
        
        // Stop if we got fewer than limit (last page)
        if (markets.length < limit) {
          hasMore = false;
        }
      }
      
      // NO SAFETY LIMIT - fetch everything available
    }
    
    console.log(`✅ Fetched total of ${allMarkets.length} markets from API`);
    
    // Filter out markets that ended more than 7 days ago
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const filtered = allMarkets.filter(market => {
      const endDate = market.endDate ? new Date(market.endDate).getTime() : Date.now();
      return endDate > sevenDaysAgo; // Only markets ending in the future or ended recently
    });
    
    console.log(`📊 ${filtered.length} active markets after 7-day filter`);
    return filtered;
  } catch (error) {
    console.error('❌ Error fetching markets:', error.message);
    return [];
  }
}

async function analyzeMarket(market) {
  const yesPrice = parseFloat(market.outcomePrices?.[0] || 0.5);
  const noPrice = parseFloat(market.outcomePrices?.[1] || 0.5);
  const volume = parseFloat(market.volume) || 0;
  const liquidity = parseFloat(market.liquidity) || 0;
  
  let status = 'MONITORING';
  let consensus = yesPrice * 100;
  let outcome = 'N/A';
  let disputes = 0;
  let ev = 0;
  let llm_analysis = null;
  
  // ONLY TRACK HIGH-QUALITY ALPHA SIGNALS
  // Skip low liquidity markets (< $20k) - higher quality threshold
  if (liquidity < MIN_LIQUIDITY) {
    return null; // Filter out noise
  }
  
  // ONLY SAVE STRONG CONSENSUS (>80% certainty) - These are alpha signals
  if (yesPrice >= CONSENSUS_THRESHOLD) {
    status = 'CONSENSUS';
    outcome = 'YES';
    consensus = yesPrice * 100;
    
    // Calculate Expected Value: (implied_prob - market_price) * liquidity
    // If market is at 0.85 but "should" be 0.95, EV = (0.95 - 0.85) * liquidity
    ev = (0.95 - yesPrice) * liquidity; // Conservative: assume 95% true prob for 80%+ consensus
    
  } else if (noPrice >= CONSENSUS_THRESHOLD) {
    status = 'CONSENSUS';
    outcome = 'NO';
    consensus = noPrice * 100;
    ev = (0.95 - noPrice) * liquidity;
  } else {
    // Skip markets without strong consensus - not actionable alpha
    return null;
  }
  
  // Get LLM analysis for high-value opportunities
  if (ev > 5000 || liquidity > 50000) {
    llm_analysis = await getLLMAnalysis(market);
    if (llm_analysis) {
      console.log(`🤖 LLM: ${market.question?.substring(0, 50)}... | ${llm_analysis.substring(0, 100)}...`);
    }
  }
  
  return { status, consensus, outcome, disputes, liquidity, ev, llm_analysis };
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
          ev: oracle.ev,
          llm_analysis: oracle.llm_analysis,
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
          liquidity: oracle.liquidity,
          ev: oracle.ev,
          llm_analysis: oracle.llm_analysis
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

// Calculate win rate from resolved markets
async function calculateWinRate() {
  try {
    const { data: resolved } = await supabase
      .from('oracles')
      .select('outcome, consensus, status')
      .eq('status', 'RESOLVED');
    
    if (!resolved || resolved.length === 0) return 0;
    
    const wins = resolved.filter(m => {
      const predictedOutcome = m.consensus > 50 ? 'YES' : 'NO';
      return m.outcome === predictedOutcome;
    }).length;
    
    return ((wins / resolved.length) * 100).toFixed(1);
  } catch (error) {
    return 0;
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
  let highEVCount = 0;
  let totalEV = 0;
  
  for (const market of markets) {
    const analysis = await analyzeMarket(market);
    
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
      totalEV += analysis.ev || 0;
      
      // Alert on high EV opportunities
      if (analysis.ev > EV_ALERT_THRESHOLD) {
        highEVCount++;
        console.log(`🚨 HIGH EV ALERT: ${oracle.title.substring(0, 60)}...`);
        console.log(`   ${analysis.outcome} @ ${analysis.consensus.toFixed(1)}% | EV: $${(analysis.ev/1000).toFixed(1)}k | Liq: $${(analysis.liquidity/1000).toFixed(1)}k`);
        if (analysis.llm_analysis) {
          console.log(`   🤖 ${analysis.llm_analysis.substring(0, 120)}...`);
        }
      } else {
        console.log(`✅ Alpha: ${oracle.title.substring(0, 60)}... | ${analysis.outcome} @ ${analysis.consensus.toFixed(1)}% | EV: $${(analysis.ev/1000).toFixed(1)}k`);
      }
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
  
  // Calculate win rate
  const winRate = await calculateWinRate();
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Scan complete: ${elapsed}s`);
  console.log(`🔍 Scanned ${markets.length} markets | Filtered out ${filteredCount} (low liquidity / weak consensus)`);
  console.log(`📊 Inserted: ${insertedCount} | Updated: ${updatedCount} | Deleted: ${deletedCount}`);
  console.log(`🎯 ALPHA SIGNALS: ${consensusCount} strong consensus markets (>${(CONSENSUS_THRESHOLD * 100).toFixed(0)}% certainty, >$${MIN_LIQUIDITY/1000}k liquidity)`);
  console.log(`💰 Total EV: $${(totalEV/1000).toFixed(1)}k across all opportunities | High-EV alerts: ${highEVCount}`);
  console.log(`📈 Historical Win Rate: ${winRate}%\n`);
}

async function init() {
  console.log('🚀 ORACLE ALPHA SCANNER v2.0 - AI-Powered');
  console.log('🎯 Only tracking HIGH-CONVICTION signals (>80% consensus, >$20k liquidity)');
  console.log('🤖 Google Gemini AI analysis for high-value opportunities (>$50k or key markets)');
  console.log('💰 Expected Value (EV) calculation + alerts on >$10k EV opportunities');
  console.log(`⏱️  Scan Interval: ${SCAN_INTERVAL / 1000}s`);
  console.log(`💾 Database: Supabase (${SUPABASE_URL})\n`);

  await scanAllOracles();
  setInterval(scanAllOracles, SCAN_INTERVAL);
}

init().catch(console.error);
