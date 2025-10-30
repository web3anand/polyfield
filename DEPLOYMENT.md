# VPS Deployment Guide - Oracle with LLM

Quick guide to deploy the LLM-enhanced oracle on your VPS.

## Pre-requisites

1. **Get API Keys** (all free):
   - Groq: https://console.groq.com/keys
   - NewsAPI: https://newsapi.org/register

2. **SSH into VPS**:
   ```bash
   ssh root@207.246.126.234
   ```

## Deployment Steps

### 1. Update Code
```bash
cd /root/vps-bots/oracle
git pull origin main
```

### 2. Install Dependencies
```bash
npm install  # Already has @supabase/supabase-js and dotenv
```

### 3. Update .env
```bash
nano .env
```

Add these lines (keep existing SUPABASE vars):
```env
# Existing (don't change)
SUPABASE_URL=https://orxyqgecymsuwuxtjdck.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# New (add these)
GROQ_API_KEY=gsk_your_key_here
NEWS_API_KEY=your_key_here
```

Save: `Ctrl+X`, `Y`, `Enter`

### 4. Run Database Migration

Option A - Direct SQL (fastest):
```bash
# Login to Supabase dashboard → SQL Editor → Run:
ALTER TABLE oracles ADD COLUMN IF NOT EXISTS llm_analysis JSONB;
CREATE INDEX IF NOT EXISTS idx_oracles_llm_analysis ON oracles USING GIN (llm_analysis);
```

Option B - If you have psql installed:
```bash
psql "postgresql://postgres.orxyqgecymsuwuxtjdck:Polystake!@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f /root/vps-bots/oracle/../../supabase-migrations/05-add-llm-analysis.sql
```

### 5. Test Run (Optional)
```bash
# Test without PM2 first
node full-oracle-v2.js

# Should see:
# 🚀 ORACLE SCANNER WITH LLM
# 🤖 LLM: Groq Llama 3.1 (>$50k political markets)
# ...
# ✅ Will Trump... - 72% Yes 🤖 YES 12%
```

Press `Ctrl+C` to stop test.

### 6. Deploy with PM2
```bash
# Stop old oracle
pm2 stop oracle  # or pm2 stop 6

# Start new LLM version
pm2 start full-oracle-v2.js --name oracle-llm

# Save PM2 config
pm2 save

# Check status
pm2 status

# View logs
pm2 logs oracle-llm --lines 50
```

### 7. Verify LLM is Working

Check logs for LLM markers:
```bash
pm2 logs oracle-llm | grep "🤖"
```

Should see:
```
✅ Trump handshake odds - 72% Yes 🤖 YES 12%
✅ Bitcoin $100k - 65% Yes 🤖 YES 8%
```

Check database:
```sql
-- In Supabase SQL Editor
SELECT title, llm_analysis->>'betSide' as bet, llm_analysis->>'edge' as edge
FROM oracles
WHERE llm_analysis IS NOT NULL
LIMIT 10;
```

## Monitoring

### Check PM2 Status
```bash
pm2 status
pm2 logs oracle-llm --lines 100
pm2 monit  # Interactive dashboard
```

### Check Groq Usage
- Dashboard: https://console.groq.com/usage
- Free tier: 30 req/min, 14,400/day
- Our usage: ~50 req/scan (every 60s) = ~72k/day
  - **WAIT**: 72k > 14,400 → Need to throttle!

### Throttle Fix (Important!)
If hitting rate limits, reduce scan frequency:

```bash
nano full-oracle-v2.js
```

Change line 16:
```javascript
const SCAN_INTERVAL = 60000; // 1 minute
```
To:
```javascript
const SCAN_INTERVAL = 300000; // 5 minutes (safer for free tier)
```

Or increase liquidity threshold (fewer markets analyzed):
```javascript
const MIN_LIQUIDITY = 100000; // Only analyze >$100k markets
```

Then restart:
```bash
pm2 restart oracle-llm
```

## Rollback (if issues)

Switch back to original oracle without LLM:
```bash
pm2 stop oracle-llm
pm2 start full-oracle.js --name oracle
pm2 save
```

## Troubleshooting

### "Missing GROQ_API_KEY" but key is in .env
```bash
# Verify .env loaded
pm2 restart oracle-llm --update-env

# Or hardcode in full-oracle-v2.js (line 5):
const GROQ_API_KEY = "gsk_your_key_here";
```

### Rate limit errors
```bash
# Check Groq dashboard usage
# Increase SCAN_INTERVAL to 5+ minutes
# Or increase MIN_LIQUIDITY to 100k
```

### No LLM analysis in database
```bash
# Check logs for political markets
pm2 logs oracle-llm | grep "political"

# Verify liquidity threshold
# Markets must be >$50k + political keywords
```

### PM2 not starting
```bash
# Check syntax errors
node full-oracle-v2.js

# View PM2 error logs
pm2 logs oracle-llm --err
```

## Monitoring Dashboard

Frontend should auto-update (Vercel deploy):
1. Go to polyfield.vercel.app/oracle
2. Markets with LLM should show purple "AI Analysis" badge
3. Click to expand bet recommendations

## Cost Tracking

All services on free tier:
- Groq: $0 (14,400 req/day)
- NewsAPI: $0 (100 req/day)
- Supabase: $0 (500MB DB)
- VPS: $5/month (existing)
- Vercel: $0 (hobby tier)

**Total new cost**: $0 ✅

## Support

Issues? Check:
1. PM2 logs: `pm2 logs oracle-llm`
2. Supabase logs: Dashboard → Logs
3. Groq usage: console.groq.com/usage
4. GitHub: Push new fixes, then `git pull` on VPS

## Next Steps

After stable for 24h:
- [ ] Monitor Groq quota (should use ~2k/day with 5min scans)
- [ ] Check NewsAPI usage (should be <100/day)
- [ ] Verify LLM accuracy on 10 markets
- [ ] Consider UMA integration (optional)
