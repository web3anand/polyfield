# Vercel Cron Job Configuration Notes

## Important: Plan Limitations

According to [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs/usage-and-pricing):

### Hobby Plan Limitations:
- **Only 2 cron jobs** per account
- **Only once per day** - cannot run every 15 minutes
- **Timing is not precise** - can trigger anywhere within the hour

### Pro Plan:
- **40 cron jobs** per account
- **Unlimited invocations**
- **Precise timing** - runs exactly when scheduled

### Enterprise Plan:
- **100 cron jobs** per account
- **Unlimited invocations**
- **Precise timing**

## Current Configuration

Our cron job is configured to run **once per day at midnight UTC** (`0 0 * * *`), which works on:
- **Hobby Plan** ✅
- **Pro Plan** ✅
- **Enterprise Plan** ✅

**Note:** If you upgrade to Pro Plan, you can change the schedule back to every 15 minutes (`*/15 * * * *`) for more frequent updates.

If you're on the **Hobby Plan**, you have two options:

### Option 1: Upgrade to Pro Plan
- Allows the cron job to run every 15 minutes as configured

### Option 2: Adjust Schedule for Hobby Plan
Change the schedule in `vercel.json` to run once per day:

```json
{
  "crons": [
    {
      "path": "/api/leaderboard/sync",
      "schedule": "0 0 * * *"  // Once per day at midnight UTC
    }
  ]
}
```

Or run every 6 hours (4 times per day):
```json
{
  "crons": [
    {
      "path": "/api/leaderboard/sync",
      "schedule": "0 */6 * * *"  // Every 6 hours
    }
  ]
}
```

## Cron Path Configuration

**Important:** Vercel cron jobs should NOT include query parameters in the path.

✅ **Correct:**
```json
{
  "path": "/api/leaderboard/sync"
}
```

❌ **Incorrect:**
```json
{
  "path": "/api/leaderboard/sync?type=all&timePeriod=all"
}
```

The sync function defaults to `type=all` and `timePeriod=all` when called without query parameters, so this works correctly.

## Verification

After deployment:
1. Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
2. Verify the cron job appears in the list
3. Check execution history to see if it's running
4. If on Hobby plan and schedule is `*/15 * * * *`, it may not work - upgrade or change schedule
