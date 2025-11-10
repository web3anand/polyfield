/**
 * Test script to verify leaderboard volume API
 */

import axios from 'axios';

const DATA_API = "https://data-api.polymarket.com";

async function testLeaderboardVolume(walletAddress) {
  console.log(`\n🧪 Testing Leaderboard Volume API for: ${walletAddress}\n`);
  
  try {
    const response = await axios.get(`${DATA_API}/v1/leaderboard`, {
      params: {
        timePeriod: 'all',
        orderBy: 'VOL',
        limit: 1,
        offset: 0,
        category: 'overall',
        user: walletAddress,
      },
      timeout: 5000,
    });

    console.log('✅ Leaderboard API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      const data = response.data[0];
      console.log('\n📊 Parsed Data:');
      console.log(`   Username: ${data.userName}`);
      console.log(`   X Username: ${data.xUsername}`);
      console.log(`   Rank: #${data.rank}`);
      console.log(`   Volume: $${parseFloat(data.vol).toLocaleString()} USD`);
      console.log(`   PnL: $${parseFloat(data.pnl).toLocaleString()} USD`);
      console.log(`   Verified: ${data.verifiedBadge ? '✓' : '✗'}`);
      console.log(`   Profile Image: ${data.profileImage ? 'Yes' : 'No'}`);
    } else {
      console.log('⚠️  No data returned from leaderboard API');
    }
  } catch (error) {
    console.error('❌ Error fetching leaderboard data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Test with Car's wallet address
const CAR_WALLET = "0x9d84ce0306f8551e02efef1680475fc0f1dc1344";

console.log('🚀 Starting Leaderboard Volume API Test\n');
console.log('═══════════════════════════════════════\n');

testLeaderboardVolume(CAR_WALLET)
  .then(() => {
    console.log('\n═══════════════════════════════════════');
    console.log('✅ Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

