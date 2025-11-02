# 🚀 Whale Monitor Deployment Guide

## Quick Deployment to VPS

### Step 1: Upload Files

Upload the `whale-monitor` folder to your VPS:

```bash
# Using WinSCP or similar
# Upload: whale-monitor/ → /home/linuxuser/polyfield-bots/whale-monitor/
```

Or via SCP:
```bash
scp -r whale-monitor/ linuxuser@207.246.126.234:~/polyfield-bots/
```

### Step 2: SSH into Server

```bash
ssh linuxuser@207.246.126.234
# Password: M6]c@47MFZfqG)vy
```

### Step 3: Install Dependencies

```bash
cd ~/polyfield-bots/whale-monitor
npm install
```

### Step 4: Configure (Optional)

```bash
cp .env.example .env
nano .env
```

Default settings are fine:
- Large trades: ≥ $10K
- Poll interval: 30 seconds (instant alerts)

### Step 5: Start with PM2

```bash
pm2 start whale-monitor.js --name whale-monitor
pm2 save  # Save PM2 config (auto-start on reboot)
```

### Step 6: Verify

```bash
# Check status
pm2 status

# View logs
pm2 logs whale-monitor

# Should see:
# 🚀 Whale Monitor Starting...
# ✅ Whale monitoring database initialized
# 🐋 Whale Monitor - [timestamp]
```

## ✅ Verification Checklist

- [ ] `pm2 status` shows `whale-monitor` as `online`
- [ ] Logs show "🐋 Whale Monitor Starting..."
- [ ] Database file `whales.db` created
- [ ] No errors in logs
- [ ] Bot running continuously

## 📊 Check Alerts

After running for a few minutes:

```bash
cd ~/polyfield-bots/whale-monitor
sqlite3 whales.db "SELECT COUNT(*) FROM whale_alerts;"
sqlite3 whales.db "SELECT COUNT(*) FROM known_wallets;"
```

## 🔄 Update Main API to Serve Alerts

Update your main dashboard API to expose whale alerts:

```bash
# Edit server routes
nano ~/polyfield-bots/../server/routes.ts
```

Add endpoint (see README.md for code).

## 🎉 Done!

Your whale monitor is now:
- ✅ Running 24/7
- ✅ Monitoring for large trades
- ✅ Detecting fresh wallet deposits
- ✅ Storing alerts in database
- ✅ Auto-restarting with PM2

---

**Server:** 207.246.126.234  
**Location:** `/home/linuxuser/polyfield-bots/whale-monitor/`  
**PM2 Name:** `whale-monitor`

