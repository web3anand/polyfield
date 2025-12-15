# Leaderboard Sync Testing Guide

## Quick Test Commands

### 1. Test Database Connection (Local)
```bash
npm run test:leaderboard
```
This tests:
- Supabase connection (service role and anon keys)
- Database table accessibility
- Data read operations
- API endpoints (if server is running)

### 2. Test Vercel Function (Deployed)
```bash
# Test your deployed Vercel app
npm run test:vercel https://your-app.vercel.app

# Or test locally if server is running
npm run test:vercel http://localhost:3000
```

## Manual Testing Steps

### Step 1: Test Database Connection

1. **Check Supabase Tables Exist**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT COUNT(*) FROM leaderboard_users WHERE time_period = 'all';
   SELECT COUNT(*) FROM leaderboard_builders WHERE time_period = 'all';
   ```

2. **Check Last Update Time**
   ```sql
   SELECT MAX(updated_at) FROM leaderboard_users WHERE time_period = 'all';
   SELECT MAX(updated_at) FROM leaderboard_builders WHERE time_period = 'all';
   ```

### Step 2: Test Health Check Endpoint

```bash
# If deployed on Vercel
curl https://your-app.vercel.app/api/leaderboard/sync?health=true

# If running locally
curl http://localhost:3000/api/leaderboard/sync?health=true
```

**Expected Response:**
```json
{
  "success": true,
  "health": {
    "users": {
      "lastUpdate": 1234567890,
      "isFresh": true,
      "error": null
    },
    "builders": {
      "lastUpdate": 1234567890,
      "isFresh": true,
      "error": null
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Step 3: Test API Endpoints

**Test Users Endpoint:**
```bash
curl https://your-app.vercel.app/api/leaderboard/users?timePeriod=all&limit=5&offset=0
```

**Test Builders Endpoint:**
```bash
curl https://your-app.vercel.app/api/leaderboard/builders?timePeriod=all&limit=5&offset=0
```

### Step 4: Test Sync Function

**Manual Sync Trigger:**
```bash
# Sync all (users + builders)
curl https://your-app.vercel.app/api/leaderboard/sync?type=all&timePeriod=all

# Sync only users
curl https://your-app.vercel.app/api/leaderboard/sync?type=users&timePeriod=all

# Sync only builders
curl https://your-app.vercel.app/api/leaderboard/sync?type=builders&timePeriod=all
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Leaderboard sync completed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "timePeriod": "all",
  "users": {
    "synced": 1500,
    "errors": 0,
    "totalFetched": 1500,
    "fetchTime": 45000,
    "saveTime": 12000,
    "totalTime": 57000
  },
  "builders": {
    "synced": 50,
    "errors": 0,
    "totalFetched": 50,
    "fetchTime": 5000,
    "saveTime": 2000,
    "totalTime": 7000
  }
}
```

## Troubleshooting

### Issue: "Missing SUPABASE_SERVICE_KEY"

**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `SUPABASE_SERVICE_KEY` with your service role key
3. Redeploy the project

### Issue: "Cannot connect to database"

**Check:**
1. Verify `SUPABASE_URL` is correct
2. Check if RLS policies allow service role access
3. Verify the tables exist: `leaderboard_users` and `leaderboard_builders`

### Issue: "No data in database"

**Solution:**
1. Manually trigger a sync:
   ```bash
   curl https://your-app.vercel.app/api/leaderboard/sync?type=all&timePeriod=all
   ```
2. Wait for sync to complete (check Vercel function logs)
3. Verify data appears in Supabase

### Issue: "Health check shows stale data"

**Solution:**
1. Check if cron job is running (every 15 minutes)
2. Manually trigger a sync
3. Check Vercel function logs for errors

### Issue: "API endpoints return empty arrays"

**Possible Causes:**
1. Database is empty (run sync first)
2. Wrong `time_period` filter
3. RLS policies blocking read access

**Solution:**
1. Check data exists:
   ```sql
   SELECT COUNT(*) FROM leaderboard_users WHERE time_period = 'all';
   ```
2. Verify RLS policies allow public read:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'leaderboard_users';
   ```

## Verification Checklist

- [ ] Supabase connection works (service role key)
- [ ] Supabase connection works (anon key)
- [ ] Tables exist: `leaderboard_users` and `leaderboard_builders`
- [ ] Health check endpoint returns valid response
- [ ] Users API endpoint returns data
- [ ] Builders API endpoint returns data
- [ ] Sync function can be triggered manually
- [ ] Sync function completes successfully
- [ ] Data appears in Supabase after sync
- [ ] Cron job is configured (check `vercel.json`)
- [ ] Environment variables are set in Vercel

## Expected Results

### After First Sync:
- **Users**: 1000-5000+ records (depending on Polymarket data)
- **Builders**: 50-200+ records
- **Last Update**: Within last few minutes

### After Cron Runs:
- Data should refresh every 15 minutes
- Health check should show `isFresh: true` within 5 minutes of sync

## Monitoring

### Check Vercel Function Logs:
1. Go to Vercel Dashboard → Your Project → Functions
2. Click on `/api/leaderboard/sync`
3. View execution logs and errors

### Check Supabase:
1. Go to Supabase Dashboard → Table Editor
2. View `leaderboard_users` and `leaderboard_builders` tables
3. Check `updated_at` column for recent updates
