import axios from 'axios';

const POLYMARKET_DATA_API = "https://data-api.polymarket.com";
const API_BASE = process.env.API_BASE || "http://localhost:3000";

async function testLeaderboardAPI() {
  console.log('\n📊 Testing Leaderboard API...\n');
  
  try {
    // Test local API endpoint
    console.log('1️⃣ Testing local API endpoint: /api/leaderboard/users');
    const localResponse = await axios.get(`${API_BASE}/api/leaderboard/users`, {
      params: {
        timePeriod: 'all',
        limit: 10,
        offset: 0,
      },
      timeout: 10000,
    });
    
    console.log(`✓ Local API returned ${localResponse.data.length} users\n`);
    
    if (localResponse.data.length > 0) {
      console.log('📋 Sample user data structure:');
      console.log(JSON.stringify(localResponse.data[0], null, 2));
      console.log('\n');
      
      // Check wallet addresses
      const usersWithWallets = localResponse.data.filter(u => u.walletAddress);
      console.log(`📊 Users with wallet addresses: ${usersWithWallets.length}/${localResponse.data.length}`);
      
      if (usersWithWallets.length > 0) {
        console.log('\n💰 Sample wallet addresses:');
        usersWithWallets.slice(0, 3).forEach((user, i) => {
          console.log(`  ${i + 1}. ${user.userName}: ${user.walletAddress}`);
        });
      } else {
        console.log('⚠️  No wallet addresses found in response!');
        console.log('\n🔍 Checking raw API response...');
        
        // Test direct Polymarket API
        console.log('\n2️⃣ Testing direct Polymarket API...');
        const directResponse = await axios.get(`${POLYMARKET_DATA_API}/v1/leaderboard`, {
          params: {
            timePeriod: 'all',
            orderBy: 'VOL',
            limit: 10,
            offset: 0,
            category: 'overall',
          },
          timeout: 10000,
        });
        
        console.log(`✓ Direct API returned ${directResponse.data.length} users\n`);
        if (directResponse.data.length > 0) {
          console.log('📋 Raw API response structure:');
          console.log(JSON.stringify(directResponse.data[0], null, 2));
          console.log('\n');
          
          // Check all possible wallet fields
          const firstUser = directResponse.data[0];
          console.log('🔍 Checking for wallet address fields:');
          console.log(`  - user: ${firstUser.user || 'NOT FOUND'}`);
          console.log(`  - walletAddress: ${firstUser.walletAddress || 'NOT FOUND'}`);
          console.log(`  - wallet: ${firstUser.wallet || 'NOT FOUND'}`);
          console.log(`  - address: ${firstUser.address || 'NOT FOUND'}`);
          console.log(`  - All keys: ${Object.keys(firstUser).join(', ')}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error testing leaderboard API:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    }
  }
}

async function testPnLAPI() {
  console.log('\n💰 Testing PnL API...\n');
  
  // Test with a known wallet address (you can replace this)
  const testWallets = [
    '0x1234567890123456789012345678901234567890', // Placeholder
  ];
  
  // First, get a real wallet from leaderboard
  try {
    console.log('1️⃣ Fetching a wallet address from leaderboard...');
    const leaderboardResponse = await axios.get(`${API_BASE}/api/leaderboard/users`, {
      params: { limit: 1, offset: 0 },
      timeout: 10000,
    });
    
    if (leaderboardResponse.data.length > 0 && leaderboardResponse.data[0].walletAddress) {
      const wallet = leaderboardResponse.data[0].walletAddress;
      console.log(`✓ Found wallet: ${wallet}\n`);
      
      console.log('2️⃣ Testing PnL API endpoint...');
      try {
        const pnlResponse = await axios.get(`${API_BASE}/api/leaderboard/pnl`, {
          params: { wallet },
          timeout: 30000, // PnL fetch can take time
        });
        
        console.log('✓ PnL API response:');
        console.log(JSON.stringify(pnlResponse.data, null, 2));
        console.log('\n');
      } catch (error) {
        console.error('❌ Error fetching PnL:', error.message);
        if (error.response) {
          console.error(`   Status: ${error.response.status}`);
          console.error(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
      }
    } else {
      console.log('⚠️  No wallet address found in leaderboard response');
      console.log('   Cannot test PnL API without a wallet address\n');
    }
  } catch (error) {
    console.error('❌ Error fetching leaderboard for PnL test:', error.message);
  }
}

async function testFullFlow() {
  console.log('\n🔄 Testing Full Flow (Leaderboard → PnL)...\n');
  
  try {
    // Get first 5 users
    const leaderboardResponse = await axios.get(`${API_BASE}/api/leaderboard/users`, {
      params: { limit: 5, offset: 0 },
      timeout: 10000,
    });
    
    const users = leaderboardResponse.data;
    console.log(`✓ Fetched ${users.length} users\n`);
    
    const usersWithWallets = users.filter(u => u.walletAddress);
    console.log(`📊 Users with wallets: ${usersWithWallets.length}/${users.length}\n`);
    
    if (usersWithWallets.length > 0) {
      console.log('💰 Testing PnL fetch for first user with wallet...\n');
      const testUser = usersWithWallets[0];
      console.log(`   User: ${testUser.userName}`);
      console.log(`   Wallet: ${testUser.walletAddress}`);
      console.log(`   Volume: $${testUser.vol.toLocaleString()}\n`);
      
      try {
        const pnlResponse = await axios.get(`${API_BASE}/api/leaderboard/pnl`, {
          params: { wallet: testUser.walletAddress },
          timeout: 30000,
        });
        
        console.log('✓ PnL Data:');
        console.log(`   Total PnL: $${pnlResponse.data.totalPnL.toLocaleString()}`);
        console.log(`   Realized PnL: $${pnlResponse.data.realizedPnL.toLocaleString()}`);
        console.log(`   Unrealized PnL: $${pnlResponse.data.unrealizedPnL.toLocaleString()}\n`);
      } catch (error) {
        console.error('❌ Error fetching PnL:', error.message);
      }
    } else {
      console.log('⚠️  No users with wallet addresses found!');
      console.log('   This means the API is not returning wallet addresses.\n');
    }
  } catch (error) {
    console.error('❌ Error in full flow test:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Leaderboard & PnL API Test Suite\n');
  console.log('='.repeat(50));
  
  await testLeaderboardAPI();
  console.log('\n' + '='.repeat(50));
  
  await testPnLAPI();
  console.log('\n' + '='.repeat(50));
  
  await testFullFlow();
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Tests completed!\n');
}

// Run tests
runTests().catch(console.error);

