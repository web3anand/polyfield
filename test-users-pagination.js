import axios from 'axios';

const POLYMARKET_DATA_API = "https://data-api.polymarket.com";
const LOCAL_API = "http://localhost:3000";
const VERCEL_API = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : "https://polyfield-jjx3jm9cy-web3anands-projects.vercel.app";

async function testUsersPagination() {
  console.log('🧪 Testing Users Leaderboard Pagination...\n');
  
  // Test 1: Direct Polymarket API
  console.log('1. Testing Polymarket API directly:');
  console.log('   Testing limit=100, offset=0...\n');
  
  try {
    const response1 = await axios.get(`${POLYMARKET_DATA_API}/v1/leaderboard`, {
      params: {
        timePeriod: 'all',
        orderBy: 'VOL',
        limit: 100,
        offset: 0,
        category: 'overall',
      },
      timeout: 10000,
    });
    
    console.log(`   ✓ Status: ${response1.status}`);
    console.log(`   ✓ Data points: ${response1.data?.length || 0}`);
    if (response1.data && response1.data.length > 0) {
      console.log(`   ✓ First user: ${response1.data[0].userName || response1.data[0].name || 'N/A'}`);
      console.log(`   ✓ Last user: ${response1.data[response1.data.length - 1].userName || response1.data[response1.data.length - 1].name || 'N/A'}`);
    }
    console.log('');
    
    // Test second page
    console.log('   Testing limit=100, offset=100...\n');
    const response2 = await axios.get(`${POLYMARKET_DATA_API}/v1/leaderboard`, {
      params: {
        timePeriod: 'all',
        orderBy: 'VOL',
        limit: 100,
        offset: 100,
        category: 'overall',
      },
      timeout: 10000,
    });
    
    console.log(`   ✓ Status: ${response2.status}`);
    console.log(`   ✓ Data points: ${response2.data?.length || 0}`);
    if (response2.data && response2.data.length > 0) {
      console.log(`   ✓ First user (page 2): ${response2.data[0].userName || response2.data[0].name || 'N/A'}`);
      console.log(`   ✓ Last user (page 2): ${response2.data[response2.data.length - 1].userName || response2.data[response2.data.length - 1].name || 'N/A'}`);
    }
    console.log('');
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    console.log('');
  }
  
  // Test 2: Local API endpoint (if running)
  console.log('2. Testing Local API endpoint:');
  console.log(`   URL: ${LOCAL_API}/api/leaderboard/users?timePeriod=ALL&limit=100&offset=0\n`);
  
  try {
    const localResponse1 = await axios.get(`${LOCAL_API}/api/leaderboard/users`, {
      params: {
        timePeriod: 'ALL',
        limit: 100,
        offset: 0,
      },
      timeout: 10000,
    });
    
    console.log(`   ✓ Status: ${localResponse1.status}`);
    console.log(`   ✓ Data points: ${localResponse1.data?.length || 0}`);
    if (localResponse1.data && localResponse1.data.length > 0) {
      console.log(`   ✓ First user: ${localResponse1.data[0].userName || 'N/A'}`);
      console.log(`   ✓ Last user: ${localResponse1.data[localResponse1.data.length - 1].userName || 'N/A'}`);
    }
    console.log('');
    
    // Test second page
    console.log(`   Testing page 2: ${LOCAL_API}/api/leaderboard/users?timePeriod=ALL&limit=100&offset=100\n`);
    const localResponse2 = await axios.get(`${LOCAL_API}/api/leaderboard/users`, {
      params: {
        timePeriod: 'ALL',
        limit: 100,
        offset: 100,
      },
      timeout: 10000,
    });
    
    console.log(`   ✓ Status: ${localResponse2.status}`);
    console.log(`   ✓ Data points: ${localResponse2.data?.length || 0}`);
    if (localResponse2.data && localResponse2.data.length > 0) {
      console.log(`   ✓ First user (page 2): ${localResponse2.data[0].userName || 'N/A'}`);
      console.log(`   ✓ Last user (page 2): ${localResponse2.data[localResponse2.data.length - 1].userName || 'N/A'}`);
    }
    console.log('');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ⚠️ Local server not running, skipping...\n');
    } else {
      console.error('   ❌ Error:', error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data:`, error.response.data?.substring?.(0, 200) || error.response.data);
      }
      console.log('');
    }
  }
  
  // Test 3: Vercel API endpoint
  console.log('3. Testing Vercel API endpoint:');
  console.log(`   URL: ${VERCEL_API}/api/leaderboard/users?timePeriod=ALL&limit=100&offset=0\n`);
  
  try {
    const vercelResponse1 = await axios.get(`${VERCEL_API}/api/leaderboard/users`, {
      params: {
        timePeriod: 'ALL',
        limit: 100,
        offset: 0,
      },
      timeout: 15000,
    });
    
    console.log(`   ✓ Status: ${vercelResponse1.status}`);
    console.log(`   ✓ Data points: ${vercelResponse1.data?.length || 0}`);
    if (vercelResponse1.data && vercelResponse1.data.length > 0) {
      console.log(`   ✓ First user: ${vercelResponse1.data[0].userName || 'N/A'}`);
      console.log(`   ✓ Last user: ${vercelResponse1.data[vercelResponse1.data.length - 1].userName || 'N/A'}`);
    }
    console.log('');
    
    // Test second page
    console.log(`   Testing page 2: ${VERCEL_API}/api/leaderboard/users?timePeriod=ALL&limit=100&offset=100\n`);
    const vercelResponse2 = await axios.get(`${VERCEL_API}/api/leaderboard/users`, {
      params: {
        timePeriod: 'ALL',
        limit: 100,
        offset: 100,
      },
      timeout: 15000,
    });
    
    console.log(`   ✓ Status: ${vercelResponse2.status}`);
    console.log(`   ✓ Data points: ${vercelResponse2.data?.length || 0}`);
    if (vercelResponse2.data && vercelResponse2.data.length > 0) {
      console.log(`   ✓ First user (page 2): ${vercelResponse2.data[0].userName || 'N/A'}`);
      console.log(`   ✓ Last user (page 2): ${vercelResponse2.data[vercelResponse2.data.length - 1].userName || 'N/A'}`);
    }
    console.log('');
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, typeof error.response.data === 'string' 
        ? error.response.data.substring(0, 200) 
        : JSON.stringify(error.response.data).substring(0, 200));
    }
    console.log('');
  }
  
  // Test 4: Simulate frontend pagination
  console.log('4. Simulating frontend pagination (fetching multiple pages):\n');
  
  try {
    const allUsers = [];
    const limit = 100;
    
    for (let page = 0; page < 2; page++) {
      const offset = page * limit;
      console.log(`   Fetching page ${page + 1} (offset: ${offset})...`);
      
      const response = await axios.get(`${POLYMARKET_DATA_API}/v1/leaderboard`, {
        params: {
          timePeriod: 'all',
          orderBy: 'VOL',
          limit,
          offset,
          category: 'overall',
        },
        timeout: 10000,
      });
      
      const users = response.data || [];
      console.log(`   ✓ Got ${users.length} users`);
      
      if (users.length === 0) {
        console.log('   ⚠️ No more users, stopping...');
        break;
      }
      
      allUsers.push(...users);
      
      if (users.length < limit) {
        console.log('   ⚠️ Got less than limit, no more pages');
        break;
      }
    }
    
    console.log(`\n   ✓ Total users fetched: ${allUsers.length}`);
    console.log(`   ✓ Unique users: ${new Set(allUsers.map(u => u.user || u.walletAddress)).size}`);
    console.log('');
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    console.log('');
  }
  
  console.log('✅ Testing complete!');
}

testUsersPagination().catch(console.error);

