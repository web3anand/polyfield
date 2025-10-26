const axios = require('axios');

const USER_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b'; // car
const PNL_SUBGRAPH = 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/pnl-subgraph/0.0.14/gn';
const DATA_API = 'https://data-api.polymarket.com';
const COLLATERAL_SCALE = 1000000;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function testRealizedPnl() {
  console.log('\n=== Testing Realized PnL Fetch ===\n');
  
  let skip = 0, total = 0, positions = 0;
  let maxIterations = 10; // Limit for testing
  let iteration = 0;
  
  while (iteration < maxIterations) {
    iteration++;
    console.log(`Fetching batch ${iteration} (skip: ${skip})...`);
    
    const response = await axios.post(PNL_SUBGRAPH, {
      query: `query UserPositions($user: String!, $skip: Int!) {
        userPositions(where: { user: $user }, first: 1000, skip: $skip) {
          realizedPnl
        }
      }`,
      variables: { user: USER_ADDRESS.toLowerCase(), skip }
    });
    
    const batch = response.data.data?.userPositions || [];
    console.log(`  Received ${batch.length} positions`);
    
    if (batch.length === 0) {
      console.log('  No more positions found.');
      break;
    }
    
    batch.forEach(p => total += parseFloat(p.realizedPnl || 0));
    positions += batch.length;
    skip += 1000;
    await delay(100);
    
    if (batch.length < 1000) {
      console.log('  Last batch (less than 1000 positions)');
      break;
    }
  }
  
  const realizedPnl = total / COLLATERAL_SCALE;
  console.log(`\n✅ Results:`);
  console.log(`   Total Closed Positions: ${positions.toLocaleString()}`);
  console.log(`   Raw Total: ${total.toLocaleString()}`);
  console.log(`   Realized PnL: $${realizedPnl.toLocaleString()}\n`);
  
  return { realizedPnl, closedPositions: positions };
}

async function testUnrealizedPnl() {
  console.log('\n=== Testing Unrealized PnL Fetch ===\n');
  
  try {
    const response = await axios.get(`${DATA_API}/value`, {
      params: { user: USER_ADDRESS },
      timeout: 10000
    });
    
    console.log('Response received. Analyzing data...\n');
    
    const data = response.data;
    console.log('Response structure:', {
      isArray: Array.isArray(data),
      type: typeof data,
      keys: Object.keys(data || {}).slice(0, 10)
    });
    
    const positions = Array.isArray(data) ? data : [data];
    
    let totalValue = 0;
    let totalCost = 0;
    let openPositions = 0;
    
    positions.forEach((pos, idx) => {
      const value = parseFloat(String(pos.value || 0));
      const cost = parseFloat(String(pos.cost || value));
      
      if (idx < 5) {
        console.log(`Position ${idx + 1}:`, {
          value: value,
          cost: cost,
          keys: Object.keys(pos).slice(0, 10)
        });
      }
      
      totalValue += value;
      totalCost += cost;
      if (value > 0) openPositions++;
    });
    
    const unrealizedPnl = totalValue - totalCost;
    
    console.log(`\n✅ Results:`);
    console.log(`   Open Positions: ${openPositions}`);
    console.log(`   Total Value: $${totalValue.toLocaleString()}`);
    console.log(`   Total Cost: $${totalCost.toLocaleString()}`);
    console.log(`   Unrealized PnL: $${unrealizedPnl.toLocaleString()}\n`);
    
    return { 
      unrealizedPnl, 
      portfolioValue: totalValue, 
      openPositions 
    };
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data).slice(0, 200));
    }
    return { unrealizedPnl: 0, portfolioValue: 0, openPositions: 0 };
  }
}

async function testActivityFetch() {
  console.log('\n=== Testing Activity Fetch (for PnL History) ===\n');
  
  try {
    const response = await axios.get(`${DATA_API}/activity`, {
      params: {
        user: USER_ADDRESS,
        limit: 100,
        offset: 0
      },
      timeout: 10000
    });
    
    const activity = response.data || [];
    console.log(`Fetched ${activity.length} activity events\n`);
    
    if (activity.length > 0) {
      console.log('First 3 activities:');
      activity.slice(0, 3).forEach((act, idx) => {
        console.log(`\nActivity ${idx + 1}:`, {
          type: act.type,
          side: act.side,
          usdcSize: act.usdcSize,
          timestamp: act.timestamp,
          timestampDate: new Date(act.timestamp * 1000).toISOString(),
          keys: Object.keys(act).slice(0, 15)
        });
      });
      
      // Calculate simple PnL from activity
      let cashBalance = 0;
      let deposits = 0;
      let withdrawals = 0;
      
      activity.forEach(event => {
        const type = event.type?.toUpperCase();
        const usdcSize = parseFloat(event.usdcSize || "0");
        const side = event.side?.toUpperCase();

        if (type === "DEPOSIT" || (type === "CONVERSION" && usdcSize > 0)) {
          deposits += Math.abs(usdcSize);
          cashBalance += Math.abs(usdcSize);
        } else if (type === "WITHDRAW") {
          withdrawals += Math.abs(usdcSize);
          cashBalance -= Math.abs(usdcSize);
        } else if (type === "TRADE") {
          if (side === "BUY") {
            cashBalance -= usdcSize;
          } else if (side === "SELL") {
            cashBalance += usdcSize;
          }
        } else if (type === "REDEEM" || type === "REWARD" || type === "CLAIM") {
          cashBalance += usdcSize;
        } else if (type === "FEE") {
          cashBalance -= Math.abs(usdcSize);
        }
      });
      
      const netDeposits = deposits - withdrawals;
      const estimatedPnL = cashBalance - netDeposits;
      
      console.log(`\n✅ Estimated PnL from first 100 activities:`);
      console.log(`   Cash Balance: $${cashBalance.toLocaleString()}`);
      console.log(`   Deposits: $${deposits.toLocaleString()}`);
      console.log(`   Withdrawals: $${withdrawals.toLocaleString()}`);
      console.log(`   Net Deposits: $${netDeposits.toLocaleString()}`);
      console.log(`   Estimated PnL: $${estimatedPnL.toLocaleString()}\n`);
    }
    
    return activity;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return [];
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 POLYMARKET PNL DATA FETCH TEST');
  console.log('='.repeat(70));
  console.log(`User: ${USER_ADDRESS}\n`);
  
  try {
    const realizedData = await testRealizedPnl();
    const unrealizedData = await testUnrealizedPnl();
    const activityData = await testActivityFetch();
    
    const totalPnl = realizedData.realizedPnl + unrealizedData.unrealizedPnl;
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(70) + '\n');
    console.log(`Realized PnL (Closed):   $${realizedData.realizedPnl.toLocaleString()}`);
    console.log(`Unrealized PnL (Open):   $${unrealizedData.unrealizedPnl.toLocaleString()}`);
    console.log(`Total PnL:               $${totalPnl.toLocaleString()}`);
    console.log(`Portfolio Value:         $${unrealizedData.portfolioValue.toLocaleString()}`);
    console.log(`Closed Positions:        ${realizedData.closedPositions.toLocaleString()}`);
    console.log(`Open Positions:          ${unrealizedData.openPositions.toLocaleString()}`);
    console.log(`Activity Events Fetched: ${activityData.length}`);
    console.log('\n' + '='.repeat(70) + '\n');
    
  } catch (error) {
    console.error('❌ Fatal Error:', error);
  }
}

main();
