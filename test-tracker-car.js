import axios from 'axios';

const BASE_URL = 'http://localhost:3000'; // Express server
const USERNAME = 'car';

async function testTrackerPage() {
  try {
    console.log(`🧪 Testing Tracker Page for username: "${USERNAME}"`);
    console.log('='.repeat(60));
    console.log(`\n📊 Endpoint: ${BASE_URL}/api/dashboard/username?username=${USERNAME}`);
    console.log(`⏱️  This may take 30-90 seconds due to PnL calculation...\n`);
    
    const startTime = Date.now();
    
    const response = await axios.get(`${BASE_URL}/api/dashboard/username`, {
      params: { username: USERNAME },
      timeout: 120000, // 2 minute timeout
      validateStatus: (status) => status < 600, // Don't throw on any status
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Response received in ${duration} seconds`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📦 Content-Type: ${response.headers['content-type']}`);
    
    if (response.status === 200 && response.data) {
      const data = response.data;
      
      console.log('\n📋 Dashboard Data Summary:');
      console.log('-'.repeat(60));
      
      // Profile
      if (data.profile) {
        console.log('\n👤 Profile:');
        console.log(`   Username: ${data.profile.username}`);
        console.log(`   Wallet: ${data.profile.walletAddress || 'N/A'}`);
        console.log(`   X Username: ${data.profile.xUsername || 'N/A'}`);
        console.log(`   Rank: ${data.profile.rank || 'N/A'}`);
        console.log(`   Profile Image: ${data.profile.profileImage ? 'Yes' : 'No'}`);
      }
      
      // Stats
      if (data.stats) {
        console.log('\n📊 Stats:');
        console.log(`   Total PnL: $${data.stats.totalPnL?.toLocaleString() || '0'}`);
        console.log(`   Realized PnL: $${data.stats.realizedPnL?.toLocaleString() || '0'}`);
        console.log(`   Unrealized PnL: $${data.stats.unrealizedPnL?.toLocaleString() || '0'}`);
        console.log(`   Open Positions Value: $${data.stats.openPositionsValue?.toLocaleString() || '0'}`);
        console.log(`   Total Volume: $${data.stats.totalVolume?.toLocaleString() || '0'}`);
        console.log(`   Total Trades: ${data.stats.totalTrades || 0}`);
        console.log(`   Active Positions: ${data.stats.activePositions || 0}`);
        console.log(`   Win Rate: ${data.stats.winRate || 0}%`);
      }
      
      // Positions
      if (data.positions) {
        console.log(`\n📈 Positions: ${data.positions.length} total`);
        if (data.positions.length > 0) {
          console.log(`   Sample position: ${data.positions[0].marketName || 'N/A'}`);
        }
      }
      
      // Recent Trades
      if (data.recentTrades) {
        console.log(`\n🔄 Recent Trades: ${data.recentTrades.length} total`);
        if (data.recentTrades.length > 0) {
          const firstTrade = data.recentTrades[0];
          console.log(`   Sample trade: ${firstTrade.marketName || 'N/A'} - ${firstTrade.type || 'N/A'}`);
        }
      }
      
      // PnL History
      if (data.pnlHistory) {
        console.log(`\n📉 PnL History: ${data.pnlHistory.length} data points`);
        if (data.pnlHistory.length > 0) {
          const latest = data.pnlHistory[data.pnlHistory.length - 1];
          console.log(`   Latest: $${latest.value?.toLocaleString() || '0'} at ${latest.timestamp || 'N/A'}`);
        }
      }
      
      console.log('\n✅ Dashboard data structure is valid!');
      
    } else if (response.status === 404) {
      console.log('\n❌ User Not Found');
      if (response.data?.error) {
        console.log(`   Error: ${response.data.error}`);
      }
      if (response.data?.message) {
        console.log(`   Message: ${response.data.message}`);
      }
    } else if (response.status === 504) {
      console.log('\n⏱️  Request Timeout');
      if (response.data?.error) {
        console.log(`   Error: ${response.data.error}`);
      }
    } else {
      console.log('\n❌ Unexpected Response');
      console.log(`   Status: ${response.status}`);
      console.log(`   Data:`, JSON.stringify(response.data, null, 2).substring(0, 500));
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('\n❌ Connection Refused');
      console.log(`   Is the server running on ${BASE_URL}?`);
      console.log(`   Try: npm run dev`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n⏱️  Request Timed Out');
      console.log(`   The request took longer than 2 minutes`);
      console.log(`   This is normal for PnL calculation`);
    } else if (error.response) {
      console.log('\n❌ Error Response');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2).substring(0, 500));
    } else {
      console.log('\n❌ Error:', error.message);
    }
  }
}

testTrackerPage().catch(console.error);

