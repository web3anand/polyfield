/**
 * Test script to find the COMPLETE date range available in /trades endpoint
 * Run with: node api/test-trades-full-history.js
 */

import axios from 'axios';

const DATA_API = "https://data-api.polymarket.com";
const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

async function testFullHistory() {
  console.log('🧪 Testing /trades Endpoint for FULL Historical Range\n');
  console.log('='.repeat(80));
  
  // Keep fetching until we find the absolute end
  console.log('\n📊 Fetching trades to find the complete date range...\n');
  
  let offset = 0;
  const pageSize = 500;
  let earliestDate = null;
  let latestDate = null;
  let totalTrades = 0;
  const maxIterations = 500; // Max 250k trades (500 pages)
  let iteration = 0;
  
  while (iteration < maxIterations) {
    try {
      const response = await axios.get(`${DATA_API}/trades`, {
        params: {
          user: TEST_ADDRESS,
          limit: pageSize,
          offset: offset
        },
        timeout: 10000
      });
      
      const trades = response.data || [];
      
      if (trades.length === 0) {
        console.log(`\n✓ Reached end of data at offset ${offset}`);
        break;
      }
      
      totalTrades += trades.length;
      
      // Track date range
      trades.forEach(t => {
        const date = new Date(t.timestamp * 1000);
        if (!earliestDate || date < earliestDate) earliestDate = date;
        if (!latestDate || date > latestDate) latestDate = date;
      });
      
      // Log progress every 50k trades
      if (offset % 50000 === 0) {
        console.log(`   Progress: ${totalTrades} trades, earliest: ${earliestDate?.toISOString().split('T')[0]}, latest: ${latestDate?.toISOString().split('T')[0]}`);
      }
      
      if (trades.length < pageSize) {
        console.log(`\n✓ Last page found (${trades.length} trades)`);
        break;
      }
      
      offset += pageSize;
      iteration++;
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.error(`❌ Error at offset ${offset}:`, error.message);
      break;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPLETE RESULTS');
  console.log('='.repeat(80));
  console.log(`Total trades fetched: ${totalTrades.toLocaleString()}`);
  
  if (earliestDate && latestDate) {
    console.log(`\n📅 Complete Date Range:`);
    console.log(`   Earliest trade: ${earliestDate.toISOString()}`);
    console.log(`   Latest trade: ${latestDate.toISOString()}`);
    
    const daysSpan = Math.round((latestDate - earliestDate) / (24 * 60 * 60 * 1000));
    console.log(`   Total duration: ${daysSpan} days`);
    
    // Check if this is all available data
    if (daysSpan < 365) {
      console.log(`\n⚠ WARNING: Only ${daysSpan} days of data available!`);
      console.log(`   This user may have older trades that the API doesn't return.`);
      console.log(`   Possible reasons:`);
      console.log(`   1. API only stores recent data (e.g., last 3-6 months)`);
      console.log(`   2. Need to query blockchain directly for older data`);
      console.log(`   3. Use GraphQL subgraph if it has historical data`);
    } else {
      console.log(`\n✅ Good! Have ${Math.round(daysSpan / 365 * 10) / 10} years of data`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Test: Check if there's older data by querying with date filters
  console.log('\n📊 Testing if older data exists with date filters...\n');
  
  const oldTimestamps = [
    { name: '1 year ago', ts: Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60) },
    { name: '2 years ago', ts: Math.floor(Date.now() / 1000) - (2 * 365 * 24 * 60 * 60) },
    { name: 'Jan 2024', ts: new Date('2024-01-01').getTime() / 1000 },
    { name: 'Jan 2023', ts: new Date('2023-01-01').getTime() / 1000 }
  ];
  
  for (const test of oldTimestamps) {
    try {
      const response = await axios.get(`${DATA_API}/trades`, {
        params: {
          user: TEST_ADDRESS,
          limit: 10,
          before: test.ts
        },
        timeout: 5000
      });
      
      const trades = response.data || [];
      if (trades.length > 0) {
        const oldestTrade = trades[trades.length - 1];
        const tradeDate = new Date(oldestTrade.timestamp * 1000).toISOString().split('T')[0];
        console.log(`   ${test.name}: Found ${trades.length} trades, oldest: ${tradeDate}`);
      } else {
        console.log(`   ${test.name}: No trades found`);
      }
    } catch (error) {
      console.log(`   ${test.name}: Error - ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Test Complete');
  console.log('='.repeat(80));
}

testFullHistory().catch(console.error);

