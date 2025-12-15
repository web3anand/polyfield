# Deployment Test Instructions

## ✅ Code Pushed to GitHub

All changes have been committed and pushed to the `fix/reduce-function-count` branch.

## 🚀 Next Steps for Vercel Deployment

### 1. Deploy to Vercel

If you have Vercel connected to your GitHub repo:
- Vercel will automatically deploy the new branch
- Or manually trigger a deployment from the Vercel dashboard

### 2. Set Environment Variables in Vercel

**Critical:** Make sure these are set in Vercel project settings:

1. Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

2. Add these three variables:

   ```
   SUPABASE_URL = https://bzlxrggciehkcslchooe.supabase.co
   
   SUPABASE_SERVICE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxMzc3NywiZXhwIjoyMDgwNTg5Nzc3fQ.FvLwD5yQwC5La8OWtNZatpnxXRft8vRTQXmQ9z66mNk
   
   SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTM3NzcsImV4cCI6MjA4MDU4OTc3N30.vIcU83OafM_MGPRy-RjheuSQkQNRw-RcaI2aDXH4gM
   ```

3. **Select all environments** (Production, Preview, Development)

4. **Redeploy** after setting variables

### 3. Test the Deployment

Once deployed, test using:

```bash
# Replace YOUR_VERCEL_URL with your actual Vercel deployment URL
npm run test:vercel https://YOUR_VERCEL_URL.vercel.app
```

Or manually test:

#### Test Health Check:
```bash
curl https://YOUR_VERCEL_URL.vercel.app/api/leaderboard/sync?health=true
```

#### Test Users API:
```bash
curl https://YOUR_VERCEL_URL.vercel.app/api/leaderboard/users?timePeriod=all&limit=5&offset=0
```

#### Test Builders API:
```bash
curl https://YOUR_VERCEL_URL.vercel.app/api/leaderboard/builders?timePeriod=all&limit=5&offset=0
```

#### Trigger Manual Sync:
```bash
curl https://YOUR_VERCEL_URL.vercel.app/api/leaderboard/sync?type=all&timePeriod=all
```

## 📋 What Was Deployed

### Enhanced Features:
1. **Sync Function** (`api/leaderboard/sync.ts`)
   - Handles 100+ pages efficiently
   - Better batch processing (10 pages fetch, 200 records save)
   - Improved error handling and progress tracking
   - Detailed timing metrics

2. **Automatic Updates** (`vercel.json`)
   - Cron job runs every 15 minutes
   - Automatically syncs users and builders

3. **Improved Pagination** (`client/src/pages/leaderboard.tsx`)
   - Shows all pages when 100 or fewer
   - Better user experience for large datasets

4. **UI Enhancement** (`client/src/pages/dashboard.tsx`)
   - Rounded bottom corners on Unrealized PnL card

### Documentation:
- `LEADERBOARD_SYNC_SETUP.md` - Complete setup guide
- `TESTING_GUIDE.md` - Testing instructions
- `VERCEL_ENV_SETUP.md` - Environment variables setup

## ✅ Verification Checklist

After deployment, verify:

- [ ] Environment variables are set in Vercel
- [ ] Deployment completed successfully
- [ ] Health check endpoint works
- [ ] Users API endpoint works
- [ ] Builders API endpoint works
- [ ] Manual sync can be triggered
- [ ] Cron job is scheduled (check Vercel dashboard)
- [ ] Data appears in Supabase after sync

## 🔍 Monitoring

### Check Vercel Function Logs:
1. Go to Vercel Dashboard → Your Project → Functions
2. Click on `/api/leaderboard/sync`
3. View execution logs

### Check Cron Job:
1. Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
2. Verify `/api/leaderboard/sync?type=all&timePeriod=all` is scheduled
3. Check execution history

### Check Supabase:
1. Go to Supabase Dashboard → Table Editor
2. Check `leaderboard_users` and `leaderboard_builders` tables
3. Verify data is being populated

## 🐛 Troubleshooting

If sync fails:
1. Check Vercel function logs for errors
2. Verify environment variables are set correctly
3. Check Supabase RLS policies allow service role access
4. Manually trigger sync and check logs

If API endpoints return empty:
1. Verify sync has run (check Supabase for data)
2. Check RLS policies allow public read access
3. Verify `time_period` filter matches data in database
