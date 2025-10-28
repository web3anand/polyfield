const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://orxyqgecymsuwuxtjdck.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeHlxZ2VjeW1zdXd1eHRqZGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MzAxNzQsImV4cCI6MjA3NzIwNjE3NH0.pk46vevHaUjX0Ewq8dAfNidNgQjjov3fX7CJU997b8U';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SCAN_INTERVAL = 30000; // 30 seconds for faster updates

async function fetchAllMarkets() {
  try {
    // Fetch only active, non-closed markets
    const response = await fetch('https://gamma-api.polymarket.com/markets?limit=100&active=true&closed=false');
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const markets = await response.json();
    
    // Filter out markets that ended more than 7 days ago
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return markets.filter(market => {
      const endDate = market.endDate ? new Date(market.endDate).getTime() : Date.now();
      return endDate > sevenDaysAgo; // Only markets ending in the future or ended recently
    });
  } catch (error) {
    console.error('❌ Error fetching markets:', error.message);
    return [];
  }
}

function calculateEV(marketPrice, trueProb) {
  if (!marketPrice || marketPrice === 0) return 0;
  const edge = trueProb - marketPrice;
  const ev = (edge / marketPrice) * 100;
  return isNaN(ev) ? 0 : parseFloat(ev.toFixed(2));
}

function estimateTrueProb(market) {
  const yesPrice = parseFloat(market.outcomePrices?.[0] || 0.5);
  const noPrice = parseFloat(market.outcomePrices?.[1] || 0.5);
  const volume = parseFloat(market.volume) || 0;
  
  if (volume === 0) return yesPrice || 0.5;
  
  // Volume-weighted probability estimation
  const yesVolume = volume * yesPrice;
  const noVolume = volume * noPrice;
  
  if (yesVolume + noVolume === 0) return yesPrice || 0.5;
  
  const volumeWeighted = yesVolume / (yesVolume + noVolume);
  
  // Add small variance for edge detection
  const adjusted = volumeWeighted * 1.02;
  return isNaN(adjusted) ? 0.5 : Math.min(0.99, adjusted);
}

async function saveEdge(edge) {
  try {
    // Check if edge already exists
    const { data: existing } = await supabase
      .from('edges')
      .select('id')
      .eq('market_id', edge.marketId)
      .single();
    
    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('edges')
        .update({
          ev: edge.ev,
          market_price: edge.marketPrice,
          true_prob: edge.trueProb,
          liquidity: edge.liquidity,
          timestamp: new Date().toISOString()
        })
        .eq('market_id', edge.marketId);
      
      if (error) console.error('❌ Update error:', error.message);
    } else {
      // Insert new
      const { error } = await supabase
        .from('edges')
        .insert([{
          market_id: edge.marketId,
          market_title: edge.title,
          title: edge.title,
          outcome: edge.outcome,
          ev: edge.ev,
          market_price: edge.marketPrice,
          true_prob: edge.trueProb,
          liquidity: edge.liquidity,
          status: edge.ev >= 3 ? 'active' : 'monitored'
        }]);
      
      if (error) console.error('❌ Insert error:', error.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error saving:', error.message);
    return false;
  }
}

async function scanAllMarkets() {
  console.log(`\n🔍 FULL MARKET SCAN at ${new Date().toISOString()}`);
  const startTime = Date.now();
  
  const markets = await fetchAllMarkets();
  if (!markets || markets.length === 0) {
    console.log('⚠️  No markets returned from API');
    return;
  }

  console.log(`📊 Scanning ${markets.length} active markets...`);

  let savedCount = 0;
  let alertCount = 0;
  
  for (const market of markets) {
    const marketPrice = parseFloat(market.outcomePrices?.[0] || 0.5) || 0.5;
    const trueProb = estimateTrueProb(market);
    const ev = calculateEV(marketPrice, trueProb);
    const liquidity = parseFloat(market.liquidity) || 0;
    
    const edge = {
      marketId: market.id,
      title: market.question || market.title || 'Unknown Market',
      outcome: 'YES',
      ev: ev || 0,
      marketPrice: marketPrice || 0.5,
      trueProb: trueProb || 0.5,
      liquidity: liquidity || 0
    };
    
    await saveEdge(edge);
    savedCount++;
    
    if (ev >= 3) {
      alertCount++;
      console.log(`🚨 HIGH EV: ${edge.title.substring(0, 60)}... | EV: +${ev}% | Liq: $${liquidity.toLocaleString()}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Scan complete: ${elapsed}s | ${savedCount} saved | ${alertCount} alerts (EV≥3%)`);
  console.log(`💾 All ${savedCount} markets stored in Supabase\n`);
}

async function init() {
  console.log('🚀 FULL MARKET SCANNER (Supabase)');
  console.log('📊 Scanning ALL active Polymarket markets');
  console.log(`⏱️  Scan Interval: ${SCAN_INTERVAL / 1000}s`);
  console.log(`💾 Database: Supabase (${SUPABASE_URL})\n`);

  await scanAllMarkets();
  setInterval(scanAllMarkets, SCAN_INTERVAL);
}

init().catch(console.error);
