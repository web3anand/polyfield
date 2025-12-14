# Vercel Environment Variables Setup

## Required Environment Variables

Set these in your Vercel project settings:

### 1. Supabase URL
```
SUPABASE_URL=https://bzlxrggciehkcslchooe.supabase.co
```

### 2. Supabase Service Role Key (for sync function - write access)
```
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxMzc3NywiZXhwIjoyMDgwNTg5Nzc3fQ.FvLwD5yQwC5La8OWtNZatpnxXRft8vRTQXmQ9z66mNk
```

### 3. Supabase Anon Key (for API endpoints - read access)
```
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTM3NzcsImV4cCI6MjA4MDU4OTc3N30.vIcU83OafM_MGPRy-RjheuSQqkQNRw-RcaI2aDXH4gM
```

## How to Set in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: `SUPABASE_URL`
   - **Value**: `https://bzlxrggciehkcslchooe.supabase.co`
   - **Environment**: Select all (Production, Preview, Development)

4. Repeat for `SUPABASE_SERVICE_KEY` and `SUPABASE_ANON_KEY`

## Important Notes

- **SUPABASE_SERVICE_KEY**: Used by `/api/leaderboard/sync` for write operations (upserting data)
- **SUPABASE_ANON_KEY**: Used by `/api/leaderboard/users` and `/api/leaderboard/builders` for read operations
- The sync function will **fail** if `SUPABASE_SERVICE_KEY` is not set (by design for security)
- After setting variables, redeploy your Vercel project for changes to take effect

## Verification

After setting the variables, you can verify by:
1. Checking Vercel function logs for the sync endpoint
2. Manually triggering: `GET /api/leaderboard/sync?health=true`
3. The sync should run successfully every 15 minutes via cron
