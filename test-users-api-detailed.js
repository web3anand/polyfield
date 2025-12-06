import axios from 'axios';

const LOCAL_API = "http://localhost:3000";

async function testDetailed() {
  console.log('🧪 Detailed Users API Test\n');
  
  // Test fetching multiple pages
  console.log('Testing pagination with multiple requests:\n');
  
  const allUsers = [];
  const limit = 50;
  
  for (let page = 0; page < 3; page++) {
    const offset = page * limit;
    console.log(`Page ${page + 1} (offset: ${offset}):`);
    
    try {
      const response = await axios.get(`${LOCAL_API}/api/leaderboard/users`, {
        params: {
          timePeriod: 'ALL',
          limit: limit,
          offset: offset,
        },
        timeout: 10000,
      });
      
      const users = response.data || [];
      console.log(`  ✓ Status: ${response.status}`);
      console.log(`  ✓ Users returned: ${users.length}`);
      
      if (users.length > 0) {
        console.log(`  ✓ First user: ${users[0].userName} (rank: ${users[0].rank})`);
        console.log(`  ✓ Last user: ${users[users.length - 1].userName} (rank: ${users[users.length - 1].rank})`);
        
        // Check for duplicates
        const userNames = users.map(u => u.userName || u.walletAddress);
        const uniqueNames = new Set(userNames);
        if (userNames.length !== uniqueNames.size) {
          console.log(`  ⚠️ WARNING: Found ${userNames.length - uniqueNames.size} duplicate users in this page!`);
        }
      }
      
      allUsers.push(...users);
      console.log(`  ✓ Total users so far: ${allUsers.length}\n`);
      
      if (users.length < limit) {
        console.log(`  ⚠️ Got less than limit (${users.length} < ${limit}), stopping...\n`);
        break;
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('  ⚠️ Local server not running\n');
        break;
      }
      console.error(`  ❌ Error: ${error.message}`);
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
      }
      break;
    }
  }
  
  // Check for duplicates across all pages
  console.log('\nChecking for duplicates across all pages:');
  const allUserIds = allUsers.map(u => u.walletAddress || u.userName);
  const uniqueIds = new Set(allUserIds);
  console.log(`  Total users: ${allUsers.length}`);
  console.log(`  Unique users: ${uniqueIds.size}`);
  
  if (allUsers.length !== uniqueIds.size) {
    console.log(`  ⚠️ WARNING: Found ${allUsers.length - uniqueIds.size} duplicate users!`);
    
    // Find duplicates
    const duplicates = [];
    const seen = new Map();
    allUsers.forEach((user, index) => {
      const id = user.walletAddress || user.userName;
      if (seen.has(id)) {
        duplicates.push({
          userName: user.userName,
          rank: user.rank,
          firstSeen: seen.get(id),
          duplicateAt: index
        });
      } else {
        seen.set(id, index);
      }
    });
    
    if (duplicates.length > 0) {
      console.log(`  Duplicate users:`);
      duplicates.slice(0, 5).forEach(dup => {
        console.log(`    - ${dup.userName} (rank ${dup.rank})`);
      });
    }
  } else {
    console.log(`  ✓ No duplicates found!`);
  }
  
  // Check rank continuity
  console.log('\nChecking rank continuity:');
  const ranks = allUsers.map(u => parseInt(u.rank) || 0).filter(r => r > 0);
  if (ranks.length > 0) {
    const minRank = Math.min(...ranks);
    const maxRank = Math.max(...ranks);
    console.log(`  Rank range: ${minRank} to ${maxRank}`);
    console.log(`  Expected users: ${maxRank - minRank + 1}`);
    console.log(`  Actual users: ${ranks.length}`);
    
    if (ranks.length !== maxRank - minRank + 1) {
      console.log(`  ⚠️ WARNING: Rank gap detected!`);
    }
  }
  
  console.log('\n✅ Test complete!');
}

testDetailed().catch(console.error);

