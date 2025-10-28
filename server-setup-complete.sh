#!/bin/bash
# Complete Server Setup Script for Polyfield Bots
# Run this on your VPS after uploading files

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Polyfield Bots - Complete Server Setup${NC}"
echo -e "${CYAN}================================================${NC}"

# 1. Update System
echo -e "\n${CYAN}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20.x
echo -e "\n${CYAN}📥 Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
echo -e "${GREEN}✅ npm: $(npm --version)${NC}"

# 3. Install PM2
echo -e "\n${CYAN}📥 Installing PM2 process manager...${NC}"
sudo npm install -g pm2

# 4. Install other dependencies
echo -e "\n${CYAN}📥 Installing system dependencies...${NC}"
sudo apt install -y git curl ufw sqlite3 cron

# 5. Setup Firewall
echo -e "\n${CYAN}🔒 Configuring firewall...${NC}"
sudo ufw allow ssh
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
echo "y" | sudo ufw enable

# 6. Create project directory
echo -e "\n${CYAN}📁 Setting up project directory...${NC}"
DEPLOY_DIR="/home/linuxuser/polyfield-bots"
mkdir -p "$DEPLOY_DIR/logs"
cd "$DEPLOY_DIR"

# 7. Install Scanner dependencies
echo -e "\n${CYAN}📦 Installing Scanner dependencies...${NC}"
if [ -d "scanner" ]; then
    cd scanner
    npm install --production
    echo -e "${GREEN}✅ Scanner dependencies installed${NC}"
    cd "$DEPLOY_DIR"
else
    echo -e "${RED}❌ scanner/ folder not found${NC}"
    exit 1
fi

# 8. Install Oracle dependencies
echo -e "\n${CYAN}📦 Installing Oracle dependencies...${NC}"
if [ -d "oracle" ]; then
    cd oracle
    npm install --production
    echo -e "${GREEN}✅ Oracle dependencies installed${NC}"
    cd "$DEPLOY_DIR"
else
    echo -e "${RED}❌ oracle/ folder not found${NC}"
    exit 1
fi

# 9. Setup Scanner .env
echo -e "\n${CYAN}⚙️  Configuring Scanner environment...${NC}"
if [ ! -f "scanner/.env" ]; then
    cat > scanner/.env << 'EOF'
POLY_API_KEY=your_polymarket_api_key_here
DB_PATH=./edges.db
PORT=3001
NODE_ENV=production
EOF
    echo -e "${YELLOW}⚠️  Please update scanner/.env with your Polymarket API key${NC}"
fi

# 10. Setup Oracle .env
echo -e "\n${CYAN}⚙️  Configuring Oracle environment...${NC}"
if [ ! -f "oracle/.env" ]; then
    cat > oracle/.env << 'EOF'
POLL_INTERVAL=10
CONSENSUS_THRESHOLD=75
ORACLE_DB_PATH=./oracles.db
NODE_ENV=production
EOF
    echo -e "${GREEN}✅ Oracle .env created${NC}"
fi

# 11. Stop existing PM2 processes
echo -e "\n${CYAN}🛑 Stopping existing processes...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# 12. Start bots with PM2 using ecosystem file
echo -e "\n${CYAN}🚀 Starting bots with PM2...${NC}"
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
else
    # Fallback: Start individually
    cd scanner
    pm2 start edge-scanner.js --name micro-edge-scanner
    cd "$DEPLOY_DIR"
    
    cd oracle
    pm2 start oracle-bot.js --name oracle-bot
    cd "$DEPLOY_DIR"
fi

# 13. Save PM2 configuration
echo -e "\n${CYAN}💾 Saving PM2 configuration...${NC}"
pm2 save

# 14. Setup PM2 startup
echo -e "\n${CYAN}🔄 Configuring PM2 auto-start...${NC}"
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u linuxuser --hp /home/linuxuser

# 15. Display status
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Setup Complete! Bots are now running 24/7${NC}"
echo -e "${GREEN}================================================${NC}"

echo -e "\n${CYAN}📊 Current Status:${NC}"
pm2 status

echo -e "\n${CYAN}📝 Useful Commands:${NC}"
echo -e "  ${YELLOW}View all logs:${NC}      pm2 logs"
echo -e "  ${YELLOW}View scanner logs:${NC}  pm2 logs micro-edge-scanner"
echo -e "  ${YELLOW}View oracle logs:${NC}   pm2 logs oracle-bot"
echo -e "  ${YELLOW}Restart bots:${NC}       pm2 restart all"
echo -e "  ${YELLOW}Stop bots:${NC}          pm2 stop all"
echo -e "  ${YELLOW}Monitor:${NC}            pm2 monit"

echo -e "\n${CYAN}📁 Database Locations:${NC}"
echo -e "  Scanner: $DEPLOY_DIR/scanner/edges.db"
echo -e "  Oracle:  $DEPLOY_DIR/oracle/oracles.db"

if grep -q "your_polymarket_api_key_here" scanner/.env 2>/dev/null; then
    echo -e "\n${RED}⚠️  IMPORTANT: Update your Polymarket API key!${NC}"
    echo -e "${YELLOW}   nano scanner/.env${NC}"
    echo -e "${YELLOW}   Then: pm2 restart micro-edge-scanner${NC}"
fi

echo -e "\n${GREEN}🎉 Bots are scanning 24/7 for profitable odds!${NC}"
