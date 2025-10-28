# 🚀 Quick Deployment Steps

## What You Need
- WinSCP or FileZilla (for file transfer)
- PuTTY or Windows Terminal (for SSH)
- Server credentials (already provided)

## Step 1: Upload Files to Server

### Using WinSCP (Recommended for Windows)

1. **Download WinSCP:** https://winscp.net/eng/download.php

2. **Connect to Server:**
   - File Protocol: **SFTP**
   - Host name: **207.246.126.234**
   - Port: **22**
   - User name: **linuxuser**
   - Password: **M6]c@47MFZfqG)vy**
   - Click **Login**

3. **Upload Bot Folders:**
   - On the server side (right panel), navigate to: `/home/linuxuser`
   - Create folder: `polyfield-bots`
   - On your computer (left panel), navigate to: `C:\PolyMarketDashboard\dist\bots`
   - Drag and drop these folders to the server:
     - `scanner/`
     - `oracle/`
     - `server-setup.sh`

## Step 2: SSH into Server and Run Setup

### Using Windows Terminal or PowerShell

```powershell
ssh linuxuser@207.246.126.234
# When prompted, enter password: M6]c@47MFZfqG)vy
```

### Or Download PuTTY
- Download: https://www.putty.org/
- Host: 207.246.126.234
- Username: linuxuser
- Password: M6]c@47MFZfqG)vy

## Step 3: Run the Setup Script

Once connected to the server:

```bash
cd polyfield-bots
chmod +x server-setup.sh
./server-setup.sh
```

This will:
- ✅ Install Node.js
- ✅ Install PM2 (process manager)
- ✅ Install all bot dependencies
- ✅ Create configuration files
- ✅ Start both bots
- ✅ Set up auto-restart on server reboot

## Step 4: Configure API Key

After setup completes:

```bash
# Edit scanner configuration
nano scanner/.env

# Change this line:
POLY_API_KEY=your_polymarket_api_key_here

# To your actual API key:
POLY_API_KEY=abc123xyz...

# Save: Ctrl+X, then Y, then Enter
```

Then restart the scanner:
```bash
pm2 restart micro-edge-scanner
```

## Step 5: Verify Bots are Running

```bash
# Check status
pm2 status

# View logs
pm2 logs micro-edge-scanner --lines 20
pm2 logs oracle-bot --lines 20

# Monitor in real-time
pm2 logs
```

You should see:
- ✅ Both bots show "online" status
- ✅ Scanner logs show market scanning activity
- ✅ Oracle logs show oracle monitoring

## Alternative: One-Command Upload (If you have scp)

If OpenSSH is installed on Windows:

```powershell
cd C:\PolyMarketDashboard
scp -r dist\bots\scanner dist\bots\oracle dist\bots\server-setup.sh linuxuser@207.246.126.234:~/polyfield-bots/
```

Then SSH and run setup.

## Troubleshooting

### Can't connect via SSH
- Make sure you're using the correct IP: 207.246.126.234
- Try both password authentication methods
- Ensure port 22 is not blocked by firewall

### Files not uploading
- Check server directory exists: `/home/linuxuser/polyfield-bots`
- Verify you have write permissions
- Try uploading one folder at a time

### Bots not starting
- Check Node.js is installed: `node --version`
- View error logs: `pm2 logs`
- Check file permissions: `ls -la`

## Need Help?

Run these diagnostic commands on the server:

```bash
# Check system info
uname -a
node --version
npm --version
pm2 --version

# Check bot status
pm2 status
pm2 logs --lines 50

# Check disk space
df -h

# Check running processes
ps aux | grep node
```

---

**Total Time:** ~10 minutes
**Difficulty:** Easy ⭐
