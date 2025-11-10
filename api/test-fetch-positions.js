/**
 * Test script to fetch closed positions one by one in batches
 * Run with: node api/test-fetch-positions.js
 */

import axios from 'axios';

const DATA_API = "https://data-api.polymarket.com";
const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

async function testFetchPositions() {
  console.log('🧪 Testing Closed Positions API Fetching\n');
  console.log('='.repeat(80));
  console.log(`Test Address: ${TEST_ADDRESS}\n`);
  
  const results = {
    totalFetched: 0,
    uniquePositions: new Set(),
    positionsByOffset: [],
    apiResponses: [],
    errors: []
  };
  
  // Test 1: Fetch with offset 0, limit 500
  console.log('📊 Test 1: Fetching first batch (offset: 0, limit: 500)');
  console.log('-'.repeat(80));
  
  try {
    const response1 = await axios.get(`${DATA_API}/closed-positions`, {
      params: {
        user: TEST_ADDRESS,
        limit: 500,
        offset: 0,
        sortBy: 'REALIZEDPNL',
        sortDirection: 'DESC'
      },
      timeout: 10000
    });
    
    console.log('Response status:', response1.status);
    console.log('Response headers:', JSON.stringify(response1.headers, null, 2));
    console.log('\nResponse data structure:');
    console.log('- Is array?', Array.isArray(response1.data));
    console.log('- Has data property?', !!response1.data?.data);
    console.log('- Has results property?', !!response1.data?.results);
    console.log('- Has items property?', !!response1.data?.items);
    console.log('- Has totalCount?', !!response1.data?.totalCount);
    console.log('- Has total?', !!response1.data?.total);
    console.log('- Has count?', !!response1.data?.count);
    
    const data = response1.data?.data || response1.data || [];
    const actualData = Array.isArray(data) ? data : [];
    
    console.log(`\n✓ Fetched ${actualData.length} positions`);
    
    if (actualData.length > 0) {
      console.log('\nFirst position sample:');
      console.log(JSON.stringify(actualData[0], null, 2));
      
      console.log('\nPosition keys:', Object.keys(actualData[0]));
      
      // Check for endDate
      const hasEndDate = actualData.some(p => p.endDate);
      console.log(`\nPositions with endDate: ${actualData.filter(p => p.endDate).length}/${actualData.length}`);
      
      if (hasEndDate) {
        const dates = actualData.filter(p => p.endDate).map(p => p.endDate);
        console.log('\nDate range:');
        console.log(`  Earliest: ${dates.sort()[0]}`);
        console.log(`  Latest: ${dates.sort().reverse()[0]}`);
      }
    }
    
    results.totalFetched = actualData.length;
    results.apiResponses.push({
      offset: 0,
      limit: 500,
      returned: actualData.length,
      structure: {
        isArray: Array.isArray(response1.data),
        hasData: !!response1.data?.data,
        hasResults: !!response1.data?.results,
        totalCount: response1.data?.totalCount || response1.data?.total || response1.data?.count
      }
    });
    
    actualData.forEach((pos, idx) => {
      results.uniquePositions.add(pos.id || pos.tokenId || `${pos.endDate}-${idx}`);
      results.positionsByOffset.push({ offset: 0, position: pos });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    results.errors.push({ offset: 0, error: error.message });
  }
  
  // Test 2: Fetch with offset 500, limit 500
  console.log('\n\n📊 Test 2: Fetching second batch (offset: 500, limit: 500)');
  console.log('-'.repeat(80));
  
  try {
    const response2 = await axios.get(`${DATA_API}/closed-positions`, {
      params: {
        user: TEST_ADDRESS,
        limit: 500,
        offset: 500,
        sortBy: 'REALIZEDPNL',
        sortDirection: 'DESC'
      },
      timeout: 10000
    });
    
    const data2 = response2.data?.data || response2.data || [];
    const actualData2 = Array.isArray(data2) ? data2 : [];
    
    console.log(`✓ Fetched ${actualData2.length} positions`);
    
    if (actualData2.length > 0) {
      console.log('\nFirst position in this batch:');
      console.log(JSON.stringify(actualData2[0], null, 2));
      
      // Check if duplicates
      const duplicateCount = actualData2.filter(p => 
        results.uniquePositions.has(p.id || p.tokenId || `${p.endDate}-0`)
      ).length;
      console.log(`\nDuplicate positions: ${duplicateCount}/${actualData2.length}`);
    }
    
    results.totalFetched += actualData2.length;
    results.apiResponses.push({
      offset: 500,
      limit: 500,
      returned: actualData2.length,
      structure: {
        isArray: Array.isArray(response2.data),
        hasData: !!response2.data?.data,
        totalCount: response2.data?.totalCount || response2.data?.total || response2.data?.count
      }
    });
    
    actualData2.forEach((pos, idx) => {
      results.uniquePositions.add(pos.id || pos.tokenId || `${pos.endDate}-${results.totalFetched + idx}`);
      results.positionsByOffset.push({ offset: 500, position: pos });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    results.errors.push({ offset: 500, error: error.message });
  }
  
  // Test 3: Fetch with offset 1000, limit 500
  console.log('\n\n📊 Test 3: Fetching third batch (offset: 1000, limit: 500)');
  console.log('-'.repeat(80));
  
  try {
    const response3 = await axios.get(`${DATA_API}/closed-positions`, {
      params: {
        user: TEST_ADDRESS,
        limit: 500,
        offset: 1000,
        sortBy: 'REALIZEDPNL',
        sortDirection: 'DESC'
      },
      timeout: 10000
    });
    
    const data3 = response3.data?.data || response3.data || [];
    const actualData3 = Array.isArray(data3) ? data3 : [];
    
    console.log(`✓ Fetched ${actualData3.length} positions`);
    
    results.totalFetched += actualData3.length;
    results.apiResponses.push({
      offset: 1000,
      limit: 500,
      returned: actualData3.length,
      structure: {
        isArray: Array.isArray(response3.data),
        hasData: !!response3.data?.data,
        totalCount: response3.data?.totalCount || response3.data?.total || response3.data?.count
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    results.errors.push({ offset: 1000, error: error.message });
  }
  
  // Test 4: Try without sortBy parameter
  console.log('\n\n📊 Test 4: Fetching without sortBy (offset: 0, limit: 500)');
  console.log('-'.repeat(80));
  
  try {
    const response4 = await axios.get(`${DATA_API}/closed-positions`, {
      params: {
        user: TEST_ADDRESS,
        limit: 500,
        offset: 0
        // No sortBy parameter
      },
      timeout: 10000
    });
    
    const data4 = response4.data?.data || response4.data || [];
    const actualData4 = Array.isArray(data4) ? data4 : [];
    
    console.log(`✓ Fetched ${actualData4.length} positions without sortBy`);
    
    results.apiResponses.push({
      offset: 0,
      limit: 500,
      returned: actualData4.length,
      noSortBy: true,
      structure: {
        isArray: Array.isArray(response4.data),
        hasData: !!response4.data?.data,
        totalCount: response4.data?.totalCount || response4.data?.total || response4.data?.count
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    results.errors.push({ offset: 0, error: error.message, noSortBy: true });
  }
  
  // Test 5: Try with different sortBy (ENDDATE)
  console.log('\n\n📊 Test 5: Fetching with sortBy=ENDDATE (offset: 0, limit: 500)');
  console.log('-'.repeat(80));
  
  try {
    const response5 = await axios.get(`${DATA_API}/closed-positions`, {
      params: {
        user: TEST_ADDRESS,
        limit: 500,
        offset: 0,
        sortBy: 'ENDDATE',
        sortDirection: 'DESC'
      },
      timeout: 10000
    });
    
    const data5 = response5.data?.data || response5.data || [];
    const actualData5 = Array.isArray(data5) ? data5 : [];
    
    console.log(`✓ Fetched ${actualData5.length} positions with sortBy=ENDDATE`);
    
    results.apiResponses.push({
      offset: 0,
      limit: 500,
      returned: actualData5.length,
      sortBy: 'ENDDATE',
      structure: {
        isArray: Array.isArray(response5.data),
        hasData: !!response5.data?.data,
        totalCount: response5.data?.totalCount || response5.data?.total || response5.data?.count
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    results.errors.push({ offset: 0, error: error.message, sortBy: 'ENDDATE' });
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total positions fetched: ${results.totalFetched}`);
  console.log(`Unique positions: ${results.uniquePositions.size}`);
  console.log(`API responses: ${results.apiResponses.length}`);
  console.log(`Errors: ${results.errors.length}`);
  
  console.log('\nAPI Response Details:');
  results.apiResponses.forEach((resp, idx) => {
    console.log(`\nResponse ${idx + 1}:`);
    console.log(`  Offset: ${resp.offset}, Limit: ${resp.limit}, Returned: ${resp.returned}`);
    console.log(`  Structure:`, resp.structure);
    if (resp.sortBy) console.log(`  SortBy: ${resp.sortBy}`);
    if (resp.noSortBy) console.log(`  No sortBy parameter`);
  });
  
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach((err, idx) => {
      console.log(`\nError ${idx + 1}:`);
      console.log(`  Offset: ${err.offset}`);
      console.log(`  Message: ${err.error}`);
      if (err.sortBy) console.log(`  SortBy: ${err.sortBy}`);
    });
  }
  
  // Calculate realized PnL from fetched positions
  if (results.positionsByOffset.length > 0) {
    console.log('\n\n📊 PnL Calculation from Fetched Positions:');
    console.log('-'.repeat(80));
    
    const positionsWithPnL = results.positionsByOffset
      .map(r => r.position)
      .filter(p => p.realizedPnl !== undefined && p.realizedPnl !== null);
    
    const totalRealizedPnL = positionsWithPnL.reduce((sum, p) => {
      return sum + (parseFloat(p.realizedPnl || 0));
    }, 0);
    
    console.log(`Positions with realizedPnl: ${positionsWithPnL.length}`);
    console.log(`Total realized PnL: $${totalRealizedPnL.toFixed(2)}`);
    
    // Group by date
    const positionsWithDate = results.positionsByOffset
      .map(r => r.position)
      .filter(p => p.endDate);
    
    if (positionsWithDate.length > 0) {
      const dates = positionsWithDate.map(p => p.endDate).sort();
      console.log(`\nDate range:`);
      console.log(`  Earliest: ${dates[0]}`);
      console.log(`  Latest: ${dates[dates.length - 1]}`);
      console.log(`  Unique dates: ${new Set(dates).size}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Test Complete');
  console.log('='.repeat(80));
}

// Run the test
testFetchPositions().catch(console.error);

