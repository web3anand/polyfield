/**
 * Test which subgraph URL is correct
 * Run with: node api/test-subgraph-url.js
 */

import axios from 'axios';

const TEST_ADDRESS = '0x24c8d8e3d4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e978d';
const COLLATERAL_SCALE = 1000000;

const SUBGRAPHS = [
  {
    name: 'Current (line 3)',
    url: 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/pnl-subgraph/0.0.14/gn'
  },
  {
    name: 'Alternative 1',
    url: 'https://api.goldsky.com/api/public/project_clzxeqkixjz2v01x1e7i82mhq/subgraphs/polymarket-pnl-prod/latest/gn'
  },
  {
    name: 'Alternative 2',
    url: 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/pnl-subgraph/latest/gn'
  }
];

async function testSubgraph() {
  console.log('🧪 Testing Subgraph URLs\n');
  console.log('='.repeat(80));
  console.log(`Test Address: ${TEST_ADDRESS}\n`);
  
  for (const subgraph of SUBGRAPHS) {
    console.log(`\n📊 Testing: ${subgraph.name}`);
    console.log(`   URL: ${subgraph.url}`);
    
    try {
      const response = await axios.post(subgraph.url, {
        query: `query UserPositions($user: String!, $skip: Int!) {
          userPositions(where: { user: $user }, first: 10, skip: 0, orderBy: realizedPnl, orderDirection: desc) {
            id
            tokenId
            amount
            avgPrice
            realizedPnl
            totalBought
          }
        }`,
        variables: { user: TEST_ADDRESS.toLowerCase(), skip: 0 }
      }, { timeout: 10000 });
      
      if (response.data.errors) {
        console.log(`   ❌ GraphQL Error: ${response.data.errors[0].message}`);
      } else {
        const positions = response.data.data?.userPositions || [];
        console.log(`   ✅ SUCCESS: Found ${positions.length} positions`);
        
        if (positions.length > 0) {
          let totalRealizedPnL = 0;
          positions.forEach(pos => {
            const pnl = parseFloat(pos.realizedPnl || '0') / COLLATERAL_SCALE;
            if (Math.abs(pnl) > 0.01) {
              totalRealizedPnL += pnl;
            }
          });
          
          console.log(`   📊 Sample PnL: $${totalRealizedPnL.toFixed(2)}`);
          console.log(`   📝 First position:`, JSON.stringify(positions[0], null, 2));
        }
      }
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ HTTP ${error.response.status}: ${JSON.stringify(error.response.data)?.substring(0, 200)}`);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Test Complete');
  console.log('='.repeat(80));
}

testSubgraph().catch(console.error);

