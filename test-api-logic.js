import axios from 'axios';

const POLYMARKET_DATA_API = "https://data-api.polymarket.com";
const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";

// Simulate the exact logic from api/dashboard/username.ts
async function testAPILogic(username) {
  console.log(`\n🧪 Testing API Logic for: ${username}\n`);
  
  try {
    // Step 1: Find user
    const searchResponse = await axios.get(`${POLYMARKET_GAMMA_API}/public-search`, {
      params: { q: username, search_profiles: true },
      timeout: 5000,
    });

    let profiles = [];
    if (Array.isArray(searchResponse.data)) {
      profiles = searchResponse.data;
    } else if (searchResponse.data?.profiles) {
      profiles = searchResponse.data.profiles;
    }

    const userInfo = profiles.find(p => 
      p.username?.toLowerCase() === username.toLowerCase() ||
      p.display_name?.toLowerCase() === username.toLowerCase()
    ) || profiles[0];

    const wallet = userInfo.proxyWallet || userInfo.wallet || userInfo.address;
    console.log(`✓ Wallet: ${wallet}\n`);

    // Step 2: Fetch closed positions (simulating extraClosedPositions)
    const extraClosedPositions = await axios.get(`${POLYMARKET_DATA_API}/closed-positions`, {
      params: {
        user: wallet,
        limit: 500,
        offset: 0,
        sortBy: 'REALIZEDPNL',
        sortDirection: 'DESC'
      },
      timeout: 5000
    }).catch(() => ({ data: [] }));

    const allClosedPositionsData = extraClosedPositions.data || [];
    console.log(`✓ Fetched ${allClosedPositionsData.length} closed positions\n`);

    // Step 3: Apply the exact logic from api/dashboard/username.ts
    let bestTrade = 0;
    let worstTrade = 0;
    
    if (allClosedPositionsData.length > 0) {
      const getRealizedPnl = (pos) => {
        if (typeof pos.realizedPnl === 'number') {
          return pos.realizedPnl;
        }
        return parseFloat(pos.realizedPnl || pos.realized_pnl || 0);
      };
      
      const winningPositions = allClosedPositionsData
        .map((pos) => ({
          original: pos,
          pnlValue: getRealizedPnl(pos)
        }))
        .filter((item) => item.pnlValue > 0)
        .sort((a, b) => b.pnlValue - a.pnlValue);
      
      if (winningPositions.length > 0) {
        bestTrade = winningPositions[0].pnlValue;
        const bestTitle = winningPositions[0].original.title || winningPositions[0].original.marketName || 'position';
        console.log(`✓ Biggest Win: $${bestTrade.toFixed(2)} from "${bestTitle}"`);
        if (winningPositions.length >= 3) {
          console.log(`  Top 3: ${winningPositions.slice(0, 3).map(p => `$${p.pnlValue.toFixed(2)}`).join(', ')}`);
        }
      }
      
      const allWithPnl = allClosedPositionsData.map((pos) => ({
        original: pos,
        pnlValue: getRealizedPnl(pos)
      }));
      
      const allSorted = [...allWithPnl].sort((a, b) => a.pnlValue - b.pnlValue);
      
      if (allSorted.length > 0) {
        worstTrade = allSorted[0].pnlValue;
        console.log(`✓ Biggest Loss: $${worstTrade.toFixed(2)}`);
      }
    }

    console.log(`\n📊 Final Result:`);
    console.log(`   Best Trade: $${bestTrade.toFixed(2)}`);
    console.log(`   Worst Trade: $${worstTrade.toFixed(2)}`);
    
    // Verification
    const expectedBest = 8.51;
    if (Math.abs(bestTrade - expectedBest) < 0.01) {
      console.log(`\n✅ SUCCESS! Best trade matches expected value ($8.51)`);
      return true;
    } else {
      console.log(`\n❌ MISMATCH! Expected $${expectedBest.toFixed(2)}, got $${bestTrade.toFixed(2)}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
    }
    return false;
  }
}

// Run test
const username = process.argv[2] || 'imdaybot';
testAPILogic(username).then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});

