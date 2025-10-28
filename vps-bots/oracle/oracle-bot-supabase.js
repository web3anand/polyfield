const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CONSENSUS_THRESHOLD = parseInt(process.env.CONSENSUS_THRESHOLD) || 75;
const SCAN_INTERVAL = parseInt(process.env.SCAN_INTERVAL) || 10000;

async function fetchUMAMarkets() {
  try {
    const response = await fetch('https://gamma-api.polymarket.com/markets?limit=50&active=true');
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const markets = await response.json();
    
    return markets.filter(m => 
      m.question && (
        m.question.toLowerCase().includes('uma') ||
        m.question.toLowerCase().includes('oracle') ||
        m.tags?.some(t => t.toLowerCase().includes('uma'))
      )
    );
  } catch (error) {
    console.error('❌ Error fetching markets:', error.message);
    return [];
  }
}

async function saveOracle(oracle) {
  try {
    const { data, error } = await supabase
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
      console.error('❌ Supabase insert error:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error saving to Supabase:', error.message);
    return false;
  }
}

function analyzeMarket(market) {
  const yesPrice = parseFloat(market.outcomePrices?.[0] || 0);
  const noPrice = parseFloat(market.outcomePrices?.[1] || 0);
  
  let status = 'MONITORING';
  let consensus = 0;
  let outcome = 'N/A';
  
  if (yesPrice >= CONSENSUS_THRESHOLD / 100) {
    status = 'CONSENSUS';
    consensus = yesPrice * 100;
    outcome = 'YES';
  } else if (noPrice >= CONSENSUS_THRESHOLD / 100) {
    status = 'CONSENSUS';
    consensus = noPrice * 100;
    outcome = 'NO';
  }
  
  // Mock dispute detection (in reality, check UMA oracle events)
  const disputes = Math.random() > 0.8 ? Math.floor(Math.random() * 5) : 0;
  if (disputes > 0) {
    status = 'DISPUTED';
    consensus = 52; // Disputed markets show unclear consensus
  }
  
  return {
    status,
    consensus,
    outcome,
    disputes,
    proposer: market.creatorAddress || 'N/A'
  };
}

async function scanOracles() {
  console.log(`\n🔮 Oracle scan started at ${new Date().toISOString()}`);
  const startTime = Date.now();
  
  const markets = await fetchUMAMarkets();
  console.log(`📊 Fetched ${markets.length} potential UMA oracle markets`);
  
  let alertCount = 0;
  let umaCount = 0;
  
  for (const market of markets) {
    const analysis = analyzeMarket(market);
    umaCount++;
    
    const oracle = {
      marketId: market.id,
      title: market.question,
      status: analysis.status,
      consensus: analysis.consensus,
      outcome: analysis.outcome,
      proposer: analysis.proposer,
      disputes: analysis.disputes,
      liquidity: parseFloat(market.liquidity) || 0
    };
    
    console.log(`${market.question}: ${analysis.status} | ${analysis.outcome} ${analysis.consensus}% | Proposer: ${analysis.proposer.substring(0, 12)}... | Disputes: ${analysis.disputes}`);
    
    if (analysis.status === 'DISPUTED' || analysis.status === 'CONSENSUS') {
      alertCount++;
      await saveOracle(oracle);
      
      if (analysis.status === 'DISPUTED') {
        console.log(`🚨 ORACLE ALERT: Dispute Detected: ${analysis.disputes} disputes for ${market.question}`);
      }
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`⚡ Scan complete: ${elapsed}s | ${markets.length} total | ${umaCount} UMA | ${alertCount} alerts`);
  console.log('');
}

async function init() {
  console.log('🚀 Oracle Bot Starting (Supabase)...');
  console.log(`⚙️  Consensus Threshold: ${CONSENSUS_THRESHOLD}%`);
  console.log(`⏱️  Scan Interval: ${SCAN_INTERVAL / 1000}s`);
  console.log(`💾 Database: Supabase (${SUPABASE_URL})`);
  console.log('');

  await scanOracles();
  setInterval(scanOracles, SCAN_INTERVAL);
}

init().catch(console.error);
