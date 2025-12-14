# Fix: Supabase URL Environment Variable

## Issue
The sync function is trying to connect to the wrong Supabase URL:
- ❌ **Wrong URL**: `orxyqgecymsuwuxtjdck.supabase.co` (DNS lookup fails)
- ✅ **Correct URL**: `bzlxrggciehkcslchooe.supabase.co`

## Error Message
```
Error: getaddrinfo ENOTFOUND orxyqgecymsuwuxtjdck.supabase.co
```

## Solution: Update Vercel Environment Variable

### Step 1: Go to Vercel Dashboard
1. Navigate to: https://vercel.com/dashboard
2. Select your project (`polyfield`)

### Step 2: Update Environment Variables
1. Go to **Settings** → **Environment Variables**
2. Find `SUPABASE_URL` in the list
3. Click **Edit** (or delete and recreate if needed)
4. Update the value to:
   ```
   https://bzlxrggciehkcslchooe.supabase.co
   ```
5. Make sure it's set for **all environments**:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development
6. Click **Save**

### Step 3: Verify Other Variables
While you're there, verify these are also set correctly:

1. **SUPABASE_SERVICE_KEY**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxMzc3NywiZXhwIjoyMDgwNTg5Nzc3fQ.FvLwD5yQwC5La8OWtNZatpnxXRft8vRTQXmQ9z66mNk
   ```

2. **SUPABASE_ANON_KEY**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTM3NzcsImV4cCI6MjA4MDU4OTc3N30.vIcU83OafM_MGPRy-RjheuSQkQNRw-RcaI2aDXH4gM
   ```

### Step 4: Redeploy
After updating environment variables:
1. Go to **Deployments** tab
2. Click **"..."** (three dots) on the latest deployment
3. Click **"Redeploy"**
4. Or trigger a new deployment by pushing a commit

### Step 5: Test
After redeployment, test the sync:
```bash
curl https://YOUR_APP.vercel.app/api/leaderboard/sync
```

Or check the health:
```bash
curl https://YOUR_APP.vercel.app/api/leaderboard/sync?health=true
```

## Quick Fix via Vercel CLI

If you prefer using CLI:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Set environment variable
vercel env add SUPABASE_URL production
# When prompted, enter: https://bzlxrggciehkcslchooe.supabase.co

# Redeploy
vercel --prod
```

## Verification

After fixing, check the Vercel function logs:
1. Go to **Functions** tab
2. Click on `/api/leaderboard/sync`
3. Check the logs - you should see:
   ```
   🔗 Using Supabase URL: https://bzlxrggciehkcslchooe.supabase.co
   ```
   Instead of the old URL.

## Why This Happened

The old Supabase project (`orxyqgecymsuwuxtjdck`) might have been:
- Deleted
- Suspended
- Or you're using a different project now

The code defaults to the correct URL, but if the environment variable is set to the old URL, it will override the default.
