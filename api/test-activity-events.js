/**
 * Test script to check activity events for position closure timestamps
 * Run with: node api/test-activity-events.js
 */

import axios from 'axios';

const DATA_API = "https://data-api.polymarket.com";
const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

async function testActivityEvents() {
  console.log('🧪 Testing Activity Events for Closure Timestamps\n');
  console.log('='.repeat(80));
  
  console.log('\n📊 Fetching first 500 activity events...\n');
  
  try {
    const response = await axios.get(`${DATA_API}/activity`, {
      params: {
        user: TEST_ADDRESS,
        limit: 500,
        offset: 0
      },
      timeout: 10000
    });
    
    const events = response.data || [];
    console.log(`✓ Fetched ${events.length} events`);
    
    // Show first event structure
    if (events.length > 0) {
      console.log('\n📝 First event structure:');
      console.log(JSON.stringify(events[0], null, 2));
      console.log('\nEvent keys:', Object.keys(events[0]));
    }
    
    // Categorize events
    const eventTypes = {};
    events.forEach(e => {
      const type = e.type || e.action || 'UNKNOWN';
      eventTypes[type] = (eventTypes[type] || 0) + 1;
    });
    
    console.log('\n\n📊 Event Types:');
    Object.entries(eventTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // Find SELL events (position closures)
    const sellEvents = events.filter(e => {
      const type = (e.type || e.action || '').toUpperCase();
      return type === 'SELL' || type === 'SELL_ORDER' || type === 'CLOSE' || type === 'CLOSED';
    });
    
    console.log(`\n\n✓ Found ${sellEvents.length} SELL events`);
    
    if (sellEvents.length > 0) {
      console.log('\n📝 Sample SELL event:');
      console.log(JSON.stringify(sellEvents[0], null, 2));
      
      // Check for timestamps
      const withTimestamp = sellEvents.filter(e => e.timestamp || e.createdAt || e.date || e.time);
      console.log(`\n✓ SELL events with timestamp: ${withTimestamp.length}/${sellEvents.length}`);
      
      // Check for PnL data
      const withPnl = sellEvents.filter(e => e.realizedPnl || e.pnl || e.profit);
      console.log(`✓ SELL events with PnL: ${withPnl.length}/${sellEvents.length}`);
      
      // Build timeline from SELL events
      if (withTimestamp.length > 0) {
        const sorted = withTimestamp
          .map(e => ({
            timestamp: e.timestamp || e.createdAt || e.date || e.time,
            pnl: parseFloat(e.realizedPnl || e.pnl || e.profit || 0),
            market: e.market?.question || e.marketName || 'Unknown',
            outcome: e.outcome || e.side || ''
          }))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        console.log('\n\n📈 Timeline from SELL events:');
        console.log(`  First: ${sorted[0].timestamp} = $${sorted[0].pnl.toFixed(2)} (${sorted[0].market})`);
        console.log(`  Last: ${sorted[sorted.length - 1].timestamp} = $${sorted[sorted.length - 1].pnl.toFixed(2)} (${sorted[sorted.length - 1].market})`);
        
        const totalFromSells = sorted.reduce((sum, e) => sum + e.pnl, 0);
        console.log(`  Total PnL from ${sorted.length} SELL events: $${totalFromSells.toFixed(2)}`);
        
        // Check date range
        const dates = sorted.map(e => e.timestamp);
        console.log(`\n  Date range:`);
        console.log(`    Earliest: ${dates[0]}`);
        console.log(`    Latest: ${dates[dates.length - 1]}`);
        
        // Check for future dates
        const now = new Date();
        const futureDates = sorted.filter(e => new Date(e.timestamp) > now);
        console.log(`\n  Future dated events: ${futureDates.length}`);
      }
    }
    
    // Test pagination - fetch next page
    console.log('\n\n📊 Testing pagination (offset 500)...\n');
    
    const response2 = await axios.get(`${DATA_API}/activity`, {
      params: {
        user: TEST_ADDRESS,
        limit: 500,
        offset: 500
      },
      timeout: 10000
    });
    
    const events2 = response2.data || [];
    console.log(`✓ Fetched ${events2.length} events from offset 500`);
    
    // Check for duplicates
    const ids1 = new Set(events.map(e => e.id || e.txHash || JSON.stringify(e)));
    const ids2 = new Set(events2.map(e => e.id || e.txHash || JSON.stringify(e)));
    const duplicates = events2.filter(e => ids1.has(e.id || e.txHash || JSON.stringify(e)));
    console.log(`✓ Duplicates: ${duplicates.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Test Complete');
  console.log('='.repeat(80));
}

testActivityEvents().catch(console.error);

