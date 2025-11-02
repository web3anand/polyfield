import axios from 'axios';

const POLYMARKET_DATA_API = "https://data-api.polymarket.com";
const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";

// Helper to find user by username
async function findUserByUsername(username) {
  try {
    const response = await axios.get(`${POLYMARKET_GAMMA_API}/public-search`, {
      params: {
        q: username,
        search_profiles: true,
      },
      timeout: 5000,
    });

    let profiles = [];

    if (Array.isArray(response.data)) {
      profiles = response.data;
    } else if (response.data?.profiles && Array.isArray(response.data.profiles)) {
      profiles = response.data.profiles;
    }

    if (profiles.length > 0) {
      const profile = profiles.find(p => 
        p.username?.toLowerCase() === username.toLowerCase() ||
        p.display_name?.toLowerCase() === username.toLowerCase()
      ) || profiles[0];

      return {
        wallet: profile.proxyWallet || profile.wallet || profile.address,
        profileImage: profile.profileImage || profile.profile_image_url || profile.avatar_url,
        bio: profile.bio || profile.description
      };
    }

    throw new Error('No profiles found');
  } catch (error) {
    console.error('Error searching for user:', error);
    throw error;
  }
}

// Test fetching closed positions
async function testBestTrade(username) {
  console.log(`\n🧪 Testing Best Trade calculation for: ${username}\n`);
  
  try {
    // Find user
    const userInfo = await findUserByUsername(username);
    console.log(`✓ Found wallet: ${userInfo.wallet}\n`);
    
    // Fetch closed positions with different limits and sort orders
    console.log('📊 Fetching closed positions...\n');
    
    const response = await axios.get(`${POLYMARKET_DATA_API}/closed-positions`, {
      params: {
        user: userInfo.wallet,
        limit: 500,
        offset: 0,
        sortBy: 'REALIZEDPNL',
        sortDirection: 'DESC'
      },
      timeout: 10000
    });
    
    const positions = response.data || [];
    console.log(`✓ Fetched ${positions.length} closed positions\n`);
    
    if (positions.length === 0) {
      console.log('❌ No closed positions found');
      return;
    }
    
    // Log first position structure
    console.log('📋 First Position Structure:');
    console.log(JSON.stringify(positions[0], null, 2));
    console.log('\n');
    
    // Extract all possible PnL fields from first position
    console.log('🔍 Checking all PnL-related fields in first position:');
    const firstPos = positions[0];
    const pnlFields = {};
    for (const key in firstPos) {
      if (key.toLowerCase().includes('pnl') || key.toLowerCase().includes('profit') || key.toLowerCase().includes('win')) {
        pnlFields[key] = firstPos[key];
      }
    }
    console.log(JSON.stringify(pnlFields, null, 2));
    console.log('\n');
    
    // Try different extraction methods
    console.log('🧮 Testing different extraction methods:\n');
    
    const methods = [
      { name: 'realizedPnl', extract: (p) => parseFloat(p.realizedPnl || 0) },
      { name: 'realized_pnl', extract: (p) => parseFloat(p.realized_pnl || 0) },
      { name: 'realizedPnL', extract: (p) => parseFloat(p.realizedPnL || 0) },
      { name: 'pnl', extract: (p) => parseFloat(p.pnl || 0) },
      { name: 'realizedPnlValue', extract: (p) => parseFloat(p.realizedPnlValue || 0) },
      { name: 'profit', extract: (p) => parseFloat(p.profit || 0) },
      { name: 'all numeric fields', extract: (p) => {
        // Try to find any positive number that could be PnL
        for (const key in p) {
          const val = parseFloat(p[key]);
          if (!isNaN(val) && val > 0 && val < 1000) return val;
        }
        return 0;
      }}
    ];
    
    for (const method of methods) {
      const winningPositions = positions
        .map(pos => ({ ...pos, pnlValue: method.extract(pos) }))
        .filter(pos => pos.pnlValue > 0)
        .sort((a, b) => b.pnlValue - a.pnlValue);
      
      if (winningPositions.length > 0) {
        const best = winningPositions[0].pnlValue;
        console.log(`  ${method.name}: $${best.toFixed(2)} (from ${winningPositions.length} winning positions)`);
        if (winningPositions.length >= 3) {
          console.log(`    Top 3: $${winningPositions.slice(0, 3).map(p => p.pnlValue.toFixed(2)).join(', $')}`);
        }
      } else {
        console.log(`  ${method.name}: No winning positions found`);
      }
    }
    
    console.log('\n');
    
    // Show all positions with positive PnL (first 10)
    console.log('💰 All Winning Positions (Top 10):');
    const allWins = positions
      .map(pos => {
        // Try all extraction methods and use the highest
        let maxPnl = 0;
        for (const method of methods.slice(0, 6)) { // Skip the "all numeric" one
          const pnl = method.extract(pos);
          if (pnl > maxPnl) maxPnl = pnl;
        }
        return { ...pos, calculatedPnl: maxPnl };
      })
      .filter(pos => pos.calculatedPnl > 0)
      .sort((a, b) => b.calculatedPnl - a.calculatedPnl)
      .slice(0, 10);
    
    allWins.forEach((pos, idx) => {
      console.log(`  ${idx + 1}. $${pos.calculatedPnl.toFixed(2)} - ${pos.title || pos.marketName || 'Unknown'}`);
      console.log(`     Fields: realizedPnl=${pos.realizedPnl}, realized_pnl=${pos.realized_pnl}, pnl=${pos.pnl}`);
    });
    
    console.log('\n');
    
    // Expected result check
    const expectedBest = 8.51;
    const foundBest = allWins.length > 0 ? allWins[0].calculatedPnl : 0;
    
    console.log(`🎯 Expected: $${expectedBest.toFixed(2)}`);
    console.log(`📊 Found: $${foundBest.toFixed(2)}`);
    if (Math.abs(foundBest - expectedBest) < 0.01) {
      console.log('✅ MATCH! Found the correct value!');
    } else {
      console.log('❌ MISMATCH - Need to check data source');
      
      // Check if $8.51 exists in any position
      const has851 = positions.some(pos => {
        const values = [
          parseFloat(pos.realizedPnl || 0),
          parseFloat(pos.realized_pnl || 0),
          parseFloat(pos.pnl || 0),
          parseFloat(pos.profit || 0)
        ];
        return values.some(v => Math.abs(v - 8.51) < 0.01);
      });
      
      if (has851) {
        console.log('   ✓ $8.51 exists in the data - field name issue');
      } else {
        console.log('   ✗ $8.51 NOT found in fetched positions');
        console.log('   May need to fetch more positions or use different endpoint');
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run test
const username = process.argv[2] || 'imdaybot';
testBestTrade(username).then(() => {
  console.log('\n✅ Test complete\n');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});

