/**
 * Test script to fetch ALL activity events and calculate PnL
 * Run with: node api/test-fetch-all-trades.js
 */

import axios from 'axios';

const DATA_API = "https://data-api.polymarket.com";
const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

async function fetchAllActivityEvents() {
  console.log('🧪 Fetching ALL Activity Events\n');
  console.log('='.repeat(80));
  
  const allEvents = [];
  const pageSize = 500;
  let offset = 0;
  let hasMore = true;
  const startTime = Date.now();
  
  while (hasMore && offset < 50000) { // Max 50k events (100 pages)
    try {
      console.log(`📊 Fetching page ${Math.floor(offset / pageSize) + 1} (offset: ${offset})...`);
      
      const response = await axios.get(`${DATA_API}/activity`, {
        params: {
          user: TEST_ADDRESS,
          limit: pageSize,
          offset: offset
        },
        timeout: 10000
      });
      
      const events = response.data || [];
      
      if (events.length === 0) {
        console.log(`   ✓ No more events (empty page). Stopping.`);
        hasMore = false;
        break;
      }
      
      allEvents.push(...events);
      console.log(`   ✓ Fetched ${events.length} events (total: ${allEvents.length})`);
      
      if (events.length < pageSize) {
        console.log(`   ✓ Last page (${events.length} < ${pageSize}). Stopping.`);
        hasMore = false;
        break;
      }
      
      offset += pageSize;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error at offset ${offset}:`, error.message);
      hasMore = false;
      break;
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Fetch complete: ${allEvents.length} total events in ${elapsed}s`);
  
  // Analyze events
  console.log('\n' + '='.repeat(80));
  console.log('📊 EVENT ANALYSIS');
  console.log('='.repeat(80));
  
  // Event types
  const eventTypes = {};
  allEvents.forEach(e => {
    const type = e.type || 'UNKNOWN';
    eventTypes[type] = (eventTypes[type] || 0) + 1;
  });
  
  console.log('\n📝 Event Types:');
  Object.entries(eventTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  // Trade events by side
  const tradeEvents = allEvents.filter(e => e.type === 'TRADE');
  const buys = tradeEvents.filter(e => e.side === 'BUY');
  const sells = tradeEvents.filter(e => e.side === 'SELL');
  
  console.log(`\n📈 Trade Events:`);
  console.log(`  Total TRADE events: ${tradeEvents.length}`);
  console.log(`  BUY side: ${buys.length}`);
  console.log(`  SELL side: ${sells.length}`);
  
  // Date range
  const timestamps = tradeEvents
    .map(e => e.timestamp)
    .filter(t => t)
    .sort((a, b) => a - b);
  
  if (timestamps.length > 0) {
    const firstDate = new Date(timestamps[0] * 1000).toISOString();
    const lastDate = new Date(timestamps[timestamps.length - 1] * 1000).toISOString();
    
    console.log(`\n📅 Date Range:`);
    console.log(`  First trade: ${firstDate}`);
    console.log(`  Last trade: ${lastDate}`);
    console.log(`  Duration: ${Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / (24 * 60 * 60))} days`);
  }
  
  // Calculate PnL from FIFO matching
  console.log('\n' + '='.repeat(80));
  console.log('💰 PnL CALCULATION (FIFO METHOD)');
  console.log('='.repeat(80));
  
  // Group by asset
  const tradesByAsset = new Map();
  tradeEvents.forEach(trade => {
    const asset = trade.asset;
    if (!asset) return;
    
    if (!tradesByAsset.has(asset)) {
      tradesByAsset.set(asset, []);
    }
    tradesByAsset.get(asset).push(trade);
  });
  
  console.log(`\n✓ Trades across ${tradesByAsset.size} unique assets`);
  
  // Calculate realized PnL
  const realizedPnLEvents = [];
  
  tradesByAsset.forEach((assetTrades) => {
    // Sort by timestamp
    assetTrades.sort((a, b) => a.timestamp - b.timestamp);
    
    // FIFO queue
    const buyQueue = [];
    
    assetTrades.forEach(trade => {
      const side = (trade.side || '').toUpperCase();
      const size = parseFloat(trade.size || 0);
      const usdcSize = parseFloat(trade.usdcSize || 0);
      
      if (side === 'BUY') {
        buyQueue.push({ size, costBasis: usdcSize });
      } else if (side === 'SELL') {
        let remainingSize = size;
        let totalCost = 0;
        
        while (remainingSize > 0.000001 && buyQueue.length > 0) {
          const oldestBuy = buyQueue[0];
          const avgCostPerToken = oldestBuy.costBasis / oldestBuy.size;
          const matchSize = Math.min(remainingSize, oldestBuy.size);
          
          totalCost += matchSize * avgCostPerToken;
          
          oldestBuy.size -= matchSize;
          oldestBuy.costBasis -= matchSize * avgCostPerToken;
          remainingSize -= matchSize;
          
          if (oldestBuy.size <= 0.000001) {
            buyQueue.shift();
          }
        }
        
        const realizedPnL = usdcSize - totalCost;
        
        if (Math.abs(realizedPnL) > 0.01) {
          realizedPnLEvents.push({
            timestamp: trade.timestamp,
            pnl: realizedPnL,
            market: trade.title,
            outcome: trade.outcome
          });
        }
      }
    });
  });
  
  // Sort and calculate cumulative
  realizedPnLEvents.sort((a, b) => a.timestamp - b.timestamp);
  
  let cumulativePnL = 0;
  const timeline = [];
  
  realizedPnLEvents.forEach((event, idx) => {
    cumulativePnL += event.pnl;
    
    if (idx % 50 === 0 || idx === realizedPnLEvents.length - 1) {
      timeline.push({
        date: new Date(event.timestamp * 1000).toISOString().split('T')[0],
        cumulative: cumulativePnL,
        pnl: event.pnl
      });
    }
  });
  
  console.log(`\n✓ Calculated ${realizedPnLEvents.length} realized PnL events from SELL trades`);
  console.log(`✓ Total realized PnL: $${cumulativePnL.toFixed(2)}`);
  
  if (timeline.length > 0) {
    console.log(`\n📈 Timeline (showing ${timeline.length} sample points):`);
    console.log(`  First: ${timeline[0].date} = $${timeline[0].cumulative.toFixed(2)}`);
    console.log(`  Last:  ${timeline[timeline.length - 1].date} = $${timeline[timeline.length - 1].cumulative.toFixed(2)}`);
    
    // Show progression
    console.log(`\n  Progression (every ${Math.floor(timeline.length / 5)} points):`);
    for (let i = 0; i < timeline.length; i += Math.floor(timeline.length / 5)) {
      const point = timeline[i];
      console.log(`    ${point.date}: $${point.cumulative.toFixed(2)}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Test Complete');
  console.log('='.repeat(80));
}

fetchAllActivityEvents().catch(console.error);

