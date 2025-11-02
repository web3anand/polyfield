# Whale Monitoring & Alert System - Feasibility Analysis

## ✅ Yes, It's 100% Possible!

You can monitor Polymarket contracts for:
1. **Large flows onto one bet** (trades > $10K threshold)
2. **New fresh wallet deposits** (first-time deposits from new wallets)
3. **Real-time alerts** for both events

## Available Data Sources

### 1. Polymarket Data API
**Endpoints Available:**
- `/activity` - Complete ledger of all events (DEPOSIT, TRADE, WITHDRAW, etc.)
- `/trades` - All trades with size, price, outcome, market
- `/positions` - Active positions

**What We Can Monitor:**
- ✅ Large trades: Filter `TRADE` events where `usdcSize >= $10,000`
- ✅ New deposits: Track `DEPOSIT` events from wallets we haven't seen before
- ✅ Market-specific flows: Group by `marketId` or `conditionId`

**Limitation:** API-based polling (not real-time, but near real-time with 30-60s polling)

### 2. On-Chain Monitoring (Polygon/PolygonScan)
**What We Can Monitor:**
- ✅ USDC transfers to Polymarket contracts (`0x2791bca1f2de4661ed88a30c99a7a9449aa84174`)
- ✅ Contract interactions with Polymarket's conditional token contract
- ✅ First-time wallet appearances (fresh deposits)

**Method:** Etherscan API V2 with `chainid=137` (Polygon)
- `tokentx` - USDC token transfers
- `txlist` - Normal transactions
- `txlistinternal` - Internal contract calls

**Advantage:** True real-time monitoring possible with WebSocket or polling

### 3. Polymarket Subgraphs (GraphQL)
**Available Subgraphs:**
- PNL Subgraph: `https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/pnl-subgraph/0.0.14/gn`
- Activity Subgraph
- Positions Subgraph

**What We Can Monitor:**
- ✅ Historical trade data
- ✅ Position changes
- ✅ User activity patterns

## Implementation Approach

### Recommended: Hybrid System

**Component 1: API Polling Service** (Backend Service)
```javascript
// Poll every 30-60 seconds
async function monitorLargeTrades() {
  // Option 1: Fetch all recent activity
  const response = await axios.get(`${POLYMARKET_DATA_API}/activity`, {
    params: {
      limit: 1000,
      offset: 0,
      // Could filter by timestamp if API supports it
    }
  });
  
  const largeTrades = response.data.filter(event => {
    return event.type === 'TRADE' && 
           Math.abs(parseFloat(event.usdcSize || 0)) >= 10000;
  });
  
  // Alert for each large trade
  for (const trade of largeTrades) {
    await sendAlert({
      type: 'LARGE_TRADE',
      wallet: trade.user,
      market: trade.marketName,
      amount: trade.usdcSize,
      outcome: trade.outcome,
      timestamp: trade.timestamp
    });
  }
}
```

**Component 2: Fresh Wallet Detector**
```javascript
const knownWallets = new Set();

async function detectFreshWallets() {
  const response = await axios.get(`${POLYMARKET_DATA_API}/activity`, {
    params: {
      limit: 1000,
      offset: 0
    }
  });
  
  const deposits = response.data.filter(e => e.type === 'DEPOSIT');
  
  for (const deposit of deposits) {
    const wallet = deposit.user;
    
    if (!knownWallets.has(wallet)) {
      // First time seeing this wallet
      knownWallets.add(wallet);
      
      await sendAlert({
        type: 'FRESH_WALLET_DEPOSIT',
        wallet: wallet,
        amount: deposit.usdcSize,
        timestamp: deposit.timestamp
      });
    }
  }
}
```

**Component 3: Market-Specific Flow Monitor**
```javascript
async function monitorMarketFlow(marketId: string) {
  // Get all recent trades for a specific market
  const response = await axios.get(`${POLYMARKET_DATA_API}/trades`, {
    params: {
      // Note: API may not support market filtering directly
      // Would need to fetch all trades and filter
    }
  });
  
  // Group by market and calculate total flow
  const marketTrades = response.data.filter(t => t.marketId === marketId);
  const totalFlow = marketTrades.reduce((sum, t) => {
    return sum + (parseFloat(t.size || 0) * parseFloat(t.price || 0));
  }, 0);
  
  if (totalFlow > 50000) { // $50K threshold
    await sendAlert({
      type: 'HIGH_MARKET_FLOW',
      marketId: marketId,
      marketName: marketTrades[0].marketName,
      totalFlow: totalFlow,
      tradeCount: marketTrades.length
    });
  }
}
```

## On-Chain Alternative (More Real-Time)

### Using Etherscan/PolygonScan API

```javascript
const POLYGONSCAN_API = 'https://api.polygonscan.com/api';
const POLYMARKET_COLLATERAL_CONTRACT = '0x...'; // Polymarket's main contract

async function monitorOnChainDeposits() {
  const response = await axios.get(POLYGONSCAN_API, {
    params: {
      module: 'account',
      action: 'tokentx',
      contractaddress: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
      address: POLYMARKET_COLLATERAL_CONTRACT, // Polymarket contract
      startblock: 'latest',
      endblock: 'latest',
      page: 1,
      offset: 100,
      sort: 'desc',
      apikey: process.env.POLYGONSCAN_API_KEY
    }
  });
  
  // Filter for large USDC deposits
  const largeDeposits = response.data.result.filter(tx => {
    const value = parseFloat(tx.value) / 1e6; // USDC has 6 decimals
    return value >= 10000; // $10K threshold
  });
  
  // Check if wallet is new (first deposit)
  for (const tx of largeDeposits) {
    const wallet = tx.from.toLowerCase();
    const isNewWallet = await checkIfNewWallet(wallet);
    
    if (isNewWallet) {
      await sendAlert({
        type: 'FRESH_WALLET_LARGE_DEPOSIT',
        wallet: wallet,
        amount: parseFloat(tx.value) / 1e6,
        txHash: tx.hash
      });
    }
  }
}
```

## Implementation Plan

### Phase 1: Basic Monitoring (API-Based)
1. Create a backend service that polls `/activity` endpoint every 30-60 seconds
2. Filter for:
   - Trades >= $10K
   - New deposit events from previously unseen wallets
3. Store alerts in database (SQLite or similar)
4. Create API endpoint `/api/whales/alerts` to fetch alerts
5. Update Whales Hub page to display alerts

### Phase 2: Real-Time On-Chain Monitoring
1. Integrate PolygonScan API for on-chain monitoring
2. Monitor USDC transfers to Polymarket contracts
3. Track wallet first-appearance
4. Add WebSocket support for instant alerts

### Phase 3: Advanced Features
1. Wallet clustering (group related wallets)
2. Smart money tracking (track high-performing wallets)
3. Market impact analysis (correlate large trades with price movements)
4. Historical analysis and pattern detection

## Database Schema

```sql
CREATE TABLE whale_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- 'LARGE_TRADE', 'FRESH_WALLET', 'HIGH_MARKET_FLOW'
  wallet TEXT,
  market_id TEXT,
  market_name TEXT,
  amount REAL,
  outcome TEXT,
  timestamp INTEGER,
  tx_hash TEXT,
  notified BOOLEAN DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE known_wallets (
  wallet TEXT PRIMARY KEY,
  first_seen INTEGER,
  total_deposits REAL DEFAULT 0,
  total_trades INTEGER DEFAULT 0
);

CREATE INDEX idx_whale_alerts_timestamp ON whale_alerts(timestamp DESC);
CREATE INDEX idx_whale_alerts_type ON whale_alerts(type);
```

## API Endpoints Needed

```
GET /api/whales/alerts?limit=50&type=large_trade
GET /api/whales/alerts?limit=50&type=fresh_wallet
GET /api/whales/stats
GET /api/whales/markets/:marketId/flow
```

## Conclusion

**✅ Fully Feasible** - All necessary data sources are available:
- Polymarket Data API provides trade and deposit data
- PolygonScan API provides on-chain monitoring
- Existing infrastructure (alert system) can be extended
- No technical blockers

**Recommended Next Steps:**
1. Start with API-based polling (simpler, faster to implement)
2. Add on-chain monitoring for more real-time detection
3. Build alert UI in Whales Hub page
4. Add filtering, sorting, and notification preferences

