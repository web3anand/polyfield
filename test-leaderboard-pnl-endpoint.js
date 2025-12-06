import axios from 'axios';

const BASE_URL = 'http://localhost:3000'; // Express server
// const BASE_URL = 'http://localhost:5173'; // Vite dev server (proxies to Express)

// Test wallet addresses from the leaderboard
const testWallets = [
  '0x9d84ce0306f8551e02efef1680475fc0f1dc1344',
  '0x2d27e4d20f3b8a2ee3bc861d9b83752f338676d8',
  '0xb5d2f38cdb5b71816dc4fdf5eb676a3b230d317b',
];

async function testPnLEndpoint(wallet) {
  try {
    console.log(`\n📊 Testing PnL endpoint for wallet: ${wallet}`);
    console.log(`   URL: ${BASE_URL}/api/leaderboard/pnl?wallet=${wallet}`);
    
    const response = await axios.get(`${BASE_URL}/api/leaderboard/pnl`, {
      params: { wallet },
      timeout: 30000, // 30 second timeout
      validateStatus: (status) => status < 500, // Don't throw on 4xx
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    
    if (response.headers['content-type']?.includes('application/json')) {
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      
      if (response.data.totalPnL !== undefined) {
        console.log(`   ✓ PnL: $${response.data.totalPnL.toLocaleString()}`);
      } else {
        console.log(`   ⚠️ Missing totalPnL in response`);
      }
    } else {
      console.log(`   ❌ Response is not JSON!`);
      console.log(`   Response preview: ${response.data.substring(0, 200)}`);
    }
    
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`   ❌ Connection refused - is the server running on ${BASE_URL}?`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log(`   ❌ Request timed out after 30 seconds`);
    } else if (error.response) {
      console.log(`   ❌ Error ${error.response.status}: ${error.response.statusText}`);
      console.log(`   Response:`, error.response.data);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
    return null;
  }
}

async function testDashboardEndpoint(username) {
  try {
    console.log(`\n📊 Testing Dashboard endpoint for username: ${username}`);
    console.log(`   URL: ${BASE_URL}/api/dashboard/username?username=${username}`);
    
    const response = await axios.get(`${BASE_URL}/api/dashboard/username`, {
      params: { username },
      timeout: 30000,
      validateStatus: (status) => status < 500,
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.data?.stats?.totalPnL !== undefined) {
      console.log(`   ✓ Dashboard PnL: $${response.data.stats.totalPnL.toLocaleString()}`);
      console.log(`   ✓ Wallet: ${response.data.profile?.walletAddress}`);
    } else {
      console.log(`   ⚠️ Missing PnL in dashboard response`);
    }
    
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`   ❌ Connection refused - is the server running on ${BASE_URL}?`);
    } else if (error.response) {
      console.log(`   ❌ Error ${error.response.status}: ${error.response.statusText}`);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
    return null;
  }
}

async function runTests() {
  console.log('🧪 Testing Leaderboard PnL Endpoint');
  console.log('='.repeat(60));
  
  // Test 1: Test PnL endpoint with sample wallets
  console.log('\n📋 Test 1: Testing /api/leaderboard/pnl endpoint');
  for (const wallet of testWallets.slice(0, 2)) { // Test first 2 to avoid too many requests
    await testPnLEndpoint(wallet);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between requests
  }
  
  // Test 2: Compare with dashboard endpoint (if we have a username)
  console.log('\n📋 Test 2: Testing /api/dashboard/username endpoint for comparison');
  // You can add a test username here if you want to compare
  // await testDashboardEndpoint('some-username');
  
  console.log('\n✅ Tests complete!');
  console.log('\n💡 If you see connection errors, make sure:');
  console.log('   1. The Express server is running on port 3000');
  console.log('   2. The /api/leaderboard/pnl route is registered in server/routes.ts');
  console.log('   3. The server has been restarted after adding the route');
}

runTests().catch(console.error);

