# API Endpoints Documentation

This document provides a comprehensive overview of all API endpoints used in the PolyMarket Dashboard project.

## Table of Contents
1. [Dashboard Endpoints](#dashboard-endpoints)
2. [User Search Endpoints](#user-search-endpoints)
3. [Leaderboard Endpoints](#leaderboard-endpoints)
4. [Scanner Endpoints](#scanner-endpoints)
5. [Oracle Endpoints](#oracle-endpoints)
6. [Health Check Endpoints](#health-check-endpoints)

---

## Dashboard Endpoints

### `GET /api/dashboard/username`
**Purpose**: Fetch comprehensive dashboard data for a specific Polymarket user by username.

**Query Parameters**:
- `username` (required): Polymarket username to fetch data for

**Returns**: Complete dashboard data including:
- User profile (username, wallet address, profile image, bio, X username, rank)
- Trading statistics (total PnL, realized PnL, unrealized PnL, win rate, volume, etc.)
- PnL history timeline
- Active positions
- Recent trades with PnL attached

**Used By**:
- `client/src/pages/dashboard.tsx` - Main dashboard page

**Backend Implementation**:
- `server/routes.ts` (lines 1261-1495)
- `api/dashboard/username.ts` (Vercel serverless function)

**External APIs Used**:
- Polymarket Gamma API (`/public-search`) - Resolve username to wallet
- Polymarket Data API (`/positions`, `/trades`, `/activity`) - Fetch trading data
- Polymarket PnL Subgraph - Calculate accurate PnL
- Polymarket Data API (`/v1/leaderboard`) - Fetch volume and rank

**Performance Notes**:
- Takes ~30-90 seconds due to PnL calculation
- Uses request deduplication to avoid duplicate PnL fetches
- 35-second timeout configured

---

## User Search Endpoints

### `GET /api/users/search`
**Purpose**: Search for Polymarket usernames with autocomplete functionality.

**Query Parameters**:
- `q` (required, min 2 chars): Search query string

**Returns**: Array of username strings (max 10 results)

**Used By**:
- `client/src/components/username-input.tsx` - Username autocomplete input

**Backend Implementation**:
- `server/routes.ts` (lines 1172-1258)
- `api/users/search.ts` (Vercel serverless function)

**External APIs Used**:
- Polymarket Gamma API (`/public-search?search_profiles=true`)

**Features**:
- 30-second cache for search results
- Rate limiting (20 requests per 10 seconds)
- Graceful error handling with cached fallback

---

## Leaderboard Endpoints

### `GET /api/leaderboard/builders`
**Purpose**: Fetch builder leaderboard rankings.

**Query Parameters**:
- `timePeriod` (optional): Time period filter (ALL, DAY, WEEK, MONTH) - defaults to "ALL"
- `limit` (optional): Number of results per page (max 50) - defaults to 50
- `offset` (optional): Pagination offset - defaults to 0

**Returns**: Array of builder objects with rank, builder name, volume, active users, verified status, logo

**Used By**:
- `client/src/pages/leaderboard.tsx` - Builder leaderboard page

**Backend Implementation**:
- `server/routes.ts` (lines 1502-1529)
- `api/leaderboard/builders.ts` (Vercel serverless function)

**External APIs Used**:
- Polymarket Data API (`/v1/builders/leaderboard`)

---

### `GET /api/leaderboard/users`
**Purpose**: Fetch user leaderboard rankings.

**Query Parameters**:
- `timePeriod` (optional): Time period filter (all, day, week, month) - defaults to "all"
- `limit` (optional): Number of results per page (max 50) - defaults to 50
- `offset` (optional): Pagination offset - defaults to 0

**Returns**: Array of user objects with:
- `rank`: User rank
- `userName`: Username
- `xUsername`: X/Twitter handle
- `vol`: Trading volume
- `walletAddress`: Wallet address (if available from API)
- `profileImage`: Profile image URL
- `pnl`: PnL value (if available from API)

**Used By**:
- `client/src/pages/leaderboard.tsx` - User leaderboard page

**Backend Implementation**:
- `server/routes.ts` (lines 1532-1579)
- `api/leaderboard/users.ts` (Vercel serverless function)

**External APIs Used**:
- Polymarket Data API (`/v1/leaderboard`)

**Notes**:
- API only returns 50 users per request maximum
- Frontend implements pagination to fetch multiple pages

---

### `GET /api/leaderboard/wallet`
**Purpose**: Resolve a Polymarket username to a wallet address.

**Query Parameters**:
- `username` (required): Polymarket username

**Returns**: Object with:
- `username`: The requested username
- `walletAddress`: Resolved wallet address (or null if not found)
- `error`: Error message (if any)

**Used By**:
- `client/src/pages/leaderboard.tsx` - To fetch wallet addresses for users in leaderboard

**Backend Implementation**:
- `server/routes.ts` (lines 1582-1621)
- `api/leaderboard/wallet.ts` (Vercel serverless function)

**External APIs Used**:
- Polymarket Gamma API (`/public-search?search_profiles=true`)

**Notes**:
- Returns null wallet address on error (doesn't break leaderboard)
- Used when wallet address is not provided by main leaderboard API

---

### `GET /api/leaderboard/pnl`
**Purpose**: Fetch PnL data for a wallet address.

**Query Parameters**:
- `wallet` (required): Wallet address to fetch PnL for

**Returns**: Object with:
- `wallet`: The requested wallet address
- `totalPnL`: Total PnL (realized + unrealized)
- `realizedPnL`: Realized PnL from closed positions
- `unrealizedPnL`: Unrealized PnL from open positions

**Used By**:
- `client/src/pages/leaderboard.tsx` - To display PnL for users in leaderboard

**Backend Implementation**:
- `server/routes.ts` (lines 1624-1673)
- `api/leaderboard/pnl.ts` (Vercel serverless function)

**External APIs Used**:
- Polymarket PnL Subgraph (via `fetchUserPnLData` utility)
- Polymarket Data API (`/positions`) - For unrealized PnL

**Performance Notes**:
- Takes ~30-90 seconds per wallet (very slow)
- Returns zero PnL on error (doesn't break leaderboard)
- Frontend implements 15-second timeout per wallet

---

### `GET /api/leaderboard/user-pnl`
**Purpose**: Resolve username to wallet and fetch PnL in one call (username → wallet → PnL).

**Query Parameters**:
- `username` (required): Polymarket username

**Returns**: Object with:
- `username`: The requested username
- `walletAddress`: Resolved wallet address (or null if not found)
- `totalPnL`: Total PnL
- `realizedPnL`: Realized PnL
- `unrealizedPnL`: Unrealized PnL
- `error`: Error message (if any)

**Used By**:
- Currently not used in frontend (replaced by separate `/wallet` and `/pnl` endpoints)

**Backend Implementation**:
- `server/routes.ts` (lines 1676-1725)
- `api/leaderboard/user-pnl.ts` (Vercel serverless function)

**External APIs Used**:
- Polymarket Gamma API (`/public-search`) - Resolve username
- Polymarket PnL Subgraph - Calculate PnL

**Notes**:
- Combines wallet resolution and PnL fetching
- Returns zero PnL on error

---

### `GET /api/leaderboard/builders/volume`
**Purpose**: Fetch builder volume time-series data for chart visualization.

**Query Parameters**:
- `timePeriod` (optional): Time period filter (ALL, DAY, WEEK, MONTH) - defaults to "ALL"
  - Note: "ALL" is converted to "DAY" for historical data

**Returns**: Array of volume data points per builder with:
- `dt`: Date/timestamp
- `builder`: Builder name
- `volume`: Volume amount
- `activeUsers`: Number of active users
- `verified`: Verification status

**Used By**:
- `client/src/pages/leaderboard.tsx` - Pixel chart for builder volume visualization

**Backend Implementation**:
- `server/routes.ts` (lines 1728-1788)
- `api/leaderboard/builders/volume.ts` (Vercel serverless function)

**External APIs Used**:
- Polymarket Data API (`/v1/builders/volume`)

**Notes**:
- Returns data per builder (not aggregated) for multi-color chart visualization
- Data is sorted chronologically

---

## Scanner Endpoints

### `GET /api/scanner/alerts`
**Purpose**: Fetch active scanner alerts from the micro-edge scanner database.

**Query Parameters**:
- `limit` (optional): Maximum number of alerts to return - defaults to 20

**Returns**: Array of alert objects with:
- `id`: Market ID
- `title`: Market title
- `outcome`: Outcome (YES/NO)
- `ev`: Expected value
- `marketPrice`: Current market price
- `trueProb`: True probability
- `liquidity`: Market liquidity
- `timestamp`: Alert timestamp
- `status`: Alert status (active)

**Used By**:
- `client/src/pages/micro-edge.tsx` - Micro-edge scanner page
- `client/src/pages/whales.tsx` - Whale scanner page

**Backend Implementation**:
- `server/routes.ts` (lines 1791-1856)
- `api/scanner/alerts.ts` (Vercel serverless function)

**Data Source**:
- SQLite database (`scanner/edges.db` or `vps-bots/scanner/edges.db`)

**Notes**:
- Returns empty array if database not found
- Only returns alerts with status='active'

---

### `GET /api/scanner/metrics`
**Purpose**: Fetch scanner performance metrics.

**Query Parameters**: None

**Returns**: Object with:
- `alertsThisMonth`: Number of alerts in the last 30 days
- `avgEV`: Average expected value
- `hitRate`: Hit rate percentage (hardcoded: 71.2)
- `conversion`: Conversion rate (hardcoded: 28.3)
- `avgLatency`: Average latency (hardcoded: "0.8s")
- `activeScans`: Number of active scans

**Used By**:
- `client/src/pages/micro-edge.tsx` - Micro-edge scanner page
- `client/src/pages/whales.tsx` - Whale scanner page

**Backend Implementation**:
- `server/routes.ts` (lines 1858-1940)
- `api/scanner/metrics.ts` (Vercel serverless function)

**Data Source**:
- SQLite database (`scanner/edges.db`)

**Notes**:
- Some metrics are hardcoded (hitRate, conversion, avgLatency)
- Returns default values if database not found

---

### `POST /api/scanner/backtest`
**Purpose**: Run a backtest on scanner performance.

**Request Body**:
- `days` (optional): Number of days to backtest - defaults to 30

**Returns**: Backtest results object

**Used By**:
- `client/src/pages/micro-edge.tsx` - Micro-edge scanner page
- `client/src/pages/whales.tsx` - Whale scanner page

**Backend Implementation**:
- `server/routes.ts` (lines 1942-1952)
- `api/scanner/backtest.ts` (Vercel serverless function)

**Notes**:
- Requires `scanner/backtest` module

---

## Oracle Endpoints

### `GET /api/oracle/markets`
**Purpose**: Fetch oracle bot markets from the database.

**Query Parameters**:
- `limit` (optional): Maximum number of markets to return - defaults to 20

**Returns**: Array of oracle market objects ordered by last update time

**Used By**:
- `client/src/pages/oracle.tsx` - Oracle bot page

**Backend Implementation**:
- `server/routes.ts` (lines 1955-2018)
- `api/oracle/markets.ts` (Vercel serverless function)

**Data Source**:
- SQLite database (`oracle/oracles.db`)

**Notes**:
- Returns empty array if database not found
- Tries multiple database paths (dev, VPS, relative)

---

### `GET /api/oracle/stats`
**Purpose**: Fetch oracle bot statistics.

**Query Parameters**: None

**Returns**: Object with oracle statistics

**Used By**:
- `client/src/pages/oracle.tsx` - Oracle bot page

**Backend Implementation**:
- `server/routes.ts` (lines 2020-2121)
- `api/oracle/stats.ts` (Vercel serverless function)

**Data Source**:
- SQLite database (`oracle/oracles.db`)

**Notes**:
- Returns default stats if database not found

---

## Health Check Endpoints

### `GET /api/health`
**Purpose**: Health check endpoint to verify API is running.

**Query Parameters**: None

**Returns**: Object with:
- `status`: "ok"
- `timestamp`: Current ISO timestamp

**Used By**:
- Health monitoring
- Deployment verification

**Backend Implementation**:
- `server/routes.ts` (lines 1497-1499)
- `api/health.ts` (Vercel serverless function)

---

## External APIs Used

### Polymarket Gamma API
**Base URL**: `https://gamma-api.polymarket.com`

**Endpoints Used**:
- `/public-search` - User search and profile lookup

### Polymarket Data API
**Base URL**: `https://data-api.polymarket.com`

**Endpoints Used**:
- `/positions` - Fetch user positions
- `/trades` - Fetch user trades
- `/activity` - Fetch user activity ledger
- `/v1/leaderboard` - User leaderboard
- `/v1/builders/leaderboard` - Builder leaderboard
- `/v1/builders/volume` - Builder volume time-series

### Polymarket PnL Subgraph
**Purpose**: Calculate accurate PnL from on-chain data

**Used By**:
- `api/utils/polymarket-pnl.ts` - PnL calculation utility
- Called by dashboard and leaderboard PnL endpoints

---

## Performance Considerations

1. **Slow Endpoints** (30-90 seconds):
   - `/api/dashboard/username` - Full dashboard data with PnL
   - `/api/leaderboard/pnl` - Individual wallet PnL calculation

2. **Fast Endpoints** (< 5 seconds):
   - `/api/users/search` - Cached user search
   - `/api/leaderboard/builders` - Builder leaderboard
   - `/api/leaderboard/users` - User leaderboard
   - `/api/leaderboard/wallet` - Wallet resolution

3. **Database-Dependent Endpoints**:
   - `/api/scanner/*` - Requires SQLite database
   - `/api/oracle/*` - Requires SQLite database
   - Returns empty/default data if database not found

---

## Error Handling

All endpoints implement graceful error handling:
- Return empty arrays/objects instead of 500 errors where possible
- Use cached data as fallback when external APIs fail
- Return zero/default values for PnL endpoints on error
- Log errors to console for debugging

---

## Caching

- User search: 30-second cache
- Rate limiting: 20 requests per 10 seconds for Gamma API search
- PnL requests: Deduplication for concurrent requests to same wallet

---

## Notes

- All endpoints support CORS (Access-Control-Allow-Origin: *)
- Most endpoints have both Express server (`server/routes.ts`) and Vercel serverless function (`api/*/`) implementations
- Frontend uses relative paths (`/api/*`) which are proxied to backend during development
- Production uses Vercel serverless functions for API endpoints

