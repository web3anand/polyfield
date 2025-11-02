# VPS Scanner Fix - Quick Deployment Guide

## Server Details
- **IP:** 207.246.126.234
- **User:** linuxuser
- **Password:** M6]c@47MFZfqG)vy

## Step 1: SSH into VPS

```bash
ssh linuxuser@207.246.126.234
# Password: M6]c@47MFZfqG)vy
```

## Step 2: Check Scanner Status

```bash
pm2 status
```

**Expected output:**
```
┌────┬───────────────────────┬─────────┬──────────┐
│ ID │ Name                  │ Status  │ Function │
├────┼───────────────────────┼─────────┼──────────┤
│ 0  │ micro-edge-scanner    │ ONLINE  │ Scans every 60s │
```

If status is "stopped" or "errored":
```bash
pm2 restart micro-edge-scanner
```

## Step 3: Check Scanner Logs

```bash
pm2 logs micro-edge-scanner --lines 50
```

**Look for:**
- `📊 Found X markets matching criteria`
- Any errors or warnings
- Scanner running successfully

## Step 4: Update Scanner Code

Upload the updated `scanner/edge-scanner.js` file to:
```
/home/linuxuser/polyfield-bots/scanner/edge-scanner.js
```

Then restart:
```bash
cd ~/polyfield-bots/scanner
pm2 restart micro-edge-scanner
pm2 save
```

## Step 5: Verify Database

```bash
cd ~/polyfield-bots/scanner
ls -la edges.db
sqlite3 edges.db "SELECT COUNT(*) FROM edges;"
sqlite3 edges.db "SELECT * FROM edges ORDER BY timestamp DESC LIMIT 5;"
```

## Step 6: Check API Can Access Database

If your API server is also on the VPS, verify the database path:
```bash
# The API should find: /home/linuxuser/polyfield-bots/scanner/edges.db
```

## Step 7: Monitor Real-Time

```bash
pm2 logs micro-edge-scanner
```

Watch for:
- Scanner starting successfully
- Markets being found
- Alerts being saved

## Quick Test

Force a scan to see if it's working:
```bash
cd ~/polyfield-bots/scanner
node edge-scanner.js
```

Should see:
```
🚀 Micro-Edge Scanner starting...
🔍 Scan started at...
📊 Found X markets matching criteria
```

## Common Issues

### Scanner not in PM2
```bash
cd ~/polyfield-bots/scanner
pm2 start edge-scanner.js --name micro-edge-scanner
pm2 save
```

### Database doesn't exist
```bash
cd ~/polyfield-bots/scanner
node edge-scanner.js  # Run once to create DB
```

### No markets found
This is normal! Scanner will only find alerts when markets meet criteria:
- 60-minute expiry
- $5K+ liquidity
- 2-10% EV

Markets appear and disappear throughout the day.

## Updated Scanner Settings

✅ **Expiry:** 60 minutes (was 15)
✅ **Liquidity:** $5K+ (was $10K)
✅ **EV Range:** 2-10% (was 3-5%)

These changes will generate MORE alerts!

---

**Files to Upload:**
1. `scanner/edge-scanner.js` (updated with relaxed criteria)
2. `server/routes.ts` (if API is on VPS - updated database path logic)

