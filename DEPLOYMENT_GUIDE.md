# 🚀 Polymarket Bots Server Deployment Guide

## Server Information
- **IP Address:** 207.246.126.234
- **IPv6:** 2001:19f0:0005:6025:5400:05ff:feba:b56d
- **Username:** linuxuser
- **Password:** M6]c@47MFZfqG)vy

## Quick Deployment Options

### Option 1: Automated PowerShell Script (Recommended for Windows)

```powershell
# Run the deployment script
.\deploy-bots.ps1
```

### Option 2: Manual Deployment via FileZilla/WinSCP

1. **Download WinSCP:** https://winscp.net/eng/download.php

2. **Connect to Server:**
   - Protocol: SFTP
   - Host: 207.246.126.234
   - Username: linuxuser
   - Password: M6]c@47MFZfqG)vy

3. **Upload Files:**
   - Create folder: `/home/linuxuser/polyfield-bots`
   - Upload `scanner/` folder
   - Upload `oracle/` folder

4. **SSH into Server** (use PuTTY or Windows Terminal):
   ```bash
   ssh linuxuser@207.246.126.234
   # Password: M6]c@47MFZfqG)vy
   ```

5. **Run Setup Commands:**
   ```bash
   cd /home/linuxuser/polyfield-bots
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   
   # Install scanner dependencies
   cd scanner
   npm install
   
   # Configure scanner
   nano .env
   # Add your Polymarket API key:
   # POLY_API_KEY=your_actual_api_key
   # DB_PATH=./edges.db
   # PORT=3001
   
   cd ..
   
   # Install oracle dependencies
   cd oracle
   npm install
   cd ..
   
   # Start both bots with PM2
   pm2 start scanner/edge-scanner.js --name micro-edge-scanner
   pm2 start oracle/oracle-bot.js --name oracle-bot
   
   # Save PM2 config and setup auto-restart
   pm2 save
   pm2 startup
   ```

### Option 3: Using Git (If bots are in repo)

```bash
ssh linuxuser@207.246.126.234

# Clone repository
git clone https://github.com/web3anand/polyfield.git
cd polyfield

# Setup scanner
cd scanner
npm install
nano .env  # Add API key
cd ..

# Setup oracle
cd oracle
npm install
cd ..

# Start with PM2
pm2 start scanner/edge-scanner.js --name micro-edge-scanner
pm2 start oracle/oracle-bot.js --name oracle-bot
pm2 save
pm2 startup
```

## Bot Management Commands

Once deployed, use these commands on the server:

### Check Status
```bash
pm2 status
```

### View Logs
```bash
pm2 logs micro-edge-scanner
pm2 logs oracle-bot
pm2 logs  # All logs
```

### Restart Bots
```bash
pm2 restart micro-edge-scanner
pm2 restart oracle-bot
pm2 restart all
```

### Stop Bots
```bash
pm2 stop micro-edge-scanner
pm2 stop oracle-bot
```

### Monitor Resources
```bash
pm2 monit
```

### Save Configuration
```bash
pm2 save
```

## Configuration Files

### Scanner (.env)
```bash
POLY_API_KEY=your_polymarket_api_key_here
DB_PATH=./edges.db
PORT=3001
```

### Oracle (.env)
```bash
POLL_INTERVAL=10
CONSENSUS_THRESHOLD=75
ORACLE_DB_PATH=./oracles.db
```

## Accessing Bot Data

### Scanner Database
```bash
cd /home/linuxuser/polyfield-bots/scanner
sqlite3 edges.db "SELECT * FROM edges ORDER BY timestamp DESC LIMIT 10;"
```

### Oracle Database
```bash
cd /home/linuxuser/polyfield-bots/oracle
sqlite3 oracles.db "SELECT * FROM oracles ORDER BY lastUpdate DESC LIMIT 10;"
```

## Firewall Configuration (If needed)

If you want to expose bot APIs:

```bash
sudo ufw allow 3001/tcp  # Scanner API
sudo ufw allow 3002/tcp  # Oracle API (if configured)
```

## Troubleshooting

### Bot not starting
```bash
# Check Node.js version
node --version  # Should be 18+

# Check logs
pm2 logs micro-edge-scanner --lines 50

# Check process
pm2 describe micro-edge-scanner
```

### Permission errors
```bash
# Fix ownership
sudo chown -R linuxuser:linuxuser /home/linuxuser/polyfield-bots
```

### API errors
```bash
# Verify API key
cat scanner/.env | grep POLY_API_KEY

# Test API manually
curl -H "Authorization: Bearer YOUR_API_KEY" https://data-api.polymarket.com/markets
```

## Monitoring & Maintenance

### Daily Checks
```bash
pm2 status
pm2 logs --lines 20
```

### Weekly Maintenance
```bash
# Update dependencies
cd scanner && npm update && cd ..
cd oracle && npm update && cd ..

# Restart bots
pm2 restart all
```

### Database Cleanup (Monthly)
```bash
# Archive old scanner data
sqlite3 edges.db "DELETE FROM edges WHERE timestamp < strftime('%s', 'now', '-30 days');"

# Vacuum database
sqlite3 edges.db "VACUUM;"
```

## Performance Metrics

### Scanner
- **Scan Frequency:** Every 60 seconds
- **Expected Alerts:** 5-15 per day
- **Memory Usage:** ~50-100MB
- **CPU Usage:** <5%

### Oracle Bot
- **Scan Frequency:** Every 10 seconds
- **Expected Markets:** 50+ tracked
- **Memory Usage:** ~40-80MB
- **CPU Usage:** <5%

## Support

If you encounter issues:

1. Check PM2 logs: `pm2 logs`
2. Check system resources: `htop` or `pm2 monit`
3. Verify network: `ping polymarket.com`
4. Check Node.js: `node --version`

## Next Steps

After deployment:

1. ✅ Monitor logs for 24 hours
2. ✅ Verify scanner is finding edges
3. ✅ Verify oracle is tracking markets
4. ✅ Set up daily status checks
5. ✅ Configure alerts (optional)

---

**Last Updated:** October 28, 2025
