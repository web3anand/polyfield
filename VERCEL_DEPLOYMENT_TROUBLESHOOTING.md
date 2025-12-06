# Vercel Deployment Troubleshooting

## Why Vercel Might Not Be Updating

### 1. Check Vercel Dashboard Connection

1. Go to https://vercel.com/dashboard
2. Find your project (`polyfield` or similar)
3. Go to **Settings** → **Git**
4. Verify:
   - ✅ Repository is connected: `web3anand/polyfield`
   - ✅ Production Branch: `main` (not `master` or feature branch)
   - ✅ Auto-deploy is enabled

### 2. Check Branch Configuration

**If Vercel is watching the wrong branch:**
- Go to **Settings** → **Git** → **Production Branch**
- Change it to `main` if it's set to something else
- Save changes

### 3. Manual Trigger Deployment

**Option A: Via Vercel Dashboard**
1. Go to **Deployments** tab
2. Click **"..."** (three dots) on latest deployment
3. Click **"Redeploy"**
4. Or click **"Create Deployment"** button

**Option B: Via Vercel CLI**
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from current directory
vercel --prod
```

### 4. Check Build Logs

1. Go to **Deployments** tab in Vercel
2. Click on the latest deployment
3. Check **Build Logs** for errors
4. Common issues:
   - Missing environment variables
   - Build command failing
   - TypeScript errors
   - Missing dependencies

### 5. Verify Environment Variables

Go to **Settings** → **Environment Variables** and ensure:
- `SUPABASE_URL` is set
- `SUPABASE_SERVICE_KEY` is set
- `SUPABASE_ANON_KEY` is set
- All variables are set for **Production**, **Preview**, and **Development**

### 6. Check Vercel Project Settings

1. Go to **Settings** → **General**
2. Verify:
   - **Framework Preset**: Other (or Vite if available)
   - **Root Directory**: `.` (root)
   - **Build Command**: `cd client && npm install && npm run build`
   - **Output Directory**: `public`
   - **Install Command**: `npm install`

### 7. Force Reconnect GitHub

1. Go to **Settings** → **Git**
2. Click **"Disconnect"** repository
3. Click **"Connect Git Repository"**
4. Select `web3anand/polyfield`
5. Configure settings again

### 8. Check GitHub Webhook

1. Go to GitHub: https://github.com/web3anand/polyfield/settings/hooks
2. Verify Vercel webhook is present and active
3. If missing, reconnect in Vercel dashboard

## Quick Fix: Manual Deployment

If automatic deployment isn't working, you can manually trigger:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## Verify Deployment

After deployment, check:
1. **Deployments** tab shows new deployment
2. **Functions** tab shows your API endpoints
3. **Cron Jobs** tab shows the leaderboard sync job
4. Visit your domain to verify it's live

## Common Issues

### Issue: "Build failed"
- Check build logs for specific errors
- Verify all dependencies are in `package.json`
- Check TypeScript compilation errors

### Issue: "Function timeout"
- Check `vercel.json` has correct `maxDuration` settings
- Verify API endpoints don't have infinite loops

### Issue: "Environment variables missing"
- Add all required env vars in Vercel dashboard
- Ensure they're set for Production environment

### Issue: "Cron job not running"
- Verify `vercel.json` has `crons` configuration
- Check Cron Jobs tab in Vercel dashboard
- Wait 15 minutes for first run (or trigger manually)

## Still Not Working?

1. Check Vercel status: https://www.vercel-status.com/
2. Check GitHub status: https://www.githubstatus.com/
3. Review Vercel logs for detailed error messages
4. Contact Vercel support with deployment logs

