/**
 * Test script to check if /activity API supports date/time filtering
 * Run with: node api/test-activity-date-filter.js
 */

import axios from 'axios';

const DATA_API = "https://data-api.polymarket.com";
const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

async function testDateFiltering() {
  console.log('🧪 Testing /activity API for Date Filtering\n');
  console.log('='.repeat(80));
  
  // Test different parameter combinations
  const tests = [
    { name: 'Default (offset 0)', params: { user: TEST_ADDRESS, limit: 10, offset: 0 } },
    { name: 'High offset (10000)', params: { user: TEST_ADDRESS, limit: 10, offset: 10000 } },
    { name: 'Very high offset (50000)', params: { user: TEST_ADDRESS, limit: 10, offset: 50000 } },
    { name: 'With startTime', params: { user: TEST_ADDRESS, limit: 10, offset: 0, startTime: 1625097600 } }, // Jul 1, 2021
    { name: 'With endTime', params: { user: TEST_ADDRESS, limit: 10, offset: 0, endTime: 1730419200 } }, // Nov 1, 2024
    { name: 'With before timestamp', params: { user: TEST_ADDRESS, limit: 10, offset: 0, before: 1730419200 } },
    { name: 'With after timestamp', params: { user: TEST_ADDRESS, limit: 10, offset: 0, after: 1625097600 } },
    { name: 'With fromTimestamp', params: { user: TEST_ADDRESS, limit: 10, offset: 0, fromTimestamp: 1625097600 } },
    { name: 'With toTimestamp', params: { user: TEST_ADDRESS, limit: 10, offset: 0, toTimestamp: 1730419200 } }
  ];
  
  for (const test of tests) {
    console.log(`\n📊 Test: ${test.name}`);
    console.log(`   Params:`, JSON.stringify(test.params, null, 2));
    
    try {
      const response = await axios.get(`${DATA_API}/activity`, {
        params: test.params,
        timeout: 5000
      });
      
      const events = response.data || [];
      console.log(`   ✓ Success: ${events.length} events returned`);
      
      if (events.length > 0) {
        const timestamps = events.map(e => e.timestamp);
        const dates = events.map(e => new Date(e.timestamp * 1000).toISOString().split('T')[0]);
        console.log(`   First event: ${dates[0]} (timestamp: ${timestamps[0]})`);
        console.log(`   Last event: ${dates[dates.length - 1]} (timestamp: ${timestamps[timestamps.length - 1]})`);
      }
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 FINDINGS:');
  console.log('If max offset (10,000) works, API can return up to 20,500 events.');
  console.log('If date filtering works, we can fetch ALL historical data in chunks.');
  console.log('Otherwise, we can only get the most recent ~20,000-50,000 events.');
  console.log('='.repeat(80));
}

testDateFiltering().catch(console.error);

