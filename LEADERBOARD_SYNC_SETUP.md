# Leaderboard Sync Setup

## Overview
The leaderboard system automatically fetches all pages from Polymarket API, stores them in Supabase, and serves them to the frontend. The sync runs automatically via Vercel Cron jobs.

## Architecture

### 1. **Vercel Serverless Function** (`api/leaderboard/sync.ts`)
   - Fetches ALL pages from Polymarket API until zero data is returned
   - Handles 100+ pages efficiently with batch processing
   - Updates Supabase using upsert (updates existing, inserts new)
   - Optimized for large datasets:
     - Fetch batch size: 10 pages at a time
     - Save batch size: 200 records at a time
     - Reduced delays for faster sync

### 2. **Automatic Updates via Vercel Cron**
   - **Schedule**: Every 15 minutes (`*/15 * * * *`)
   - **Endpoint**: `/api/leaderboard/sync?type=all&timePeriod=all`
   - **Max Duration**: 300 seconds (5 minutes) - enough for large syncs
   - Automatically syncs both users and builders leaderboards

### 3. **API Endpoints** (Read from Supabase)
   - `/api/leaderboard/users` - Fetches users from Supabase
   - `/api/leaderboard/builders` - Fetches builders from Supabase
   - Both support pagination with `limit` and `offset` parameters
   - Maximum limit: 1000 records per request

### 4. **Frontend** (`client/src/pages/leaderboard.tsx`)
   - Fetches data from Supabase via API endpoints
   - Automatically paginates through all available data
   - Caches data indefinitely (refreshed by cron job)
   - Shows pagination controls for 100+ pages

## How It Works

1. **Sync Process** (Every 15 minutes):
   ```
   Vercel Cron → /api/leaderboard/sync → Fetch all pages from Polymarket → Upsert to Supabase
   ```

2. **Frontend Data Flow**:
   ```
   Frontend → /api/leaderboard/users → Supabase → Return paginated data
   ```

3. **Data Flow**:
   - Polymarket API → Sync Function → Supabase Database → API Endpoints → Frontend

## Performance Optimizations

- **Fetch Batching**: 10 pages fetched concurrently per batch
- **Save Batching**: 200 records saved per database operation
- **Error Handling**: Continues fetching even if individual pages fail
- **Progress Tracking**: Detailed logging for monitoring large syncs
- **Time Tracking**: Reports fetch time, save time, and total time

## Environment Variables Required

Make sure these are set in Vercel (see `VERCEL_ENV_SETUP.md` for details):
- `SUPABASE_URL` - Your Supabase project URL: `https://bzlxrggciehkcslchooe.supabase.co`
- `SUPABASE_SERVICE_KEY` - Service role key (for write access - **REQUIRED** for sync)
- `SUPABASE_ANON_KEY` - Anon key (for read access)

**Important**: The sync function requires `SUPABASE_SERVICE_KEY` to be set, otherwise it will fail. Set these in Vercel project settings → Environment Variables.

## Manual Sync Trigger

You can manually trigger a sync by calling:
```bash
GET /api/leaderboard/sync?type=all&timePeriod=all
# or
POST /api/leaderboard/sync?type=users&timePeriod=all
POST /api/leaderboard/sync?type=builders&timePeriod=all
```

## Health Check

Check sync status:
```bash
GET /api/leaderboard/sync?health=true
```

Returns:
- Last update timestamps for users and builders
- Whether data is fresh (updated within last 5 minutes)
- Any errors

## Database Schema

The sync function expects these Supabase tables:
- `leaderboard_users` - Stores user leaderboard data
- `leaderboard_builders` - Stores builder leaderboard data

Both tables should have:
- Unique constraint on `(username, time_period)` for users
- Unique constraint on `(builder_name, time_period)` for builders
- `updated_at` timestamp column (auto-updated on upsert)

## Monitoring

The sync function logs:
- Total pages fetched
- Total records synced
- Errors encountered
- Time taken for fetch and save operations

Check Vercel function logs to monitor sync performance.
