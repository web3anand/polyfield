#!/bin/bash
# Polymarket Bots Deployment Script
# Deploys Scanner and Oracle bots to remote server

set -e

echo "🚀 Deploying Polymarket Bots to Server..."
echo "================================================"

# Server Configuration
SERVER_IP="207.246.126.234"
SERVER_USER="linuxuser"
REMOTE_DIR="/home/linuxuser/polyfield-bots"

echo ""
echo "📋 Deployment Details:"
echo "  Server: $SERVER_IP"
echo "  User: $SERVER_USER"
echo "  Directory: $REMOTE_DIR"
echo ""

# Create deployment package
echo "📦 Creating deployment package..."
mkdir -p dist/bots
cp -r scanner dist/bots/
cp -r oracle dist/bots/
cp package.json dist/bots/

# Create setup script for remote server
cat > dist/bots/setup.sh << 'EOF'
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
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u linuxuser --hp /home/linuxuser

echo ""
echo "✅ Deployment Complete!"
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
echo ""

EOF

chmod +x dist/bots/setup.sh

# Upload to server
echo "📤 Uploading files to server..."
sshpass -p 'M6]c@47MFZfqG)vy' ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "mkdir -p ${REMOTE_DIR}"
sshpass -p 'M6]c@47MFZfqG)vy' scp -r -o StrictHostKeyChecking=no dist/bots/* ${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/

# Run setup script on server
echo "🔧 Running setup script on server..."
sshpass -p 'M6]c@47MFZfqG)vy' ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${REMOTE_DIR} && chmod +x setup.sh && ./setup.sh"

echo ""
echo "================================================"
echo "✅ Deployment Complete!"
echo ""
echo "🔗 SSH into server:"
echo "  ssh ${SERVER_USER}@${SERVER_IP}"
echo ""
echo "📊 Check bot status:"
echo "  pm2 status"
echo "  pm2 logs micro-edge-scanner"
echo "  pm2 logs oracle-bot"
echo ""
echo "📁 Bot files location: ${REMOTE_DIR}"
echo ""
