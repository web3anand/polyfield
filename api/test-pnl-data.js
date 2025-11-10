/**
 * Test script to check the actual PnL data being generated
 * Run with: node api/test-pnl-data.js
 */

import axios from 'axios';

const PNL_SUBGRAPH = "https://api.goldsky.com/api/public/project_clzxeqkixjz2v01x1e7i82mhq/subgraphs/polymarket-pnl-prod/latest/gn";
const DATA_API = "https://data-api.polymarket.com";
const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

const COLLATERAL_SCALE = 1_000_000;

async function testPnLData() {
  console.log('🧪 Testing PnL Data Generation\n');
  console.log('='.repeat(80));
  
  // 1. Fetch subgraph data (accurate realized PnL)
  console.log('\n📊 Step 1: Fetching subgraph data (all closed positions)...\n');
  
  let allSubgraphPositions = [];
  let skip = 0;
  const pageSize = 1000;
  
  while (skip < 10000) {
    try {
      const response = await axios.post(PNL_SUBGRAPH, {
        query: `query UserPositions($user: String!, $skip: Int!) {
          userPositions(where: { user: $user }, first: ${pageSize}, skip: $skip, orderBy: realizedPnl, orderDirection: desc) {
            id
            tokenId
            amount
            avgPrice
            realizedPnl
            totalBought
          }
        }`,
        variables: { user: TEST_ADDRESS.toLowerCase(), skip }
      });
      
      const positions = response.data.data?.userPositions || [];
      if (positions.length === 0) break;
      
      allSubgraphPositions = allSubgraphPositions.concat(positions);
      skip += pageSize;
      
      if (positions.length < pageSize) break;
      
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error('Error:', error.message);
      break;
    }
  }
  
  // Calculate realized PnL
  let totalRealizedPnL = 0;
  let closedPositionsCount = 0;
  
  allSubgraphPositions.forEach(pos => {
    const pnl = parseFloat(pos.realizedPnl || '0') / COLLATERAL_SCALE;
    if (Math.abs(pnl) > 0.01) {
      totalRealizedPnL += pnl;
      closedPositionsCount++;
    }
  });
  
  console.log(`✓ Fetched ${allSubgraphPositions.length} positions from subgraph`);
  console.log(`✓ Closed positions count: ${closedPositionsCount}`);
  console.log(`✓ Total Realized PnL: $${totalRealizedPnL.toFixed(2)}`);
  
  // 2. Fetch closed positions with dates (API limited to 25)
  console.log('\n\n📊 Step 2: Fetching closed positions with dates from API...\n');
  
  try {
    const response = await axios.get(`${DATA_API}/closed-positions`, {
      params: {
        user: TEST_ADDRESS,
        limit: 500,
        offset: 0,
        sortBy: 'REALIZEDPNL',
        sortDirection: 'DESC'
      },
      timeout: 10000
    });
    
    const closedPositions = response.data || [];
    console.log(`✓ Fetched ${closedPositions.length} positions with dates`);
    
    // Show date range
    const withDates = closedPositions.filter(p => p.endDate);
    console.log(`✓ Positions with dates: ${withDates.length}`);
    
    if (withDates.length > 0) {
      const dates = withDates.map(p => p.endDate).sort();
      console.log(`\nDate range from API:`);
      console.log(`  Earliest: ${dates[0]}`);
      console.log(`  Latest: ${dates[dates.length - 1]}`);
      
      // Check for future dates
      const now = new Date();
      const futureDates = withDates.filter(p => new Date(p.endDate) > now);
      console.log(`\n⚠ Positions with FUTURE dates: ${futureDates.length}`);
      
      if (futureDates.length > 0) {
        console.log('\nFuture dated positions:');
        futureDates.slice(0, 5).forEach(p => {
          console.log(`  - ${p.title} (${p.outcome})`);
          console.log(`    Date: ${p.endDate} (${Math.round((new Date(p.endDate) - now) / (24*60*60*1000))} days in future)`);
          console.log(`    PnL: $${p.realizedPnl?.toFixed(2) || 0}`);
        });
      }
      
      // Calculate cumulative PnL from these 25 positions
      const sortedByDate = withDates
        .filter(p => new Date(p.endDate) <= now) // Filter out future dates
        .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
      
      let cumulative = 0;
      const timeline = sortedByDate.map(p => {
        cumulative += p.realizedPnl || 0;
        return {
          date: p.endDate,
          pnl: p.realizedPnl || 0,
          cumulative: cumulative,
          title: p.title
        };
      });
      
      console.log(`\n\n📈 Cumulative PnL from 25 API positions (past dates only):`);
      console.log(`  First: ${timeline[0]?.date} = $${timeline[0]?.cumulative.toFixed(2)}`);
      console.log(`  Last: ${timeline[timeline.length - 1]?.date} = $${timeline[timeline.length - 1]?.cumulative.toFixed(2)}`);
      console.log(`  Sum: $${timeline.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)}`);
      
      console.log(`\n⚠ PROBLEM: API positions sum = $${timeline.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)}`);
      console.log(`  But actual realized PnL from subgraph = $${totalRealizedPnL.toFixed(2)}`);
      console.log(`  Missing: $${(totalRealizedPnL - timeline.reduce((sum, t) => sum + t.pnl, 0)).toFixed(2)}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // 3. Fetch unrealized PnL
  console.log('\n\n📊 Step 3: Fetching unrealized PnL...\n');
  
  try {
    const response = await axios.get(`${DATA_API}/positions`, {
      params: {
        user: TEST_ADDRESS,
        includeInactive: false
      },
      timeout: 10000
    });
    
    const positions = response.data || [];
    let unrealizedPnL = 0;
    
    positions.forEach(pos => {
      unrealizedPnL += pos.cashPnl || 0;
    });
    
    console.log(`✓ Open positions: ${positions.length}`);
    console.log(`✓ Unrealized PnL: $${unrealizedPnL.toFixed(2)}`);
    
    const totalPnL = totalRealizedPnL + unrealizedPnL;
    console.log(`\n✓ Total PnL: $${totalPnL.toFixed(2)}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Test Complete');
  console.log('='.repeat(80));
  
  console.log('\n\n💡 SOLUTION:');
  console.log('  1. The /closed-positions API only returns 25 positions (not all 5,243)');
  console.log('  2. Some positions have FUTURE end dates (market end dates, not closure dates)');
  console.log('  3. We need to use the subgraph for accurate realized PnL total');
  console.log('  4. We need to fetch activity events to get actual closure timestamps');
  console.log('  5. The 25 API positions are not sufficient for a complete timeline');
}

testPnLData().catch(console.error);

