# 🐋 Whale Monitor - 24/7 Real-Time Alerts

Monitors Polymarket 24/7 for:
- **Large trades** (default: ≥ $10K)
- **Fresh wallet deposits** (new wallets making first deposit)
- **New wallet large trades** (new wallets making large trades immediately)

## ⚡ Features

- ✅ **24/7 continuous monitoring** (runs every 30 seconds)
- ✅ **Instant alerts** for large trades and fresh wallets
- ✅ **Persistent storage** (SQLite database)
- ✅ **Auto-restart** with PM2
- ✅ **Low resource usage** (~50MB RAM, <5% CPU)
- ✅ **Known wallet tracking** (detects first-time appearances)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ~/polyfield-bots/whale-monitor
npm install
```

### 2. Configure (Optional)

```bash
cp .env.example .env
nano .env
```

Edit if needed:
- `LARGE_TRADE_THRESHOLD=10000` - Minimum trade size to alert (USD)
- `POLL_INTERVAL=30000` - Check interval in milliseconds (30s = instant)

### 3. Start with PM2

```bash
pm2 start whale-monitor.js --name whale-monitor
pm2 save  # Save PM2 config (auto-restart on reboot)
```

### 4. Check Status

```bash
pm2 status
pm2 logs whale-monitor
```

## 📊 Database Schema

### `whale_alerts` Table
Stores all alerts:
- `type`: 'LARGE_TRADE', 'FRESH_WALLET_DEPOSIT', 'NEW_WALLET_LARGE_TRADE'
- `wallet`: Wallet address
- `market_id`: Market/condition ID
- `market_name`: Market question/title
- `outcome`: YES/NO
- `amount`: Trade/deposit amount in USD
- `timestamp`: Unix timestamp
- `tx_hash`: Transaction hash
- `notified`: Whether alert was sent (0/1)

### `known_wallets` Table
Tracks all wallets we've seen:
- `wallet`: Wallet address (primary key)
- `first_seen`: First appearance timestamp
- `total_deposits`: Sum of all deposits
- `total_trades`: Count of trades
- `largest_trade`: Largest single trade amount

## 🔍 Query Alerts

```bash
cd ~/polyfield-bots/whale-monitor

# View recent large trades
sqlite3 whales.db "SELECT * FROM whale_alerts WHERE type = 'LARGE_TRADE' ORDER BY timestamp DESC LIMIT 10;"

# View fresh wallet deposits
sqlite3 whales.db "SELECT * FROM whale_alerts WHERE type = 'FRESH_WALLET_DEPOSIT' ORDER BY timestamp DESC LIMIT 10;"

# View all recent alerts
sqlite3 whales.db "SELECT type, wallet, market_name, outcome, amount, datetime(timestamp, 'unixepoch') as time FROM whale_alerts ORDER BY timestamp DESC LIMIT 20;"

# Count alerts by type
sqlite3 whales.db "SELECT type, COUNT(*) as count FROM whale_alerts GROUP BY type;"

# Find top wallets by largest trade
sqlite3 whales.db "SELECT wallet, largest_trade, total_trades FROM known_wallets ORDER BY largest_trade DESC LIMIT 10;"
```

## 📈 API Endpoint Integration

You can expose alerts via API endpoint in your main server:

```javascript
// In server/routes.ts or api/whales/alerts.ts
app.get('/api/whales/alerts', (req, res) => {
  const limit = parseInt(req.query.limit || '50');
  const type = req.query.type; // 'LARGE_TRADE', 'FRESH_WALLET_DEPOSIT', etc.
  
  const db = new sqlite3.Database('./whale-monitor/whales.db');
  
  let query = 'SELECT * FROM whale_alerts WHERE 1=1';
  const params = [];
  
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  
  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});
```

## ⚙️ Configuration Options

### Large Trade Threshold
Set minimum trade size to trigger alerts:
```bash
# Alert on trades >= $50K
LARGE_TRADE_THRESHOLD=50000
```

### Polling Interval
Adjust how frequently to check (lower = more instant):
```bash
# Check every 15 seconds (very instant)
POLL_INTERVAL=15000

# Check every 60 seconds (less API calls)
POLL_INTERVAL=60000
```

## 📊 Performance

- **Memory:** ~50-100MB
- **CPU:** <5% (mostly idle)
- **API Calls:** ~2 calls per minute (very efficient)
- **Database Size:** Grows ~1MB per 1000 alerts (auto-cleaned)

## 🛠️ Management

### View Live Logs
```bash
pm2 logs whale-monitor
pm2 logs whale-monitor --lines 100  # Last 100 lines
```

### Restart
```bash
pm2 restart whale-monitor
```

### Stop
```bash
pm2 stop whale-monitor
```

### Delete from PM2
```bash
pm2 delete whale-monitor
```

### Update Configuration
```bash
# Edit .env file
nano .env

# Restart to apply changes
pm2 restart whale-monitor
```

## 🚨 Alert Types

### 1. LARGE_TRADE
- **Trigger:** Trade ≥ threshold amount
- **Data:** Wallet, market, outcome, amount, timestamp

### 2. FRESH_WALLET_DEPOSIT
- **Trigger:** First-time wallet deposit
- **Data:** Wallet, deposit amount, timestamp

### 3. NEW_WALLET_LARGE_TRADE
- **Trigger:** New wallet making large trade immediately
- **Data:** Wallet, market, outcome, amount, timestamp

## 🔄 Integration with Whales Hub

Update `server/routes.ts` to add whale alerts endpoint:

```javascript
app.get('/api/whales/alerts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50');
    const type = req.query.type;
    
    // Query whale-monitor database
    const db = new sqlite3.Database('/home/linuxuser/polyfield-bots/whale-monitor/whales.db');
    
    let query = 'SELECT * FROM whale_alerts WHERE 1=1';
    const params = [];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    
    db.all(query, params, (err, rows) => {
      db.close();
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🎯 Expected Alerts

- **Large trades:** 5-20 per day (depending on market activity)
- **Fresh wallets:** 10-50 per day (new users joining Polymarket)
- **New wallet large trades:** 1-5 per day (whales making first trade)

## ⚠️ Notes

1. **API Rate Limits:** The bot respects Polymarket API limits (~2 calls/minute)
2. **Database Cleanup:** Automatically keeps last 1000 alerts (configurable)
3. **Known Wallets:** Tracks all wallets to detect "fresh" ones
4. **Real-time:** 30-second polling = near-instant alerts (< 1 minute delay)

## 🔥 Deployment Steps

1. **Upload files to VPS:**
   ```bash
   # Via WinSCP or scp
   scp -r whale-monitor/ linuxuser@207.246.126.234:~/polyfield-bots/
   ```

2. **SSH into server:**
   ```bash
   ssh linuxuser@207.246.126.234
   ```

3. **Install and start:**
   ```bash
   cd ~/polyfield-bots/whale-monitor
   npm install
   pm2 start whale-monitor.js --name whale-monitor
   pm2 save
   ```

4. **Verify:**
   ```bash
   pm2 status
   pm2 logs whale-monitor
   ```

## ✅ Success Indicators

- Bot shows "online" in `pm2 status`
- Logs show "🐋 Whale Monitor Starting..."
- Alerts appear in database within 30 seconds of large trades
- Fresh wallet deposits detected and logged

---

**Status:** ✅ Ready for 24/7 deployment  
**Uptime:** Auto-restarts with PM2  
**Monitoring:** Check logs with `pm2 logs whale-monitor`

