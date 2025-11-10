/**
 * Test script to check /trades endpoint pagination and data range
 * Run with: node api/test-trades-pagination.js
 */

import axios from 'axios';

const DATA_API = "https://data-api.polymarket.com";
const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

async function testTradesPagination() {
  console.log('🧪 Testing /trades Endpoint Pagination\n');
  console.log('='.repeat(80));
  
  // Test pagination with different offsets
  const offsets = [0, 500, 1000, 5000, 10000, 20000, 50000];
  
  for (const offset of offsets) {
    console.log(`\n📊 Testing offset: ${offset}`);
    
    try {
      const response = await axios.get(`${DATA_API}/trades`, {
        params: {
          user: TEST_ADDRESS,
          limit: 500,
          offset: offset
        },
        timeout: 10000
      });
      
      const trades = response.data || [];
      console.log(`   ✓ Returned ${trades.length} trades`);
      
      if (trades.length > 0) {
        const timestamps = trades.map(t => t.timestamp);
        const dates = timestamps.map(ts => new Date(ts * 1000).toISOString().split('T')[0]);
        
        console.log(`   First trade: ${dates[0]} (timestamp: ${timestamps[0]})`);
        console.log(`   Last trade: ${dates[dates.length - 1]} (timestamp: ${timestamps[timestamps.length - 1]})`);
        
        // Calculate PnL estimation from usdcSize if available
        const sample = trades[0];
        console.log(`   Sample trade:`, {
          side: sample.side,
          price: sample.price,
          size: sample.size,
          title: sample.title?.substring(0, 50)
        });
      } else {
        console.log(`   ⚠ No trades returned`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Now fetch ALL trades
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 Fetching ALL trades...\n');
  
  const allTrades = [];
  let offset = 0;
  const pageSize = 500;
  let hasMore = true;
  
  while (hasMore && offset < 100000) {
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
        console.log(`✓ Reached end at offset ${offset}`);
        hasMore = false;
        break;
      }
      
      allTrades.push(...trades);
      
      if (offset % 5000 === 0) {
        console.log(`   Progress: ${allTrades.length} trades fetched (offset: ${offset})...`);
      }
      
      if (trades.length < pageSize) {
        console.log(`✓ Last page (${trades.length} trades)`);
        hasMore = false;
        break;
      }
      
      offset += pageSize;
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`❌ Error at offset ${offset}: ${error.message}`);
      hasMore = false;
      break;
    }
  }
  
  console.log(`\n✅ Total trades fetched: ${allTrades.length}`);
  
  if (allTrades.length > 0) {
    const timestamps = allTrades.map(t => t.timestamp).sort((a, b) => a - b);
    const firstDate = new Date(timestamps[0] * 1000).toISOString().split('T')[0];
    const lastDate = new Date(timestamps[timestamps.length - 1] * 1000).toISOString().split('T')[0];
    
    console.log(`\n📅 Date Range:`);
    console.log(`   First trade: ${firstDate}`);
    console.log(`   Last trade: ${lastDate}`);
    console.log(`   Duration: ${Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / (24 * 60 * 60))} days`);
    
    // Count by side
    const buys = allTrades.filter(t => t.side === 'BUY').length;
    const sells = allTrades.filter(t => t.side === 'SELL').length;
    console.log(`\n📈 Trade Breakdown:`);
    console.log(`   BUY: ${buys}`);
    console.log(`   SELL: ${sells}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Test Complete');
  console.log('='.repeat(80));
}

testTradesPagination().catch(console.error);

