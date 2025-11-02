# Micro Edge Scanner - Troubleshooting Guide

## Why Scanner Might Not Show Alerts

### Issue 1: Scanner Criteria Too Strict ✅ FIXED
**Problem:** Scanner was looking for very specific markets:
- 15-minute expiry (very rare)
- $10K+ liquidity
- EV between 3-5% (narrow range)

**Solution:** Criteria relaxed:
- 60-minute expiry (more markets available)
- $5K+ liquidity (lower threshold)
- EV between 2-10% (broader range)

### Issue 2: Database Path Mismatch ✅ FIXED
**Problem:** API was looking for database at wrong location

**Solution:** API now checks multiple paths:
- Local: `scanner/edges.db`
- VPS: `/home/linuxuser/polyfield-bots/scanner/edges.db`
- Relative paths

### Issue 3: Scanner Not Running on VPS

**Check if scanner is running:**
```bash
ssh linuxuser@207.246.126.234
pm2 status
```

**Should see:**
```
micro-edge-scanner | online
```

**If not running, start it:**
```bash
cd ~/polyfield-bots/scanner
pm2 start edge-scanner.js --name micro-edge-scanner
pm2 save
```

**View logs:**
```bash
pm2 logs micro-edge-scanner
```

### Issue 4: No Markets Match Criteria

**Check scanner logs:**
```bash
pm2 logs micro-edge-scanner --lines 50
```

**Should see:**
```
📊 Found X markets matching criteria
```

If it says "Found 0 markets", it means:
- No markets with 60min expiry + $5k+ liquidity
- This is normal - markets appear and disappear throughout the day

### Issue 5: Database Empty

**Check database:**
```bash
cd ~/polyfield-bots/scanner
sqlite3 edges.db "SELECT COUNT(*) FROM edges;"
sqlite3 edges.db "SELECT * FROM edges ORDER BY timestamp DESC LIMIT 5;"
```

If database is empty:
- Scanner hasn't found any matches yet
- Markets need to meet criteria first
- Wait for markets to appear

## Quick Fixes

### Option 1: Verify Scanner is Running
```bash
ssh linuxuser@207.246.126.234
pm2 status
pm2 logs micro-edge-scanner
```

### Option 2: Test Scanner Manually
```bash
ssh linuxuser@207.246.126.234
cd ~/polyfield-bots/scanner
node edge-scanner.js
```

Should see:
```
🚀 Micro-Edge Scanner starting...
🔍 Scan started at...
📊 Found X markets matching criteria
```

### Option 3: Check Database
```bash
ssh linuxuser@207.246.126.234
cd ~/polyfield-bots/scanner
sqlite3 edges.db "SELECT * FROM edges ORDER BY timestamp DESC LIMIT 10;"
```

### Option 4: Restart Scanner
```bash
ssh linuxuser@207.246.126.234
pm2 restart micro-edge-scanner
pm2 logs micro-edge-scanner --lines 20
```

## Expected Behavior

**Normal Operation:**
- Scanner runs every 60 seconds
- Finds 0-5 markets per scan (depends on market conditions)
- Alerts appear when markets meet criteria
- Database stores alerts even when no matches found

**No Alerts = Normal:**
- Scanner is working correctly
- Just no markets matching criteria right now
- Alerts will appear when suitable markets exist

## Testing

**Force an alert (for testing):**
1. Manually insert test data:
```bash
sqlite3 edges.db "INSERT INTO edges VALUES ('test-1', 4.5, 0.48, 0.52, 'Test Market', 15000, 'YES', 1735689600000, 'active');"
```

2. Check API:
```bash
curl http://localhost:3000/api/scanner/alerts
```

Should return the test alert.

## Monitoring

**Check scanner health:**
```bash
# View recent logs
pm2 logs micro-edge-scanner --lines 100

# Check if scanner is finding markets
grep "Found.*markets" ~/.pm2/logs/micro-edge-scanner-out.log

# Check for errors
grep "error\|Error\|ERROR" ~/.pm2/logs/micro-edge-scanner-error.log
```

## Common Issues Summary

| Issue | Symptom | Solution |
|-------|---------|----------|
| Scanner not running | PM2 shows stopped/errored | `pm2 restart micro-edge-scanner` |
| No markets found | Logs show "Found 0 markets" | Normal - wait for markets |
| Database not found | API returns empty array | Check database path in routes.ts |
| Criteria too strict | Never finds matches | Already relaxed - 60min, $5k, 2-10% EV |
| API can't read DB | Empty alerts returned | Fixed - now checks multiple paths |

---

**Updated Scanner Settings:**
- Expiry: 60 minutes (was 15)
- Liquidity: $5K+ (was $10K)
- EV Range: 2-10% (was 3-5%)

These changes will generate more alerts!

