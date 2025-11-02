require('dotenv').config();
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'whales.db');
const db = new sqlite3.Database(DB_PATH);

const POLYMARKET_DATA_API = 'https://data-api.polymarket.com';
const POLYMARKET_GAMMA_API = 'https://gamma-api.polymarket.com';

// Configuration
const LARGE_TRADE_THRESHOLD = parseFloat(process.env.LARGE_TRADE_THRESHOLD || '10000'); // $10K default
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '30000'); // 30 seconds default
const MAX_RECENT_ALERTS = 1000; // Keep last 1000 alerts in DB

// Track known wallets to detect fresh deposits
const knownWallets = new Set();
let lastProcessedTimestamp = Math.floor(Date.now() / 1000); // Track last processed timestamp

// Init Database
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS whale_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    wallet TEXT,
    market_id TEXT,
    market_name TEXT,
    outcome TEXT,
    amount REAL,
    timestamp INTEGER,
    tx_hash TEXT,
    notified INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS known_wallets (
    wallet TEXT PRIMARY KEY,
    first_seen INTEGER,
    total_deposits REAL DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    largest_trade REAL DEFAULT 0
  )`);

  // Indexes for performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON whale_alerts(timestamp DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_type ON whale_alerts(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_notified ON whale_alerts(notified)`);

  // Load known wallets from database
  db.all(`SELECT wallet FROM known_wallets`, [], (err, rows) => {
    if (!err && rows) {
      rows.forEach(row => knownWallets.add(row.wallet.toLowerCase()));
      console.log(`✅ Loaded ${knownWallets.size} known wallets from database`);
    }
  });

  console.log('✅ Whale monitoring database initialized');
});

// Get market name by ID (cache to reduce API calls)
const marketCache = new Map();
const MARKET_CACHE_TTL = 300000; // 5 minutes

async function getMarketName(marketId) {
  if (marketCache.has(marketId)) {
    const cached = marketCache.get(marketId);
    if (Date.now() - cached.timestamp < MARKET_CACHE_TTL) {
      return cached.name;
    }
  }

  try {
    // Try to get market info from Gamma API
    const response = await axios.get(`${POLYMARKET_GAMMA_API}/markets/${marketId}`, {
      timeout: 3000
    });
    
    const name = response.data?.question || response.data?.title || `Market ${marketId}`;
    marketCache.set(marketId, { name, timestamp: Date.now() });
    return name;
  } catch (error) {
    return `Market ${marketId}`;
  }
}

// Save alert to database
function saveAlert(alert) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO whale_alerts (type, wallet, market_id, market_name, outcome, amount, timestamp, tx_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        alert.type,
        alert.wallet,
        alert.market_id || null,
        alert.market_name || null,
        alert.outcome || null,
        alert.amount,
        alert.timestamp,
        alert.tx_hash || null
      ],
      function(err) {
        if (err) {
          console.error(`❌ Error saving alert:`, err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

// Update known wallet
function updateKnownWallet(wallet, amount, isTrade = false) {
  return new Promise((resolve, reject) => {
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `INSERT OR REPLACE INTO known_wallets (wallet, first_seen, total_deposits, total_trades, largest_trade)
       VALUES (
         ?,
         COALESCE((SELECT first_seen FROM known_wallets WHERE wallet = ?), ?),
         COALESCE((SELECT total_deposits FROM known_wallets WHERE wallet = ?), 0) + ?,
         COALESCE((SELECT total_trades FROM known_wallets WHERE wallet = ?), 0) + ?,
         MAX(?, COALESCE((SELECT largest_trade FROM known_wallets WHERE wallet = ?), 0))
       )`,
      [wallet, wallet, now, wallet, isTrade ? 0 : amount, wallet, isTrade ? 1 : 0, amount, wallet, amount],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

// Check if wallet is new (first time seeing it)
function isNewWallet(wallet) {
  return !knownWallets.has(wallet.toLowerCase());
}

// Monitor large trades
async function monitorLargeTrades() {
  try {
    console.log(`\n🐋 Monitoring large trades (threshold: $${LARGE_TRADE_THRESHOLD.toLocaleString()})...`);
    
    // Fetch recent activity - focusing on TRADE events
    // Note: API doesn't support filtering by type directly, so we fetch and filter
    const response = await axios.get(`${POLYMARKET_DATA_API}/activity`, {
      params: {
        limit: 500, // Get recent 500 events
        offset: 0
      },
      timeout: 10000
    });

    if (!response.data || !Array.isArray(response.data)) {
      console.log('⚠️  No activity data returned');
      return;
    }

    // Filter for TRADE events that are large enough
    const trades = response.data.filter(event => {
      const isTrade = event.type?.toUpperCase() === 'TRADE';
      const usdcSize = Math.abs(parseFloat(event.usdcSize || 0));
      const isLarge = usdcSize >= LARGE_TRADE_THRESHOLD;
      const isRecent = event.timestamp ? 
        Math.floor(new Date(event.timestamp).getTime() / 1000) > lastProcessedTimestamp : 
        true;
      
      return isTrade && isLarge && isRecent;
    });

    console.log(`📊 Found ${trades.length} large trade(s) in recent activity`);

    for (const trade of trades) {
      const wallet = (trade.user || trade.wallet || '').toLowerCase();
      const amount = Math.abs(parseFloat(trade.usdcSize || 0));
      const marketId = trade.marketId || trade.market?.id || trade.conditionId;
      const outcome = trade.outcome || 'YES';
      const timestamp = trade.timestamp ? 
        Math.floor(new Date(trade.timestamp).getTime() / 1000) : 
        Math.floor(Date.now() / 1000);

      // Check if this is a new wallet making a large trade
      const isNew = isNewWallet(wallet);
      
      if (isNew) {
        knownWallets.add(wallet);
        await updateKnownWallet(wallet, amount, true);
        console.log(`🆕 NEW WALLET LARGE TRADE: ${wallet.slice(0, 8)}... ${outcome} $${amount.toLocaleString()} on ${marketId}`);
      } else {
        await updateKnownWallet(wallet, amount, true);
        console.log(`💰 LARGE TRADE: ${wallet.slice(0, 8)}... ${outcome} $${amount.toLocaleString()} on ${marketId}`);
      }

      // Get market name
      const marketName = marketId ? await getMarketName(marketId) : 'Unknown Market';

      // Save alert
      await saveAlert({
        type: isNew ? 'NEW_WALLET_LARGE_TRADE' : 'LARGE_TRADE',
        wallet: wallet,
        market_id: marketId,
        market_name: marketName,
        outcome: outcome,
        amount: amount,
        timestamp: timestamp,
        tx_hash: trade.txHash || trade.transactionHash || null
      });

      // Update last processed timestamp
      if (timestamp > lastProcessedTimestamp) {
        lastProcessedTimestamp = timestamp;
      }
    }

  } catch (error) {
    console.error(`❌ Error monitoring large trades:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
    }
  }
}

// Monitor fresh wallet deposits
async function monitorFreshDeposits() {
  try {
    console.log(`\n💳 Monitoring fresh wallet deposits...`);
    
    const response = await axios.get(`${POLYMARKET_DATA_API}/activity`, {
      params: {
        limit: 500,
        offset: 0
      },
      timeout: 10000
    });

    if (!response.data || !Array.isArray(response.data)) {
      return;
    }

    // Filter for DEPOSIT events
    const deposits = response.data.filter(event => {
      const isDeposit = event.type?.toUpperCase() === 'DEPOSIT';
      const isRecent = event.timestamp ? 
        Math.floor(new Date(event.timestamp).getTime() / 1000) > lastProcessedTimestamp : 
        true;
      return isDeposit && isRecent;
    });

    console.log(`📊 Found ${deposits.length} recent deposit(s)`);

    for (const deposit of deposits) {
      const wallet = (deposit.user || deposit.wallet || '').toLowerCase();
      const amount = Math.abs(parseFloat(deposit.usdcSize || 0));
      const timestamp = deposit.timestamp ? 
        Math.floor(new Date(deposit.timestamp).getTime() / 1000) : 
        Math.floor(Date.now() / 1000);

      const isNew = isNewWallet(wallet);

      if (isNew) {
        knownWallets.add(wallet);
        await updateKnownWallet(wallet, amount, false);
        
        console.log(`🆕 FRESH WALLET DEPOSIT: ${wallet.slice(0, 8)}... deposited $${amount.toLocaleString()}`);

        await saveAlert({
          type: 'FRESH_WALLET_DEPOSIT',
          wallet: wallet,
          market_id: null,
          market_name: null,
          outcome: null,
          amount: amount,
          timestamp: timestamp,
          tx_hash: deposit.txHash || deposit.transactionHash || null
        });

        // Update last processed timestamp
        if (timestamp > lastProcessedTimestamp) {
          lastProcessedTimestamp = timestamp;
        }
      } else {
        // Update existing wallet deposit tracking
        await updateKnownWallet(wallet, amount, false);
      }
    }

  } catch (error) {
    console.error(`❌ Error monitoring deposits:`, error.message);
  }
}

// Monitor market-specific flows (aggregate trades per market)
async function monitorMarketFlows() {
  try {
    // This would require tracking flows per market over time
    // For now, we focus on individual large trades
    // Can be enhanced later to track cumulative flows
  } catch (error) {
    console.error(`❌ Error monitoring market flows:`, error.message);
  }
}

// Clean old alerts (keep database size manageable)
function cleanOldAlerts() {
  db.run(
    `DELETE FROM whale_alerts WHERE id NOT IN (
      SELECT id FROM whale_alerts ORDER BY timestamp DESC LIMIT ?
    )`,
    [MAX_RECENT_ALERTS],
    (err) => {
      if (err) {
        console.error('❌ Error cleaning old alerts:', err);
      } else {
        console.log(`🧹 Cleaned old alerts (kept last ${MAX_RECENT_ALERTS})`);
      }
    }
  );
}

// Main monitoring loop
async function runMonitoring() {
  const start = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🐋 Whale Monitor - ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}`);

  try {
    // Run all monitoring functions in parallel for speed
    await Promise.all([
      monitorLargeTrades(),
      monitorFreshDeposits(),
      monitorMarketFlows()
    ]);

    // Clean old alerts periodically (every 10 runs = ~5 minutes)
    if (Math.random() < 0.1) {
      cleanOldAlerts();
    }

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\n⚡ Monitor cycle complete: ${duration}s`);
    console.log(`📊 Known wallets: ${knownWallets.size}`);
    console.log(`🕐 Next check in ${POLL_INTERVAL / 1000}s\n`);

  } catch (error) {
    console.error(`❌ Fatal error in monitoring cycle:`, error);
  }
}

// Start monitoring
console.log('🚀 Whale Monitor Starting...');
console.log(`⚙️  Configuration:`);
console.log(`   - Large Trade Threshold: $${LARGE_TRADE_THRESHOLD.toLocaleString()}`);
console.log(`   - Poll Interval: ${POLL_INTERVAL / 1000}s`);
console.log(`   - Database: ${DB_PATH}`);

// Initial run
runMonitoring();

// Set up interval for continuous monitoring
setInterval(runMonitoring, POLL_INTERVAL);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down whale monitor...');
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err);
    } else {
      console.log('✅ Database closed');
    }
    process.exit(0);
  });
});

