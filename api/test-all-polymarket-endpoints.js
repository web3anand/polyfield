/**
 * Test ALL Polymarket endpoints to find maximum data availability
 * Run with: node api/test-all-polymarket-endpoints.js
 */

import axios from 'axios';

const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';
const DATA_API = "https://data-api.polymarket.com";
const CLOB_API = "https://clob.polymarket.com";
const GAMMA_API = "https://gamma-api.polymarket.com";

async function testAllEndpoints() {
  console.log('🧪 Testing ALL Polymarket Endpoints for Maximum Data\n');
  console.log('='.repeat(80));
  
  const endpoints = [
    // Data API endpoints
    { name: 'trades', url: `${DATA_API}/trades`, params: { user: TEST_ADDRESS, limit: 1000, offset: 0 } },
    { name: 'activity', url: `${DATA_API}/activity`, params: { user: TEST_ADDRESS, limit: 1000, offset: 0 } },
    { name: 'positions', url: `${DATA_API}/positions`, params: { user: TEST_ADDRESS, limit: 1000 } },
    { name: 'closed-positions', url: `${DATA_API}/closed-positions`, params: { user: TEST_ADDRESS, limit: 1000, offset: 0 } },
    { name: 'orders', url: `${DATA_API}/orders`, params: { user: TEST_ADDRESS, limit: 1000 } },
    { name: 'fills', url: `${DATA_API}/fills`, params: { user: TEST_ADDRESS, limit: 1000 } },
    { name: 'user-trades', url: `${DATA_API}/user-trades`, params: { user: TEST_ADDRESS, limit: 1000 } },
    { name: 'user-activity', url: `${DATA_API}/user-activity`, params: { user: TEST_ADDRESS, limit: 1000 } },
    { name: 'history', url: `${DATA_API}/history`, params: { user: TEST_ADDRESS, limit: 1000 } },
    { name: 'trade-history', url: `${DATA_API}/trade-history`, params: { user: TEST_ADDRESS, limit: 1000 } },
    
    // Try with different limit values
    { name: 'trades (limit=5000)', url: `${DATA_API}/trades`, params: { user: TEST_ADDRESS, limit: 5000, offset: 0 } },
    { name: 'trades (limit=10000)', url: `${DATA_API}/trades`, params: { user: TEST_ADDRESS, limit: 10000, offset: 0 } },
    { name: 'activity (limit=5000)', url: `${DATA_API}/activity`, params: { user: TEST_ADDRESS, limit: 5000, offset: 0 } },
    
    // CLOB API (might need auth)
    { name: 'CLOB trades', url: `${CLOB_API}/trades`, params: { maker: TEST_ADDRESS, limit: 1000 } },
    { name: 'CLOB orders', url: `${CLOB_API}/orders`, params: { maker: TEST_ADDRESS, limit: 1000 } },
    
    // GAMMA API
    { name: 'GAMMA trades', url: `${GAMMA_API}/trades`, params: { user: TEST_ADDRESS, limit: 1000 } },
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📊 Testing: ${endpoint.name}`);
      console.log(`   URL: ${endpoint.url}`);
      console.log(`   Params:`, JSON.stringify(endpoint.params));
      
      const response = await axios.get(endpoint.url, {
        params: endpoint.params,
        timeout: 10000
      });
      
      const data = response.data;
      let count = 0;
      let hasTimestamps = false;
      let dateRange = null;
      
      if (Array.isArray(data)) {
        count = data.length;
        if (data.length > 0 && data[0].timestamp) {
          hasTimestamps = true;
          const timestamps = data.map(d => d.timestamp).filter(t => t);
          if (timestamps.length > 0) {
            const earliest = new Date(Math.min(...timestamps) * 1000).toISOString().split('T')[0];
            const latest = new Date(Math.max(...timestamps) * 1000).toISOString().split('T')[0];
            dateRange = `${earliest} to ${latest}`;
          }
        }
      }
      
      console.log(`   ✅ SUCCESS: ${count} records`);
      if (hasTimestamps) {
        console.log(`   📅 Date range: ${dateRange}`);
      }
      
      results.push({
        name: endpoint.name,
        success: true,
        count,
        hasTimestamps,
        dateRange,
        maxLimitTested: endpoint.params.limit
      });
      
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ Error ${error.response.status}: ${JSON.stringify(error.response.data)?.substring(0, 100)}`);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      results.push({
        name: endpoint.name,
        success: false,
        error: error.message
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 SUMMARY - WORKING ENDPOINTS');
  console.log('='.repeat(80));
  
  const working = results.filter(r => r.success && r.count > 0);
  working.sort((a, b) => b.count - a.count);
  
  working.forEach((r, idx) => {
    console.log(`\n${idx + 1}. ${r.name}`);
    console.log(`   Records: ${r.count.toLocaleString()}`);
    console.log(`   Max limit: ${r.maxLimitTested}`);
    if (r.hasTimestamps) {
      console.log(`   ✅ Has timestamps`);
      console.log(`   Date range: ${r.dateRange}`);
    }
  });
  
  console.log('\n\n' + '='.repeat(80));
  console.log('💡 RECOMMENDATION');
  console.log('='.repeat(80));
  
  if (working.length > 0) {
    const best = working[0];
    console.log(`\nBest endpoint: ${best.name}`);
    console.log(`Returns: ${best.count} records per request`);
    console.log(`\nTo fetch ALL data efficiently:`);
    console.log(`1. Use limit=${best.maxLimitTested} (tested max)`);
    console.log(`2. Fetch in parallel batches of 10 concurrent requests`);
    console.log(`3. Use offset pagination: 0, ${best.maxLimitTested}, ${best.maxLimitTested * 2}, ...`);
    console.log(`4. Continue until empty response`);
  }
  
  console.log('='.repeat(80));
}

testAllEndpoints().catch(console.error);

