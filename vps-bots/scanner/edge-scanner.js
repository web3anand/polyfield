require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MIN_EV = parseFloat(process.env.MIN_EV) || 3.0;
const MIN_LIQUIDITY = parseFloat(process.env.MIN_LIQUIDITY) || 10000;
const MAX_EXPIRY_HOURS = parseInt(process.env.MAX_EXPIRY_HOURS) || 24;
const SCAN_INTERVAL = parseInt(process.env.SCAN_INTERVAL) || 60000;

async function fetchMarkets() {
  try {
    const response = await fetch('https://gamma-api.polymarket.com/markets?limit=100&active=true');
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('❌ Error fetching markets:', error.message);
    return [];
  }
}

function estimateTrueProb(market) {
  const yesVolume = parseFloat(market.volume) * parseFloat(market.outcomePrices?.[0] || 0.5);
  const noVolume = parseFloat(market.volume) * parseFloat(market.outcomePrices?.[1] || 0.5);
  
  if (yesVolume + noVolume === 0) return 0.5;
  
  const volumeWeighted = yesVolume / (yesVolume + noVolume);
  const marketPrice = parseFloat(market.outcomePrices?.[0] || 0.5);
  
  return volumeWeighted * 1.02 > 1 ? 0.99 : volumeWeighted * 1.02;
}

function calculateEV(marketPrice, trueProb) {
  const edge = trueProb - marketPrice;
  const ev = (edge / marketPrice) * 100;
  return parseFloat(ev.toFixed(2));
}

async function saveEdge(edge) {
  try {
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
        status: 'active'
      }]);
    
    if (error) {
      console.error('❌ Supabase error:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Save error:', error.message);
    return false;
  }
}

async function scanForEdges() {
  console.log(`\n🔍 Scan started at ${new Date().toISOString()}`);
  const startTime = Date.now();
  
  const markets = await fetchMarkets();
  if (!markets || markets.length === 0) {
    console.log('⚠️  No markets returned');
    return;
  }

  const now = Date.now();
  const maxExpiryTime = now + (MAX_EXPIRY_HOURS * 60 * 60 * 1000);

  const eligibleMarkets = markets.filter(m => {
    const endDate = new Date(m.endDate).getTime();
    const liquidity = parseFloat(m.liquidity) || 0;
    return endDate <= maxExpiryTime && endDate > now && liquidity >= MIN_LIQUIDITY;
  });

  console.log(`📊 Found ${eligibleMarkets.length} markets (${MAX_EXPIRY_HOURS}h expiry, $${MIN_LIQUIDITY.toLocaleString()}+ liq)`);

  let alertCount = 0;
  
  for (const market of eligibleMarkets) {
    const marketPrice = parseFloat(market.outcomePrices?.[0] || 0);
    const trueProb = estimateTrueProb(market);
    const ev = calculateEV(marketPrice, trueProb);
    
    if (ev >= MIN_EV) {
      alertCount++;
      
      const edge = {
        marketId: market.id,
        title: market.question,
        outcome: 'YES',
        ev: ev,
        marketPrice: marketPrice,
        trueProb: trueProb,
        liquidity: parseFloat(market.liquidity) || 0
      };
      
      console.log(`\n🚨 EDGE DETECTED (EV: +${ev}%)`);
      console.log(`   ${market.question}`);
      console.log(`   Price: ${marketPrice.toFixed(3)} | True: ${trueProb.toFixed(3)}`);
      console.log(`   Liquidity: $${edge.liquidity.toLocaleString()}`);
      
      await saveEdge(edge);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n⚡ Scan complete: ${elapsed}s | ${eligibleMarkets.length} checked | ${alertCount} alerts\n`);
}

async function init() {
  console.log('🚀 Micro-Edge Scanner (Supabase)');
  console.log(`📊 EV ≥ ${MIN_EV}% | Liq ≥ $${MIN_LIQUIDITY.toLocaleString()} | Expiry ≤ ${MAX_EXPIRY_HOURS}h`);
  console.log(`⏱️  Interval: ${SCAN_INTERVAL / 1000}s\n`);

  await scanForEdges();
  setInterval(scanForEdges, SCAN_INTERVAL);
}

init().catch(console.error);
