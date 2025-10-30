require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

console.log(`🔑 Using key: ${SUPABASE_KEY.substring(0, 30)}...`);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SCAN_INTERVAL = 60000; // 1 minute
const MIN_LIQUIDITY = 10000; // $10k
const CONSENSUS_THRESHOLD = 0.60; // 60%

async function fetchAllMarkets() {
  try {
    let allMarkets = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    
    console.log('📥 Fetching all markets...');
    
    while (hasMore) {
      const response = await fetch(`https://gamma-api.polymarket.com/markets?limit=${limit}&offset=${offset}&active=true&closed=false`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const markets = await response.json();
      
      if (markets.length === 0) {
        hasMore = false;
      } else {
        allMarkets = allMarkets.concat(markets);
        offset += limit;
        if (offset % 1000 === 0) console.log(`   ${allMarkets.length}...`);
        if (markets.length < limit) hasMore = false;
      }
    }
    
    console.log(`✅ Fetched ${allMarkets.length} markets`);
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMarkets = allMarkets.filter(m => new Date(m.createdAt) >= sevenDaysAgo);
    
    console.log(`📊 ${recentMarkets.length} markets after 7-day filter`);
    return recentMarkets;
  } catch (error) {
    console.error('❌ Error fetching markets:', error.message);
    return [];
  }
}

function analyzeMarket(market) {
  try {
    const liquidity = parseFloat(market.liquidity || 0);
    if (liquidity < MIN_LIQUIDITY) return null;
    
    const prices = JSON.parse(market.outcomePrices);
    const yesPrice = parseFloat(prices[0]);
    const noPrice = parseFloat(prices[1]);
    
    if (yesPrice >= 0.995 || noPrice >= 0.995) return null;
    
    const maxPrice = Math.max(yesPrice, noPrice);
    if (maxPrice < CONSENSUS_THRESHOLD) return null;
    
    // Use market slug directly - Polymarket handles the URL routing
    const slug = market.slug || market.id;
    
    return {
      status: yesPrice > noPrice ? 'yes_likely' : 'no_likely',
      consensus: maxPrice,
      outcome: yesPrice > noPrice ? 'Yes' : 'No',
      disputes: 0,
      liquidity: liquidity,
      slug: slug
    };
  } catch (error) {
    return null;
  }
}

async function saveOracle(marketId, title, analysis) {
  try {
    const { error } = await supabase
      .from('oracles')
      .upsert({
        market_id: marketId,
        title: title,
        status: analysis.status,
        consensus: analysis.consensus,
        outcome: analysis.outcome,
        disputes: analysis.disputes,
        liquidity: analysis.liquidity,
        slug: analysis.slug
      }, { onConflict: 'market_id' });
    
    if (error) {
      console.error(`❌ Error saving:`, error.message);
      return false;
    }
    
    console.log(`✅ ${title.substring(0, 50)} - ${(analysis.consensus * 100).toFixed(1)}% ${analysis.outcome}`);
    return true;
  } catch (error) {
    console.error(`❌ Save error:`, error.message);
    return false;
  }
}

async function scanAllMarkets() {
  console.log(`\n� ORACLE SCAN at ${new Date().toISOString()}`);
  
  const markets = await fetchAllMarkets();
  if (!markets || markets.length === 0) {
    console.log('⚠️  No markets returned');
    return;
  }

  console.log(`📊 Analyzing ${markets.length} markets...`);

  let count = 0;
  
  for (const market of markets) {
    const analysis = analyzeMarket(market);
    if (analysis) {
      const title = market.question || market.title || `Market ${market.id}`;
      const saved = await saveOracle(market.id, title, analysis);
      if (saved) count++;
    }
  }

  console.log(`\n✅ Scan complete: ${count} consensus markets saved\n`);
}

async function init() {
  console.log('🚀 ORACLE SCANNER');
  console.log(`� Min Liquidity: $${MIN_LIQUIDITY.toLocaleString()}`);
  console.log(`📊 Consensus: ${(CONSENSUS_THRESHOLD * 100)}%`);
  console.log(`⏱️  Interval: ${SCAN_INTERVAL / 1000}s\n`);

  await scanAllMarkets();
  setInterval(scanAllMarkets, SCAN_INTERVAL);
}

init().catch(console.error);
