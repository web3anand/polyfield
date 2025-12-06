import axios from 'axios';

const API_BASE = process.env.API_BASE || "http://localhost:3000";

async function testUsernameToPnL() {
  console.log('\n🧪 Testing Username → Wallet → PnL Flow\n');
  console.log('='.repeat(50));
  
  // Test with a known username from leaderboard
  const testUsernames = ['ImJustKen', 'betmoar'];
  
  for (const username of testUsernames) {
    console.log(`\n📊 Testing: ${username}`);
    console.log('-'.repeat(50));
    
    try {
      console.log(`1️⃣ Fetching wallet & PnL for username: ${username}`);
      const response = await axios.get(`${API_BASE}/api/leaderboard/user-pnl`, {
        params: { username },
        timeout: 35000, // PnL fetch can take time
      });
      
      console.log('✓ Response received:');
      console.log(JSON.stringify(response.data, null, 2));
      
      if (response.data.walletAddress) {
        console.log(`\n✅ Success!`);
        console.log(`   Username: ${response.data.username}`);
        console.log(`   Wallet: ${response.data.walletAddress}`);
        console.log(`   Total PnL: $${response.data.totalPnL.toLocaleString()}`);
        console.log(`   Realized PnL: $${response.data.realizedPnL.toLocaleString()}`);
        console.log(`   Unrealized PnL: $${response.data.unrealizedPnL.toLocaleString()}`);
      } else {
        console.log(`\n⚠️  No wallet address found for ${username}`);
        if (response.data.error) {
          console.log(`   Error: ${response.data.error}`);
        }
      }
    } catch (error) {
      console.error(`\n❌ Error testing ${username}:`, error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
  }
  
  console.log('\n✅ Test completed!\n');
}

// Run test
testUsernameToPnL().catch(console.error);

