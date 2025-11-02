require('dotenv').config();
const axios = require('axios');
const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'edges.db');
const db = new sqlite3.Database(DB_PATH);

// Init DB
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS edges (
    id TEXT PRIMARY KEY,
    ev REAL,
    marketPrice REAL,
    trueProb REAL,
    title TEXT,
    liquidity REAL,
    outcome TEXT,
    timestamp INTEGER,
    status TEXT DEFAULT 'active'
  )`);
  console.log('✅ Database initialized');
});

const POLY_API = 'https://gamma-api.polymarket.com';

async function getTrueProb(title) {
  // Mock model: marketPrice ± 3-5% random variance
  // Future: Scrape Kalshi/PredictIt or ML sentiment
  try {
    // Attempt to get external probability (placeholder)
    // const res = await axios.get(`https://trading-api.pulse8.io/v1/markets?query=${encodeURIComponent(title)}`);
    // return res.data[0]?.prob || 0.5;
    
    // For now, use mock with realistic variance
    return 0.5 + (Math.random() - 0.5) * 0.1; // Mock ±5% for testing
  } catch {
    return 0.5 + (Math.random() - 0.5) * 0.1;
  }
}

async function scanMarkets() {
  console.log(`\n🔍 Scan started at ${new Date().toISOString()}`);
  const start = Date.now();
  
  try {
    const res = await axios.get(`${POLY_API}/markets`, {
      params: {
        active: true,
        limit: 100,
        tag: 'Crypto' // Filter crypto markets
      },
      headers: process.env.POLY_API_KEY ? { 
        Authorization: `Bearer ${process.env.POLY_API_KEY}` 
      } : {}
    });

    const now = Date.now();
    // More lenient filtering - broader criteria
    const markets = res.data.filter(m => {
      const expiryTime = new Date(m.endDate || m.end_date_iso).getTime();
      const minutesUntilExpiry = (expiryTime - now) / 60000;
      
      return (
        m.liquidity >= 5000 && // Lowered to $5k+ liq (was $10k)
        minutesUntilExpiry <= 60 && // Increased to 60min expiry (was 15min)
        minutesUntilExpiry > 0 && // Not expired
        (m.volume > 0 || m.liquidity > 0) // Active trading or liquidity
      );
    });

    console.log(`📊 Found ${markets.length} markets matching criteria (60min expiry, $5k+ liq)`);

    let alertCount = 0;
    for (const m of markets) {
      const yesToken = m.tokens?.find(t => t.outcome === 'Yes') || m.outcomes?.[0];
      const marketPrice = parseFloat(yesToken?.price || m.bestBid || 0.5);
      const trueProb = await getTrueProb(m.question || m.title);
      
      if (trueProb === 0) continue;

      // Better EV calculation: simple edge percentage
      const edge = trueProb - marketPrice;
      const ev = edge * 100; // Convert to percentage
      
      // Lowered threshold to 2% EV (was 3-5%)
      // This will generate more alerts for testing/demonstration
      if (ev >= 2 && ev <= 10) {
        const alert = `🐋 Whales Hub Alert: ${m.question || m.title}\nYES EV +${ev.toFixed(1)}% @${marketPrice.toFixed(2)} (true ${trueProb.toFixed(2)})\nLiq: $${m.liquidity.toLocaleString()}\nBet: https://polymarket.com/event/${m.slug || m.id}`;
        
        console.log('\n' + alert);
        
        db.run(
          `INSERT OR IGNORE INTO edges VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            m.id || m.slug,
            ev,
            marketPrice,
            trueProb,
            m.question || m.title,
            m.liquidity,
            'YES',
            Date.now(),
            'active'
          ],
          (err) => {
            if (err) {
              console.error('❌ DB insert error:', err.message);
            } else {
              console.log(`✅ Alert saved to DB: EV ${ev.toFixed(1)}%`);
              alertCount++;
            }
          }
        );
      }
    }

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\n⚡ Scan complete: ${duration}s | ${markets.length} checked | ${alertCount} alerts`);
    
  } catch (e) {
    console.error('❌ Scan error:', e.message);
    if (e.response) {
      console.error('API Response:', e.response.status, e.response.statusText);
    }
  }
}

// Run every minute
cron.schedule('* * * * *', () => {
  scanMarkets();
});

// Initial scan
console.log('🚀 Micro-Edge Scanner starting...');
scanMarkets();

// Export for API integration
module.exports = { scanMarkets, db };
