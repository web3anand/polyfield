/**
 * Test script to check the /trades endpoint for complete history
 * Run with: node api/test-trades-endpoint.js
 */

import axios from 'axios';

const CLOB_API = "https://clob.polymarket.com";
const DATA_API = "https://data-api.polymarket.com";
const GAMMA_API = "https://gamma-api.polymarket.com";
const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

async function testTradesEndpoint() {
  console.log('🧪 Testing /trades Endpoint for Complete History\n');
  console.log('='.repeat(80));
  
  // Test different base URLs and endpoints
  const tests = [
    { name: 'CLOB API /trades', url: `${CLOB_API}/trades`, params: { maker: TEST_ADDRESS } },
    { name: 'DATA API /trades', url: `${DATA_API}/trades`, params: { user: TEST_ADDRESS } },
    { name: 'GAMMA API /trades', url: `${GAMMA_API}/trades`, params: { user: TEST_ADDRESS } },
    { name: 'CLOB API /trades with limit', url: `${CLOB_API}/trades`, params: { maker: TEST_ADDRESS, limit: 1000 } },
    { name: 'DATA API /trades with limit', url: `${DATA_API}/trades`, params: { user: TEST_ADDRESS, limit: 1000 } },
    { name: 'CLOB API /user/trades', url: `${CLOB_API}/user/trades`, params: { address: TEST_ADDRESS } },
    { name: 'CLOB API with makerAddress', url: `${CLOB_API}/trades`, params: { makerAddress: TEST_ADDRESS, limit: 1000 } },
  ];
  
  for (const test of tests) {
    console.log(`\n📊 Testing: ${test.name}`);
    console.log(`   URL: ${test.url}`);
    console.log(`   Params:`, JSON.stringify(test.params, null, 2));
    
    try {
      const response = await axios.get(test.url, {
        params: test.params,
        timeout: 10000
      });
      
      console.log(`   ✅ Success! Status: ${response.status}`);
      
      // Check response structure
      const data = response.data;
      if (Array.isArray(data)) {
        console.log(`   ✓ Array response with ${data.length} items`);
        if (data.length > 0) {
          console.log(`\n   First item keys:`, Object.keys(data[0]));
          console.log(`   First item sample:`, JSON.stringify(data[0], null, 2));
        }
      } else if (data && typeof data === 'object') {
        console.log(`   ✓ Object response`);
        console.log(`   Keys:`, Object.keys(data));
        
        if (data.data && Array.isArray(data.data)) {
          console.log(`   ✓ Contains data array with ${data.data.length} items`);
        } else if (data.trades && Array.isArray(data.trades)) {
          console.log(`   ✓ Contains trades array with ${data.trades.length} items`);
        }
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ Error ${error.response.status}: ${JSON.stringify(error.response.data)?.substring(0, 200)}`);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Test Complete');
  console.log('='.repeat(80));
}

testTradesEndpoint().catch(console.error);

