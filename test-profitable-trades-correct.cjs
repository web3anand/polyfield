/**
 * Test script for profitable trades calculation
 * Uses the /closed-positions endpoint to get accurate buy/sell values
 * 
 * Buy Amount = avgPrice * totalBought
 * Sell Amount = Buy Amount + realizedPnl (for profitable trades)
 * Net Profit = realizedPnl
 */

const axios = require('axios');

const DATA_API = 'https://data-api.polymarket.com';

async function getWalletAddress(username) {
  try {
    const response = await axios.get('https://gamma-api.polymarket.com/public-search', {
      params: {
        q: username,
        search_profiles: true,
      },
      timeout: 10000
    });
    
    let profiles = [];
    if (response.data?.profiles && Array.isArray(response.data.profiles)) {
      profiles = response.data.profiles;
    } else if (Array.isArray(response.data)) {
      profiles = response.data;
    }
    
    if (profiles.length > 0) {
      const profile = profiles.find(p => {
        const profileName = p.name || p.pseudonym || p.username || p.display_name || p.displayName || p.handle;
        return profileName?.toLowerCase() === username.toLowerCase();
      }) || profiles[0];
      
      const wallet = profile.proxyWallet || profile.wallet || profile.address || profile.walletAddress;
      return wallet;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user:', error.message);
    return null;
  }
}

async function fetchClosedPositions(walletAddress, limit = 100) {
  console.log(`\n📊 Fetching closed positions for wallet: ${walletAddress}`);
  console.log(`   Limit: ${limit}\n`);
  
  try {
    const allPositions = [];
    let offset = 0;
    const pageSize = 100;
    
    while (allPositions.length < limit) {
      const response = await axios.get(`${DATA_API}/closed-positions`, {
        params: {
          user: walletAddress,
          limit: pageSize,
          offset: offset
        },
        timeout: 10000
      });
      
      const batch = response.data || [];
      if (batch.length === 0) break;
      
      allPositions.push(...batch);
      console.log(`   Fetched page ${Math.floor(offset / pageSize) + 1}: ${batch.length} positions (total: ${allPositions.length})`);
      
      if (batch.length < pageSize || allPositions.length >= limit) break;
      offset += pageSize;
    }
    
    console.log(`   ✓ Total closed positions fetched: ${allPositions.length}\n`);
    return allPositions;
  } catch (error) {
    console.error('Error fetching closed positions:', error.message);
    return [];
  }
}

function calculateProfitableTrades(closedPositions) {
  console.log('📊 Calculating profitable trades...\n');
  
  // Filter only profitable trades (realizedPnl > 0)
  const profitable = closedPositions
    .filter(pos => {
      const pnl = parseFloat(pos.realizedPnl || 0);
      return pnl > 0;
    })
    .map(pos => {
      const avgPrice = parseFloat(pos.avgPrice || 0);
      const totalBought = parseFloat(pos.totalBought || 0);
      const realizedPnl = parseFloat(pos.realizedPnl || 0);
      
      // Buy Amount = avgPrice * totalBought
      const buyAmount = avgPrice * totalBought;
      
      // Sell Amount = Buy Amount + Profit (for profitable trades)
      const sellAmount = buyAmount + realizedPnl;
      
      // Net Profit = realizedPnl
      const netProfit = realizedPnl;
      
      // Build Polymarket URL - prefer eventSlug, fallback to slug
      const marketUrl = pos.eventSlug 
        ? `https://polymarket.com/event/${pos.eventSlug}`
        : pos.slug 
        ? `https://polymarket.com/event/${pos.slug}`
        : pos.conditionId
        ? `https://polymarket.com/condition/${pos.conditionId}`
        : null;
      
      return {
        id: pos.asset || pos.conditionId,
        marketName: pos.title || 'Unknown Market',
        marketImage: pos.icon || null,
        marketUrl: marketUrl,
        outcome: pos.outcome || 'YES',
        endDate: pos.endDate,
        timestamp: pos.timestamp,
        
        // Raw values from API
        avgPrice: avgPrice,
        totalBought: totalBought,
        realizedPnl: realizedPnl,
        
        // Calculated values
        buyAmount: buyAmount,
        sellAmount: sellAmount,
        netProfit: netProfit,
        
        // Additional info
        slug: pos.slug,
        eventSlug: pos.eventSlug,
        conditionId: pos.conditionId,
        icon: pos.icon
      };
    })
    .sort((a, b) => b.netProfit - a.netProfit); // Sort by profit descending
  
  console.log(`   ✓ Found ${profitable.length} profitable trades\n`);
  return profitable;
}

function displayProfitableTrades(profitableTrades, limit = 10) {
  console.log(`${'='.repeat(100)}`);
  console.log(`💰 TOP ${Math.min(limit, profitableTrades.length)} PROFITABLE TRADES`);
  console.log(`${'='.repeat(100)}\n`);
  
  const topTrades = profitableTrades.slice(0, limit);
  
  topTrades.forEach((trade, index) => {
    console.log(`${index + 1}. ${trade.marketName}`);
    if (trade.marketImage) {
      console.log(`   Image: ${trade.marketImage}`);
    }
    if (trade.marketUrl) {
      console.log(`   Link:  ${trade.marketUrl}`);
    }
    console.log(`   Outcome: ${trade.outcome}`);
    console.log(`   Buy Amount:  $${trade.buyAmount.toFixed(2)} (avgPrice: ${trade.avgPrice.toFixed(4)} × totalBought: ${trade.totalBought.toFixed(2)})`);
    console.log(`   Sell Amount: $${trade.sellAmount.toFixed(2)}`);
    console.log(`   Net Profit:  $${trade.netProfit.toFixed(2)}`);
    console.log(`   End Date:    ${trade.endDate || 'N/A'}`);
    console.log('');
  });
  
  // Summary statistics
  const totalBuyAmount = profitableTrades.reduce((sum, t) => sum + t.buyAmount, 0);
  const totalSellAmount = profitableTrades.reduce((sum, t) => sum + t.sellAmount, 0);
  const totalProfit = profitableTrades.reduce((sum, t) => sum + t.netProfit, 0);
  
  console.log(`${'='.repeat(100)}`);
  console.log('📊 SUMMARY STATISTICS');
  console.log(`${'='.repeat(100)}`);
  console.log(`Total Profitable Trades: ${profitableTrades.length}`);
  console.log(`Total Buy Amount:  $${totalBuyAmount.toFixed(2)}`);
  console.log(`Total Sell Amount: $${totalSellAmount.toFixed(2)}`);
  console.log(`Total Net Profit:  $${totalProfit.toFixed(2)}`);
  console.log(`Average Profit per Trade: $${(totalProfit / profitableTrades.length).toFixed(2)}`);
  console.log(`${'='.repeat(100)}\n`);
}

function validateCalculations(profitableTrades) {
  console.log('🔍 Validating calculations...\n');
  
  let errors = 0;
  
  profitableTrades.forEach((trade, index) => {
    // Validate: sellAmount should equal buyAmount + netProfit
    const expectedSellAmount = trade.buyAmount + trade.netProfit;
    const sellAmountDiff = Math.abs(trade.sellAmount - expectedSellAmount);
    
    if (sellAmountDiff > 0.01) {
      console.log(`   ❌ Trade ${index + 1} calculation error:`);
      console.log(`      Expected sellAmount: $${expectedSellAmount.toFixed(2)}`);
      console.log(`      Actual sellAmount: $${trade.sellAmount.toFixed(2)}`);
      console.log(`      Difference: $${sellAmountDiff.toFixed(2)}`);
      errors++;
    }
    
    // Validate: buyAmount should equal avgPrice * totalBought
    const expectedBuyAmount = trade.avgPrice * trade.totalBought;
    const buyAmountDiff = Math.abs(trade.buyAmount - expectedBuyAmount);
    
    if (buyAmountDiff > 0.01) {
      console.log(`   ❌ Trade ${index + 1} buyAmount calculation error:`);
      console.log(`      Expected buyAmount: $${expectedBuyAmount.toFixed(2)}`);
      console.log(`      Actual buyAmount: $${trade.buyAmount.toFixed(2)}`);
      console.log(`      Difference: $${buyAmountDiff.toFixed(2)}`);
      errors++;
    }
  });
  
  if (errors === 0) {
    console.log(`   ✅ All ${profitableTrades.length} trades validated successfully!\n`);
  } else {
    console.log(`   ⚠️ Found ${errors} calculation errors\n`);
  }
}

async function main() {
  const username = process.argv[2] || 'car';
  const limit = parseInt(process.argv[3]) || 1000;
  
  console.log('🚀 Profitable Trades Test Script');
  console.log('='.repeat(100));
  console.log(`Username: ${username}`);
  console.log(`Limit: ${limit} positions`);
  console.log('='.repeat(100));
  
  // Get wallet address
  console.log(`\n📍 Finding wallet address for username: ${username}`);
  const walletAddress = await getWalletAddress(username);
  
  if (!walletAddress) {
    console.error('❌ Could not find wallet address');
    return;
  }
  
  console.log(`   ✓ Wallet: ${walletAddress}`);
  
  // Fetch closed positions
  const closedPositions = await fetchClosedPositions(walletAddress, limit);
  
  if (closedPositions.length === 0) {
    console.log('❌ No closed positions found');
    return;
  }
  
  // Show sample raw data
  console.log('📋 Sample Raw Position Data (first profitable one):');
  const firstProfitable = closedPositions.find(pos => parseFloat(pos.realizedPnl || 0) > 0);
  if (firstProfitable) {
    console.log(JSON.stringify({
      title: firstProfitable.title,
      avgPrice: firstProfitable.avgPrice,
      totalBought: firstProfitable.totalBought,
      realizedPnl: firstProfitable.realizedPnl,
      outcome: firstProfitable.outcome,
      endDate: firstProfitable.endDate
    }, null, 2));
    console.log('');
  }
  
  // Calculate profitable trades
  const profitableTrades = calculateProfitableTrades(closedPositions);
  
  if (profitableTrades.length === 0) {
    console.log('❌ No profitable trades found');
    return;
  }
  
  // Validate calculations
  validateCalculations(profitableTrades);
  
  // Display results
  displayProfitableTrades(profitableTrades, 20);
  
  // Show JSON output for first 5 trades
  console.log('📦 JSON Output (first 5 trades):');
  console.log(JSON.stringify(profitableTrades.slice(0, 5), null, 2));
  console.log('');
}

main().catch(console.error);

