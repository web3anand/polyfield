# 🚀 Deploy Bots to Server (30 Minutes Total)

## Step 1: Package Everything (2 minutes)

Run this PowerShell command:

```powershell
# Create deployment package
Compress-Archive -Path scanner,oracle,ecosystem.config.js,server-setup-complete.sh -DestinationPath polyfield-bots.zip -Force
```

## Step 2: Upload to Server (3 minutes)

### Option A: Using SCP (if OpenSSH installed)
```powershell
scp polyfield-bots.zip linuxuser@207.246.126.234:~/
```
Password: `M6]c@47MFZfqG)vy`

### Option B: Using WinSCP (GUI)
1. Download: https://winscp.net/eng/download.php
2. Connect:
   - Host: 207.246.126.234
   - Username: linuxuser
   - Password: M6]c@47MFZfqG)vy
3. Upload `polyfield-bots.zip` to home directory

## Step 3: SSH into Server (1 minute)

```powershell
ssh linuxuser@207.246.126.234
```
Password: `M6]c@47MFZfqG)vy`

## Step 4: Extract and Run Setup (20 minutes)

On the server, run these commands:

```bash
# Extract files
unzip -o polyfield-bots.zip -d polyfield-bots
cd polyfield-bots

# Make setup script executable
chmod +x server-setup-complete.sh

# Run complete setup (installs Node.js, PM2, dependencies, starts bots)
./server-setup-complete.sh
```

**This script will:**
- ✅ Install Node.js 20.x
- ✅ Install PM2 process manager
- ✅ Install all bot dependencies
- ✅ Configure firewall
- ✅ Create .env files
- ✅ Start both bots with PM2
- ✅ Configure auto-restart on server reboot

## Step 5: Add Polymarket API Key (2 minutes)

```bash
# Edit scanner config
nano scanner/.env

# Change this line:
POLY_API_KEY=your_polymarket_api_key_here

# To your actual key from https://polymarket.com/account/api
POLY_API_KEY=your_actual_key_here

# Save: Ctrl+X, Y, Enter
```

Restart scanner:
```bash
pm2 restart micro-edge-scanner
```

## Step 6: Verify Everything is Running (2 minutes)

```bash
# Check bot status
pm2 status

# View logs in real-time
pm2 logs

# View specific bot
pm2 logs micro-edge-scanner
pm2 logs oracle-bot

# Monitor resources
pm2 monit
```

## ✅ Success Indicators

You should see:
```
┌─────┬────────────────────────┬─────────┬─────────┬─────────┐
│ id  │ name                   │ mode    │ ↺       │ status  │
├─────┼────────────────────────┼─────────┼─────────┼─────────┤
│ 0   │ micro-edge-scanner     │ fork    │ 0       │ online  │
│ 1   │ oracle-bot             │ fork    │ 0       │ online  │
└─────┴────────────────────────┴─────────┴─────────┴─────────┘
```

Logs should show:
```
🔍 Scanning Polymarket for micro-edges...
✓ Found 143 crypto markets
✓ Analyzing EV...
📊 Alert: BTC/USD 15min - EV: 4.2%

🔮 Monitoring 47 UMA oracle markets...
✓ Consensus detected: ETH/USD - 82% YES votes
```

## Managing Your Bots

### View Logs
```bash
pm2 logs                        # All logs
pm2 logs micro-edge-scanner     # Scanner only
pm2 logs oracle-bot             # Oracle only
pm2 flush                       # Clear logs
```

### Restart/Stop
```bash
pm2 restart all                 # Restart both
pm2 restart micro-edge-scanner  # Restart scanner
pm2 stop all                    # Stop both
pm2 start all                   # Start both
```

### Check Database
```bash
# Scanner alerts
cd ~/polyfield-bots/scanner
sqlite3 edges.db "SELECT * FROM edges ORDER BY timestamp DESC LIMIT 10;"

# Oracle data
cd ~/polyfield-bots/oracle
sqlite3 oracles.db "SELECT * FROM oracles ORDER BY lastUpdate DESC LIMIT 10;"
```

### Monitor Resources
```bash
pm2 monit           # Interactive monitor
htop                # System resources
df -h               # Disk space
free -h             # Memory usage
```

## What the Bots Do

### 🔍 Micro-Edge Scanner
- **Scans:** Every 60 seconds
- **Targets:** 15-minute crypto markets
- **Finds:** 3-5% EV opportunities
- **Stores:** SQLite database at `scanner/edges.db`
- **Expected:** 5-15 alerts per day

### 🔮 Oracle Bot
- **Scans:** Every 10 seconds
- **Monitors:** UMA oracle proposals
- **Detects:** 75%+ consensus signals
- **Stores:** SQLite database at `oracle/oracles.db`
- **Edge:** 5-15 seconds before market updates

## Troubleshooting

### Bot shows "errored"
```bash
pm2 logs <bot-name> --lines 100
pm2 describe <bot-name>
pm2 restart <bot-name>
```

### No alerts appearing
```bash
# Check API key is set
cat scanner/.env | grep POLY_API_KEY

# Check network
ping polymarket.com

# Check scanner is running
pm2 status
```

### Update bots
```bash
# Upload new files via WinSCP
# Then:
pm2 restart all
```

## Auto-Restart on Server Reboot

Already configured! PM2 will automatically start your bots when the server reboots.

To verify:
```bash
pm2 startup
```

## 🎉 Done!

Your bots are now running 24/7, scanning for profitable odds on Polymarket!

**Monitor from anywhere:**
```bash
ssh linuxuser@207.246.126.234
pm2 logs
```

**Total Cost:** $5/month (server only, bots are free to run)
