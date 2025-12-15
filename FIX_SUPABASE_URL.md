# Fix: Supabase URL Environment Variable

This project now uses a single canonical Supabase project:

- **Supabase URL**: `https://bzlxrggciehkcslchooe.supabase.co`

If the leaderboard sync or API routes log DNS or connection errors for Supabase, it usually means `SUPABASE_URL` is missing or set incorrectly in your environment.

## Step 1: Set `SUPABASE_URL` in Vercel

1. Go to `https://vercel.com/dashboard`
2. Open your project (e.g. `polyfield`)
3. Go to **Settings → Environment Variables**
4. Add or edit:
   - **Name**: `SUPABASE_URL`  
   - **Value**: `https://bzlxrggciehkcslchooe.supabase.co`  
   - **Environments**: Production, Preview, Development
5. Click **Save**

## Step 2: Verify Keys

In the same screen, confirm:

- `SUPABASE_SERVICE_KEY` is set for the sync route
- `SUPABASE_ANON_KEY` is set for read-only API routes

The values should match the keys from your Supabase dashboard for this project.

## Step 3: Redeploy

Environment variable changes only apply on new deployments:

1. In Vercel, go to **Deployments**
2. Redeploy the latest build (or push a new commit)

## Step 4: Test

Use the health endpoint to confirm everything is wired correctly:

```bash
curl https://YOUR_APP.vercel.app/api/leaderboard/sync?health=true
```

In the function logs you should see:

```text
🔗 Using Supabase URL: https://bzlxrggciehkcslchooe.supabase.co
```
