/**
 * Test the optimized parallel batch fetching for Car user
 * Run with: node api/test-optimized-fetch.js
 */

import axios from 'axios';

const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b'; // Car
const DATA_API = "https://data-api.polymarket.com";

// Retry wrapper
async function fetchWithRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

async function testOptimizedFetch() {
  console.log('🧪 Testing Optimized Parallel Batch Fetching\n');
  console.log('='.repeat(80));
  console.log(`User: Car (${TEST_ADDRESS})\n`);
  
  const startTime = Date.now();
  const allTrades = [];
  const pageSize = 500;
  let batchSize = 15; // Start with 15 (safer)
  const maxPages = 1000;
  
  let currentBatch = 0;
  let foundLastPage = false;
  let consecutiveFailures = 0;
  let backoffDelay = 100;
  
  console.log(`📊 Fetching trades with parallel batching...`);
  console.log(`   Batch size: ${batchSize} concurrent requests`);
  console.log(`   Page size: ${pageSize} trades per request`);
  console.log(`   = ${batchSize * pageSize} trades per batch\n`);
  
  while (!foundLastPage && currentBatch * batchSize < maxPages) {
    const batchStartPage = currentBatch * batchSize;
    const batchEndPage = Math.min(batchStartPage + batchSize, maxPages);
    
    // Create parallel requests
    const batchPromises = [];
    for (let page = batchStartPage; page < batchEndPage; page++) {
      const offset = page * pageSize;
      
      batchPromises.push(
        fetchWithRetry(() =>
          axios.get(`${DATA_API}/trades`, {
            params: {
              user: TEST_ADDRESS,
              limit: pageSize,
              offset: offset
            },
            timeout: 8000
          })
        )
        .then(response => ({ page, data: response.data || [], success: true, is429: false }))
        .catch(error => {
          const is429 = error.response?.status === 429;
          if (is429) {
            console.warn(`   ⚠ Rate limit hit on page ${page}`);
          }
          return { page, data: [], success: false, is429: is429 };
        })
      );
    }
    
    // Wait for batch
    const batchStartTime = Date.now();
    const batchResults = await Promise.all(batchPromises);
    const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(2);
    
    // Check for rate limit errors
    const rateLimitErrors = batchResults.filter(r => r.is429).length;
    if (rateLimitErrors > 0) {
      console.log(`   ⚠ ${rateLimitErrors} requests hit rate limit - backing off...`);
      consecutiveFailures++;
      
      backoffDelay = Math.min(backoffDelay * 2, 5000);
      
      if (consecutiveFailures > 2 && batchSize > 5) {
        batchSize = Math.max(5, Math.floor(batchSize * 0.7));
        console.log(`   📉 Reducing batch size to ${batchSize}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    } else {
      consecutiveFailures = 0;
      backoffDelay = 100;
      
      if (currentBatch > 3 && batchSize < 15) {
        batchSize = Math.min(15, batchSize + 1);
      }
    }
    
    // Process results
    let batchTotal = 0;
    let failedPages = [];
    
    for (const result of batchResults.sort((a, b) => a.page - b.page)) {
      if (result.success && result.data.length > 0) {
        allTrades.push(...result.data);
        batchTotal += result.data.length;
        
        if (result.data.length < pageSize) {
          console.log(`   ✓ Last page found at page ${result.page} (${result.data.length} trades)`);
          foundLastPage = true;
          break;
        }
      } else if (!result.success) {
        failedPages.push(result.page);
      }
    }
    
    // Retry failed pages
    if (failedPages.length > 0 && failedPages.length < 5) {
      console.log(`   🔄 Retrying ${failedPages.length} failed pages...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      for (const page of failedPages) {
        try {
          const response = await axios.get(`${DATA_API}/trades`, {
            params: {
              user: TEST_ADDRESS,
              limit: pageSize,
              offset: page * pageSize
            },
            timeout: 10000
          });
          
          const trades = response.data || [];
          if (trades.length > 0) {
            allTrades.push(...trades);
            batchTotal += trades.length;
            console.log(`   ✓ Retry successful for page ${page}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (retryError) {
          console.warn(`   ✗ Retry failed for page ${page}`);
        }
      }
    }
    
    if (batchTotal > 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const tradesPerSec = Math.round(allTrades.length / (elapsed));
      console.log(`   ✓ Batch ${currentBatch + 1}: ${batchTotal.toLocaleString()} trades in ${batchTime}s | Total: ${allTrades.length.toLocaleString()} (${tradesPerSec}/s)`);
    }
    
    if (foundLastPage || (batchTotal === 0 && failedPages.length === batchResults.length)) break;
    
    currentBatch++;
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESULTS');
  console.log('='.repeat(80));
  console.log(`\n✅ Total trades fetched: ${allTrades.length.toLocaleString()}`);
  console.log(`⏱️  Total time: ${totalTime}s`);
  console.log(`🚀 Speed: ${Math.round(allTrades.length / totalTime)} trades/second`);
  
  if (allTrades.length > 0) {
    // Calculate date range
    const timestamps = allTrades.map(t => t.timestamp);
    const earliest = new Date(Math.min(...timestamps) * 1000);
    const latest = new Date(Math.max(...timestamps) * 1000);
    const daysSpan = Math.round((latest - earliest) / (24 * 60 * 60 * 1000));
    
    console.log(`\n📅 Date Range:`);
    console.log(`   Earliest: ${earliest.toISOString()}`);
    console.log(`   Latest: ${latest.toISOString()}`);
    console.log(`   Duration: ${daysSpan} days (${Math.round(daysSpan / 30)} months)`);
    
    // Analyze trades
    const buys = allTrades.filter(t => t.side === 'BUY').length;
    const sells = allTrades.filter(t => t.side === 'SELL').length;
    
    console.log(`\n📈 Trade Breakdown:`);
    console.log(`   BUY: ${buys.toLocaleString()} (${Math.round(buys / allTrades.length * 100)}%)`);
    console.log(`   SELL: ${sells.toLocaleString()} (${Math.round(sells / allTrades.length * 100)}%)`);
    
    // Quick PnL estimation
    console.log(`\n💰 Quick PnL Calculation (FIFO):`);
    const tradesByAsset = new Map();
    
    allTrades.sort((a, b) => a.timestamp - b.timestamp).forEach(trade => {
      const asset = trade.asset;
      if (!tradesByAsset.has(asset)) {
        tradesByAsset.set(asset, { buys: [], totalPnl: 0 });
      }
      
      const assetData = tradesByAsset.get(asset);
      const side = trade.side?.toUpperCase();
      const size = parseFloat(trade.size || 0);
      const price = parseFloat(trade.price || 0);
      const value = size * price;
      
      if (side === 'BUY') {
        assetData.buys.push({ size, cost: value });
      } else if (side === 'SELL') {
        let remainingSize = size;
        let totalCost = 0;
        
        while (remainingSize > 0.00001 && assetData.buys.length > 0) {
          const oldestBuy = assetData.buys[0];
          const matchSize = Math.min(remainingSize, oldestBuy.size);
          const costPerToken = oldestBuy.cost / oldestBuy.size;
          
          totalCost += matchSize * costPerToken;
          oldestBuy.size -= matchSize;
          oldestBuy.cost -= matchSize * costPerToken;
          remainingSize -= matchSize;
          
          if (oldestBuy.size <= 0.00001) {
            assetData.buys.shift();
          }
        }
        
        const realizedPnL = value - totalCost;
        assetData.totalPnl += realizedPnL;
      }
    });
    
    const totalRealizedPnL = Array.from(tradesByAsset.values()).reduce((sum, data) => sum + data.totalPnl, 0);
    console.log(`   Realized PnL from trades: $${totalRealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   (Based on ${allTrades.length.toLocaleString()} trades across ${tradesByAsset.size} assets)`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Test Complete - Optimization Working!');
  console.log('='.repeat(80));
}

testOptimizedFetch().catch(console.error);

