/**
 * Test script to explore the Polymarket PnL Subgraph schema for trade history
 * Run with: node api/test-subgraph-trades.js
 */

import axios from 'axios';

const PNL_SUBGRAPH = 'https://api.goldsky.com/api/public/project_clzxeqkixjz2v01x1e7i82mhq/subgraphs/polymarket-pnl-prod/latest/gn';
const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

async function testSubgraphSchema() {
  console.log('🧪 Testing Polymarket PnL Subgraph for Trade History\n');
  console.log('='.repeat(80));
  
  // Test: Check userPositions with all available fields
  console.log('\n📊 Query userPositions to see available fields...\n');
  
  try {
    const response = await axios.post(PNL_SUBGRAPH, {
      query: `
        query UserPositions($user: String!) {
          userPositions(where: { user: $user }, first: 2, orderBy: realizedPnl, orderDirection: desc) {
            id
            user
            tokenId
            amount
            avgPrice
            realizedPnl
            totalBought
           totalSold
          }
        }
      `,
      variables: { user: TEST_ADDRESS.toLowerCase() }
    }, { timeout: 10000 });
    
    if (response.data.errors) {
      console.error('❌ Error:', JSON.stringify(response.data.errors, null, 2));
    } else {
      console.log('✅ UserPositions sample (first 2 positions):');
      console.log(JSON.stringify(response.data.data.userPositions, null, 2));
      
      const totalPositions = response.data.data.userPositions.length;
      console.log(`\n✓ Retrieved ${totalPositions} sample positions`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 CONCLUSION:');
  console.log('The PnL subgraph has userPositions with realized PnL but NO timestamps.');
  console.log('We need to use the /activity API which has timestamps for all trades.');
  console.log('\nThe solution is to:');
  console.log('1. Accept that /activity API max offset is 10,000 (= 20,000 events max)');
  console.log('2. Fetch as many as possible within this limit');
  console.log('3. OR use a time-based filter if the API supports it');
  console.log('4. OR combine: use subgraph for total PnL + activity for recent timeline');
  console.log('='.repeat(80));
}

testSubgraphSchema().catch(console.error);
