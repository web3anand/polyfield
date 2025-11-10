/**
 * Test script to verify PnL data fetching and calculation
 * Run with: npx ts-node api/test-pnl.ts
 */

import { fetchUserPnLData, generateFullPnLHistory, fetchClosedPositionsHistory } from './utils/polymarket-pnl.js';

const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

async function testPnLCalculation() {
  console.log('🧪 Testing PnL Data Fetching and Calculation\n');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Fetch closed positions history
    console.log('\n📊 Test 1: Fetching Closed Positions History');
    console.log('-'.repeat(60));
    const closedPositions = await fetchClosedPositionsHistory(TEST_ADDRESS, 10000);
    console.log(`✓ Fetched ${closedPositions.length} closed positions`);
    
    if (closedPositions.length > 0) {
      const firstPos = closedPositions[0];
      const lastPos = closedPositions[closedPositions.length - 1];
      console.log(`✓ First position date: ${firstPos.endDate}`);
      console.log(`✓ Last position date: ${lastPos.endDate}`);
      
      // Calculate sum of realized PnL
      const sumRealizedPnL = closedPositions.reduce((sum, pos) => sum + (pos.realizedPnl || 0), 0);
      console.log(`✓ Sum of realized PnL from fetched positions: $${sumRealizedPnL.toFixed(2)}`);
      
      // Check for duplicates
      const uniqueDates = new Set(closedPositions.map(p => p.endDate));
      console.log(`✓ Unique dates: ${uniqueDates.size} out of ${closedPositions.length} positions`);
      
      // Group by date to see if multiple positions on same day
      const positionsByDate = new Map<string, number>();
      closedPositions.forEach(pos => {
        const dateKey = new Date(pos.endDate!).toISOString().split('T')[0];
        positionsByDate.set(dateKey, (positionsByDate.get(dateKey) || 0) + 1);
      });
      
      const multiPositionDates = Array.from(positionsByDate.entries())
        .filter(([_, count]) => count > 1)
        .slice(0, 10);
      
      if (multiPositionDates.length > 0) {
        console.log(`✓ Found ${multiPositionDates.length} dates with multiple positions (showing first 10):`);
        multiPositionDates.forEach(([date, count]) => {
          console.log(`  - ${date}: ${count} positions`);
        });
      }
    }
    
    // Test 2: Fetch full PnL data
    console.log('\n📊 Test 2: Fetching Full PnL Data');
    console.log('-'.repeat(60));
    const pnlData = await fetchUserPnLData(TEST_ADDRESS, true);
    
    console.log(`✓ Realized PnL: $${pnlData.realizedPnl.toFixed(2)}`);
    console.log(`✓ Unrealized PnL: $${pnlData.unrealizedPnl.toFixed(2)}`);
    console.log(`✓ Total PnL: $${pnlData.totalPnl.toFixed(2)}`);
    console.log(`✓ Closed Positions Count: ${pnlData.closedPositions}`);
    console.log(`✓ Closed Positions History Length: ${pnlData.closedPositionsHistory?.length || 0}`);
    
    // Test 3: Generate PnL history
    console.log('\n📊 Test 3: Generating PnL History');
    console.log('-'.repeat(60));
    const pnlHistory = generateFullPnLHistory(
      pnlData.fullActivityHistory || [],
      pnlData.closedPositionsHistory || [],
      pnlData.totalPnl
    );
    
    console.log(`✓ Generated ${pnlHistory.length} data points`);
    
    if (pnlHistory.length > 0) {
      const firstPoint = pnlHistory[0];
      const lastPoint = pnlHistory[pnlHistory.length - 1];
      const maxPoint = pnlHistory.reduce((max, p) => p.value > max.value ? p : max, pnlHistory[0]);
      const minPoint = pnlHistory.reduce((min, p) => p.value < min.value ? p : min, pnlHistory[0]);
      
      console.log(`✓ First point: ${new Date(firstPoint.timestamp).toLocaleString()} - $${firstPoint.value.toFixed(2)}`);
      console.log(`✓ Last point: ${new Date(lastPoint.timestamp).toLocaleString()} - $${lastPoint.value.toFixed(2)}`);
      console.log(`✓ Max value: $${maxPoint.value.toFixed(2)}`);
      console.log(`✓ Min value: $${minPoint.value.toFixed(2)}`);
      console.log(`✓ Expected total PnL: $${pnlData.totalPnl.toFixed(2)}`);
      console.log(`✓ Actual last point value: $${lastPoint.value.toFixed(2)}`);
      
      const difference = Math.abs(lastPoint.value - pnlData.totalPnl);
      if (difference > 0.01) {
        console.log(`\n⚠️  WARNING: Last point value ($${lastPoint.value.toFixed(2)}) does not match total PnL ($${pnlData.totalPnl.toFixed(2)})`);
        console.log(`   Difference: $${difference.toFixed(2)}`);
      } else {
        console.log(`\n✓ SUCCESS: Last point matches total PnL`);
      }
      
      // Check cumulative calculation
      console.log('\n📊 Checking Cumulative Calculation:');
      console.log('-'.repeat(60));
      
      // Calculate what the cumulative should be from closed positions
      const sortedPositions = (pnlData.closedPositionsHistory || [])
        .filter(p => p.endDate)
        .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime());
      
      let cumulativeRealized = 0;
      sortedPositions.forEach(pos => {
        cumulativeRealized += pos.realizedPnl || 0;
      });
      
      console.log(`✓ Cumulative realized PnL from closed positions: $${cumulativeRealized.toFixed(2)}`);
      console.log(`✓ Expected realized PnL: $${pnlData.realizedPnl.toFixed(2)}`);
      
      if (Math.abs(cumulativeRealized - pnlData.realizedPnl) > 0.01) {
        console.log(`\n⚠️  WARNING: Cumulative realized PnL mismatch!`);
        console.log(`   Calculated: $${cumulativeRealized.toFixed(2)}`);
        console.log(`   Expected: $${pnlData.realizedPnl.toFixed(2)}`);
        console.log(`   Missing positions: ${pnlData.closedPositions - sortedPositions.length} out of ${pnlData.closedPositions}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test Complete');
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

// Run the test
testPnLCalculation().catch(console.error);

