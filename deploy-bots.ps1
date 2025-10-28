# Polymarket Bots Deployment Script (Windows)
# Deploys Scanner and Oracle bots to remote Linux server

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Polymarket Bots to Server..." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan

# Server Configuration
$SERVER_IP = "207.246.126.234"
$SERVER_USER = "linuxuser"
$SERVER_PASSWORD = 'M6]c@47MFZfqG)vy'
$REMOTE_DIR = "/home/linuxuser/polyfield-bots"

Write-Host ""
Write-Host "📋 Deployment Details:" -ForegroundColor Yellow
Write-Host "  Server: $SERVER_IP" -ForegroundColor White
Write-Host "  User: $SERVER_USER" -ForegroundColor White
Write-Host "  Directory: $REMOTE_DIR" -ForegroundColor White
Write-Host ""

# Check if plink (PuTTY) is available
$plinkPath = "plink"
if (-not (Get-Command plink -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  PuTTY/plink not found. Attempting to use OpenSSH..." -ForegroundColor Yellow
    $plinkPath = "ssh"
}

# Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Cyan
if (Test-Path "dist\bots") {
    Remove-Item -Recurse -Force "dist\bots"
}
New-Item -ItemType Directory -Force -Path "dist\bots" | Out-Null

Copy-Item -Recurse "scanner" "dist\bots\"
Copy-Item -Recurse "oracle" "dist\bots\"

# Create setup script for remote server
$setupScript = @'
#!/bin/bash
# Server Setup Script

set -e

echo "🔧 Setting up Polymarket Bots..."

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    sudo npm install -g pm2
fi

# Navigate to deployment directory
cd /home/linuxuser/polyfield-bots

# Install scanner dependencies
echo "📦 Installing Scanner dependencies..."
cd scanner
npm install
cd ..

# Install oracle dependencies
echo "📦 Installing Oracle dependencies..."
cd oracle
npm install
cd ..

# Setup environment files
echo "⚙️ Setting up environment files..."

# Scanner .env
if [ ! -f scanner/.env ]; then
    cat > scanner/.env << 'SCANNERENV'
POLY_API_KEY=your_polymarket_api_key_here
DB_PATH=./edges.db
PORT=3001
SCANNERENV
    echo "⚠️  Please update scanner/.env with your Polymarket API key"
fi

# Oracle .env
if [ ! -f oracle/.env ]; then
    cat > oracle/.env << 'ORACLEENV'
POLL_INTERVAL=10
CONSENSUS_THRESHOLD=75
ORACLE_DB_PATH=./oracles.db
ORACLEENV
fi

# Stop existing PM2 processes
echo "🛑 Stopping existing processes..."
pm2 stop micro-edge-scanner 2>/dev/null || true
pm2 stop oracle-bot 2>/dev/null || true
pm2 delete micro-edge-scanner 2>/dev/null || true
pm2 delete oracle-bot 2>/dev/null || true

# Start Scanner
echo "🚀 Starting Scanner Bot..."
cd scanner
pm2 start edge-scanner.js --name micro-edge-scanner
cd ..

# Start Oracle Bot
echo "🔮 Starting Oracle Bot..."
cd oracle
pm2 start oracle-bot.js --name oracle-bot
cd ..

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u linuxuser --hp /home/linuxuser || true

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📊 View Bot Status:"
echo "  pm2 status"
echo ""
echo "📝 View Logs:"
echo "  pm2 logs micro-edge-scanner"
echo "  pm2 logs oracle-bot"
echo ""
echo "🔄 Restart Bots:"
echo "  pm2 restart micro-edge-scanner"
echo "  pm2 restart oracle-bot"
echo ""
echo "⚠️  IMPORTANT: Update scanner/.env with your Polymarket API key!"
echo "  nano scanner/.env"
echo ""
'@

$setupScript | Out-File -FilePath "dist\bots\setup.sh" -Encoding UTF8 -NoNewline

Write-Host "📤 Uploading files to server..." -ForegroundColor Cyan
Write-Host "  This may take a moment..." -ForegroundColor Gray

# Using SCP with pscp or scp
try {
    # Try using Windows OpenSSH scp
    Write-Host "  Uploading scanner files..." -ForegroundColor Gray
    & scp -o "StrictHostKeyChecking=no" -o "UserKnownHostsFile=/dev/null" -r "dist\bots\scanner" "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/" 2>&1 | Out-Null
    
    Write-Host "  Uploading oracle files..." -ForegroundColor Gray
    & scp -o "StrictHostKeyChecking=no" -o "UserKnownHostsFile=/dev/null" -r "dist\bots\oracle" "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/" 2>&1 | Out-Null
    
    Write-Host "  Uploading setup script..." -ForegroundColor Gray
    & scp -o "StrictHostKeyChecking=no" -o "UserKnownHostsFile=/dev/null" "dist\bots\setup.sh" "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/" 2>&1 | Out-Null
    
} catch {
    Write-Host "❌ Error uploading files. Make sure OpenSSH client is installed." -ForegroundColor Red
    Write-Host "   Install via: Settings -> Apps -> Optional Features -> Add OpenSSH Client" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Files uploaded successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Files Deployed to Server!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. SSH into server:" -ForegroundColor White
Write-Host "   ssh ${SERVER_USER}@${SERVER_IP}" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Run setup script:" -ForegroundColor White
Write-Host "   cd ${REMOTE_DIR}" -ForegroundColor Cyan
Write-Host "   chmod +x setup.sh" -ForegroundColor Cyan
Write-Host "   ./setup.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Configure API key:" -ForegroundColor White
Write-Host "   nano scanner/.env" -ForegroundColor Cyan
Write-Host "   (Update POLY_API_KEY)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Check bot status:" -ForegroundColor White
Write-Host "   pm2 status" -ForegroundColor Cyan
Write-Host "   pm2 logs micro-edge-scanner" -ForegroundColor Cyan
Write-Host "   pm2 logs oracle-bot" -ForegroundColor Cyan
Write-Host ""
