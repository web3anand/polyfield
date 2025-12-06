# Leaderboard Automation Setup

## Overview

The leaderboard system is fully automated with:
- **Automatic syncing** every 15 minutes via Vercel Cron
- **Supabase caching** for fast data retrieval
- **Health monitoring** and automatic retry logic
- **All fields included**: profile images, builder logos, verified status, etc.

## Automation Features

### 1. Automatic Sync (Vercel Cron)
- **Schedule**: Every 15 minutes (`*/15 * * * *`)
- **Endpoint**: `/api/leaderboard/sync`
- **Syncs**: Up to 1,500 users and builders (30 pages × 50 per page)
- **Includes**: All fields (profile images, builder logos, verified status, etc.)

### 2. Health Monitoring
- **Health Check Endpoint**: `/api/leaderboard/sync?health=true`
- **Checks**: Data freshness (last update < 5 minutes)
- **Returns**: Status for both users and builders tables

### 3. Error Handling
- **Automatic Retries**: Up to 2 retries on failure
- **Graceful Degradation**: Falls back to Polymarket API if Supabase fails
- **Batch Processing**: Inserts data in batches of 100 for reliability

## Manual Commands

### Trigger Sync Manually

```bash
# Sync all (users + builders)
npm run sync:leaderboard

# Sync only users
npm run sync:users

# Sync only builders
npm run sync:builders

# Check sync health
npm run sync:health
```

### Via API

```bash
# Trigger sync
curl https://your-domain.com/api/leaderboard/sync

# Check health
curl https://your-domain.com/api/leaderboard/sync?health=true

# Sync specific type
curl "https://your-domain.com/api/leaderboard/sync?type=users&maxPages=30"
```

## Database Schema

### `leaderboard_users` Table
- `id` (SERIAL PRIMARY KEY)
- `rank` (INTEGER)
- `username` (TEXT)
- `x_username` (TEXT)
- `volume` (NUMERIC)
- `wallet_address` (TEXT)
- `profile_image` (TEXT) ✅
- `pnl` (NUMERIC)
- `time_period` (TEXT)
- `updated_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)

### `leaderboard_builders` Table
- `id` (SERIAL PRIMARY KEY)
- `rank` (INTEGER)
- `builder_name` (TEXT)
- `volume` (NUMERIC)
- `markets_created` (INTEGER)
- `active_users` (INTEGER) ✅
- `verified` (BOOLEAN) ✅
- `builder_logo` (TEXT) ✅
- `time_period` (TEXT)
- `updated_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)

## API Endpoints

### `/api/leaderboard/users`
- Fetches from Supabase cache first (fast)
- Falls back to Polymarket API if cache is stale/missing
- Automatically updates Supabase cache in background

### `/api/leaderboard/builders`
- Fetches from Supabase cache first (fast)
- Falls back to Polymarket API if cache is stale/missing
- Automatically updates Supabase cache in background

### `/api/leaderboard/sync`
- Syncs data from Polymarket API to Supabase
- Supports query parameters:
  - `type`: `users`, `builders`, or `all` (default)
  - `timePeriod`: `all`, `day`, `week`, `month` (default: `all`)
  - `maxPages`: Number of pages to fetch (default: 30)
  - `health`: `true` to check sync health status

## Monitoring

### Check Sync Status
```bash
npm run sync:health
```

### View Recent Syncs
Check Vercel function logs or Supabase table `updated_at` timestamps.

### Verify Data
```sql
-- Check users count
SELECT COUNT(*) FROM leaderboard_users WHERE time_period = 'all';

-- Check builders count
SELECT COUNT(*) FROM leaderboard_builders WHERE time_period = 'all';

-- Check last update time
SELECT MAX(updated_at) FROM leaderboard_users WHERE time_period = 'all';
SELECT MAX(updated_at) FROM leaderboard_builders WHERE time_period = 'all';
```

## Troubleshooting

### Sync Not Running
1. Check Vercel cron job configuration in `vercel.json`
2. Verify environment variables are set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
3. Check Vercel function logs for errors

### Data Not Updating
1. Check health status: `npm run sync:health`
2. Manually trigger sync: `npm run sync:leaderboard`
3. Verify Supabase RLS policies allow service role access

### Slow Performance
1. Verify indexes are created (check migration file)
2. Check Supabase query performance
3. Consider reducing `maxPages` if needed

## Environment Variables

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Service role key (for writes)
- `SUPABASE_ANON_KEY`: Anon key (for reads, used by API endpoints)

## Deployment

The automation is automatically enabled when deployed to Vercel:
1. Tables are created via Supabase MCP migration
2. Cron job is configured in `vercel.json`
3. Sync runs automatically every 15 minutes
4. API endpoints use Supabase cache by default

No additional setup required! 🚀

