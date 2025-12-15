# Step-by-Step: Setting Up Vercel Environment Variables

## Quick Setup Guide

Follow these steps to set up all required environment variables in Vercel.

## Step 1: Access Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Sign in to your account
3. Find and click on your project (`polyfield` or similar)

## Step 2: Navigate to Environment Variables

1. Click on **Settings** (in the top navigation)
2. Click on **Environment Variables** (in the left sidebar)

## Step 3: Add Each Environment Variable

Add these **three** environment variables one by one:

### Variable 1: SUPABASE_URL

1. Click **"Add New"** button
2. **Key**: `SUPABASE_URL`
3. **Value**: `https://bzlxrggciehkcslchooe.supabase.co`
4. **Environments**: Select all three:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click **"Save"**

### Variable 2: SUPABASE_SERVICE_KEY

1. Click **"Add New"** button again
2. **Key**: `SUPABASE_SERVICE_KEY`
3. **Value**: 
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxMzc3NywiZXhwIjoyMDgwNTg5Nzc3fQ.FvLwD5yQwC5La8OWtNZatpnxXRft8vRTQXmQ9z66mNk
   ```
4. **Environments**: Select all three:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click **"Save"**

### Variable 3: SUPABASE_ANON_KEY

1. Click **"Add New"** button again
2. **Key**: `SUPABASE_ANON_KEY`
3. **Value**: 
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTM3NzcsImV4cCI6MjA4MDU4OTc3N30.vIcU83OafM_MGPRy-RjheuSQkQNRw-RcaI2aDXH4gM
   ```
4. **Environments**: Select all three:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click **"Save"**

## Step 4: Verify All Variables Are Set

After adding all three, you should see:

```
✅ SUPABASE_URL
✅ SUPABASE_SERVICE_KEY
✅ SUPABASE_ANON_KEY
```

All should show:
- **Production** ✅
- **Preview** ✅
- **Development** ✅

## Step 5: Redeploy Your Project

After setting environment variables, you **must** redeploy for changes to take effect:

### Option A: Via Dashboard (Recommended)
1. Go to **Deployments** tab
2. Click **"..."** (three dots) on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

### Option B: Via Git Push
Just push a new commit (or empty commit):
```bash
git commit --allow-empty -m "Trigger redeploy after env vars"
git push
```

## Step 6: Verify It's Working

After redeployment, test the sync:

```bash
# Replace with your Vercel URL
curl https://YOUR_APP.vercel.app/api/leaderboard/sync?health=true
```

Or check the function logs:
1. Go to **Functions** tab
2. Click on `/api/leaderboard/sync`
3. Check logs - you should see:
   ```
   🔗 Using Supabase URL: https://bzlxrggciehkcslchooe.supabase.co
   ```

## Troubleshooting

### Issue: "Variable already exists"
- Click **Edit** on the existing variable
- Update the value
- Make sure all environments are selected
- Click **Save**

### Issue: "Can't see Environment Variables section"
- Make sure you're the project owner or have admin access
- Check you're in the correct project

### Issue: "Still getting connection errors after setting"
1. Verify all three variables are set correctly
2. Make sure you selected **all environments** (Production, Preview, Development)
3. **Redeploy** the project (environment variables only apply to new deployments)
4. Check function logs for the actual URL being used

## Quick Reference: All Values

Copy-paste ready values:

```bash
# SUPABASE_URL
https://bzlxrggciehkcslchooe.supabase.co

# SUPABASE_SERVICE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxMzc3NywiZXhwIjoyMDgwNTg5Nzc3fQ.FvLwD5yQwC5La8OWtNZatpnxXRft8vRTQXmQ9z66mNk

# SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTM3NzcsImV4cCI6MjA4MDU4OTc3N30.vIcU83OafM_MGPRy-RjheuSQkQNRw-RcaI2aDXH4gM
```

## Visual Guide

```
Vercel Dashboard
└── Your Project
    └── Settings
        └── Environment Variables
            ├── Add New → SUPABASE_URL
            ├── Add New → SUPABASE_SERVICE_KEY
            └── Add New → SUPABASE_ANON_KEY
```

## After Setup

Once all variables are set and you've redeployed:
- ✅ Sync function will connect to the correct Supabase
- ✅ Cron job will run automatically (once per day)
- ✅ API endpoints will work correctly
- ✅ Data will sync successfully
