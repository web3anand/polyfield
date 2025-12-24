import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { fetchUserPnLData } from '../utils/polymarket-pnl.js';
import { getXUserAbout } from '../utils/x-api.js';

const POLYMARKET_DATA_API = "https://data-api.polymarket.com";
const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";

// Helper to search for a user by username
async function findUserByUsername(username: string): Promise<{ wallet: string; profileImage?: string; bio?: string }> {
  try {
    console.log(`Searching for user: ${username}`);

    const response = await axios.get(`${POLYMARKET_GAMMA_API}/public-search`, {
      params: {
        q: username,
        search_profiles: true,
      },
      timeout: 5000,
    });

    // According to official Polymarket API docs, response structure is:
    // { events: [...], tags: [...], profiles: [...], pagination: {...} }
    let profiles: any[] = [];

    if (response.data?.profiles && Array.isArray(response.data.profiles)) {
      // Official API structure: profiles array at root level
      profiles = response.data.profiles;
    } else if (Array.isArray(response.data)) {
      // Fallback: if response is directly an array
      profiles = response.data;
    }

    if (profiles.length > 0) {
      console.log("First profile structure:", JSON.stringify(profiles[0], null, 2));
      
      // According to official Polymarket API docs:
      // - name (string) - the primary username field
      // - pseudonym (string) - alternative name
      // - username, display_name, displayName, handle - fallback fields
      // Look for exact username match first, checking 'name' field first (official API primary field)
      let profile = profiles.find(p => {
        const profileName = p.name || p.pseudonym || p.username || p.display_name || p.displayName || p.handle;
        return profileName?.toLowerCase() === username.toLowerCase();
      });
      
      // If no exact match, use the first result
      if (!profile) {
        profile = profiles[0];
      }

      console.log("Selected profile:", JSON.stringify(profile, null, 2));

      // Extract wallet address - proxyWallet is the official field name
      const wallet = profile.proxyWallet || profile.wallet || profile.address || profile.walletAddress;
      if (!wallet) {
        throw new Error('No wallet address found in profile');
      }

      return {
        wallet,
        profileImage: profile.profileImage || profile.profile_image_url || profile.avatar_url || profile.profile_image,
        bio: profile.bio || profile.description
      };
    }

    throw new Error('No profiles found');
  } catch (error) {
    console.error('Error searching for user:', error);
    throw new Error(`User not found: ${username}`);
  }
}

// Helper to fetch user positions
async function fetchUserPositions(walletAddress: string): Promise<any[]> {
  try {
    console.log(`Fetching positions for wallet: ${walletAddress}`);
    
    const response = await axios.get(`${POLYMARKET_DATA_API}/positions`, {
      params: {
        user: walletAddress,
        limit: 1000,
      },
      timeout: 10000,
    });

    // Filter to only positions with size > 0 (matching PnL calculation logic)
    const allPositions = response.data || [];
    return allPositions.filter((pos: any) => parseFloat(pos.size || 0) > 0);
  } catch (error) {
    console.error('Error fetching positions:', error);
    return [];
  }
}

// Helper to fetch ALL user trades with optimized parallel pagination
async function fetchAllUserTrades(walletAddress: string): Promise<any[]> {
  try {
    console.log(`📊 Fetching ALL trades for wallet: ${walletAddress}...`);
    
    // First, fetch first page to determine total count
    const firstPageResponse = await axios.get(`${POLYMARKET_DATA_API}/trades`, {
      params: {
        user: walletAddress,
        limit: 100,
        offset: 0,
      },
      timeout: 10000,
    }).catch(() => ({ data: [] }));
    
    const firstBatch = firstPageResponse.data || [];
    if (!Array.isArray(firstBatch) || firstBatch.length === 0) {
      console.log(`   ✓ No trades found`);
      return [];
    }
    
    const allTrades: any[] = [...firstBatch];
    let pageCount = 1; // Track total pages fetched
    console.log(`   Fetched page 1: ${firstBatch.length} trades (total: ${allTrades.length})`);
    
    // If first page is full, fetch remaining pages in parallel batches
    if (firstBatch.length === 100) {
      const pageSize = 100;
      const maxPages = 200; // Safety limit
      const parallelBatchSize = 30; // Fetch 30 pages at a time in parallel (increased for speed)
      
      let offset = 100;
      
      while (pageCount < maxPages) {
        // Create parallel requests for next batch of pages
        const batchPromises = [];
        for (let i = 0; i < parallelBatchSize && pageCount < maxPages; i++) {
          batchPromises.push(
            axios.get(`${POLYMARKET_DATA_API}/trades`, {
              params: {
                user: walletAddress,
                limit: pageSize,
                offset: offset + (i * pageSize),
              },
              timeout: 8000, // Reduced timeout for faster failure detection
            }).catch(() => ({ data: [] }))
          );
        }
        
        const batchResults = await Promise.all(batchPromises);
        let hasMore = false;
        
        for (let i = 0; i < batchResults.length; i++) {
          const batch = batchResults[i].data || [];
          if (Array.isArray(batch) && batch.length > 0) {
            allTrades.push(...batch);
            pageCount++;
            console.log(`   Fetched page ${pageCount}: ${batch.length} trades (total: ${allTrades.length})`);
            
            if (batch.length === pageSize) {
              hasMore = true;
            }
          }
        }
        
        if (!hasMore) break;
        offset += parallelBatchSize * pageSize;
      }
    }
    
    console.log(`   ✓ Fetched ${allTrades.length} total trades across ${pageCount} pages`);
    return allTrades;
  } catch (error) {
    console.error('Error fetching all trades:', error);
    return [];
  }
}

// Helper to calculate PnL for each trade (FIFO method)
function calculateTradesWithPnL(trades: any[]): any[] {
  console.log(`📊 Calculating PnL for ${trades.length} trades...`);
  
  // First, assign stable IDs to all trades that don't have one
  // Use a deterministic ID based on trade properties to ensure consistency
  const tradesWithIds = trades.map((trade, index) => {
    if (!trade.id) {
      // Create a stable ID from trade properties
      const timestamp = trade.timestamp || trade.created_at || Date.now();
      const marketName = (typeof trade.market === 'object' ? (trade.market?.question || trade.market?.title) : trade.market) || trade.title || "Unknown Market";
      const outcome = trade.outcome || "YES";
      const price = trade.outcomeTokenPrice || trade.price || 0;
      const size = trade.outcomeTokenAmount || trade.size || 0;
      // Use a hash-like string for deterministic ID
      const stableId = `trade-${timestamp}-${marketName}-${outcome}-${price}-${size}-${index}`;
      return { ...trade, id: stableId };
    }
    return trade;
  });
  
  // Group trades by market and outcome
  const marketPositions: Record<string, { buys: any[], sells: any[] }> = {};
  
  for (const trade of tradesWithIds) {
    const marketName = (typeof trade.market === 'object' ? (trade.market?.question || trade.market?.title) : trade.market) || trade.title || "Unknown Market";
    const outcome = trade.outcome || "YES";
    const key = `${marketName}_${outcome}`;
    
    if (!marketPositions[key]) {
      marketPositions[key] = { buys: [], sells: [] };
    }
    
    const side = (trade.side === "BUY" || trade.side === "buy" || trade.type === "BUY") ? "BUY" : "SELL";
    if (side === "BUY") {
      marketPositions[key].buys.push(trade);
    } else {
      marketPositions[key].sells.push(trade);
    }
  }

  const tradePnLMap = new Map<string, { profit: number; betAmount: number; closePositionValue: number }>(); // Map trade ID to PnL data

  // Match buys with sells to calculate realized PnL using proper FIFO
  for (const [key, { buys, sells }] of Object.entries(marketPositions)) {
    if (sells.length === 0) continue; // Skip if no sells
    
    // Sort buys chronologically (oldest first) for FIFO matching
    const sortedBuys = buys
      .map(buy => ({
        ...buy,
        price: parseFloat(buy.outcomeTokenPrice || buy.price || 0),
        size: parseFloat(buy.outcomeTokenAmount || buy.size || 0),
        remainingSize: parseFloat(buy.outcomeTokenAmount || buy.size || 0), // Track remaining size for FIFO
      }))
      .sort((a, b) => new Date(a.timestamp || a.created_at).getTime() - new Date(b.timestamp || b.created_at).getTime());

    console.log(`   Market: ${key}`);
    console.log(`     ${sortedBuys.length} BUYs (total size: ${sortedBuys.reduce((sum, b) => sum + b.size, 0).toFixed(2)})`);
    console.log(`     ${sells.length} SELLs`);

    // Match sells with buys using FIFO (First In, First Out)
    for (const sell of sells.sort((a, b) => new Date(a.timestamp || a.created_at).getTime() - new Date(b.timestamp || b.created_at).getTime())) {
      const sellPrice = parseFloat(sell.outcomeTokenPrice || sell.price || 0);
      let sellSize = parseFloat(sell.outcomeTokenAmount || sell.size || 0);
      let totalCostBasis = 0;
      let totalMatchedSize = 0;

      // Match this sell against buys in FIFO order
      for (const buy of sortedBuys) {
        if (sellSize <= 0) break; // All of this sell has been matched
        
        if (buy.remainingSize > 0) {
          const sizeToMatch = Math.min(sellSize, buy.remainingSize);
          const costForThisMatch = buy.price * sizeToMatch;
          
          totalCostBasis += costForThisMatch;
          totalMatchedSize += sizeToMatch;
          buy.remainingSize -= sizeToMatch;
          sellSize -= sizeToMatch;
          
          console.log(`       Matched ${sizeToMatch.toFixed(2)} from BUY @ $${buy.price.toFixed(3)} (remaining: ${buy.remainingSize.toFixed(2)})`);
        }
      }

      // Calculate PnL for this sell trade
      if (totalMatchedSize > 0) {
        const totalProceeds = sellPrice * totalMatchedSize;
        const pnl = totalProceeds - totalCostBasis;
        
        // Store PnL data for this sell trade
        const tradeId = sell.id;
        tradePnLMap.set(tradeId, {
          profit: pnl,
          betAmount: totalCostBasis,
          closePositionValue: totalProceeds
        });
        console.log(`       SELL ${totalMatchedSize.toFixed(2)} @ $${sellPrice.toFixed(3)} → Cost: $${totalCostBasis.toFixed(2)}, Proceeds: $${totalProceeds.toFixed(2)}, PnL: $${pnl.toFixed(2)}`);
      } else {
        console.log(`       SELL ${parseFloat(sell.outcomeTokenAmount || sell.size || 0).toFixed(2)} @ $${sellPrice.toFixed(3)} → No matching BUYs!`);
      }
    }
  }

  console.log(`   ✓ Calculated PnL for ${tradePnLMap.size} SELL trades`);

  // Return trades with PnL attached (use tradesWithIds to ensure IDs match)
  return tradesWithIds.map(trade => {
    const tradeId = trade.id; // ID is guaranteed to exist from tradesWithIds
    const side = (trade.side === "BUY" || trade.side === "buy" || trade.type === "BUY") ? "BUY" : "SELL";
    
    if (side === "SELL" && tradePnLMap.has(tradeId)) {
      const pnlData = tradePnLMap.get(tradeId)!;
      return {
        ...trade,
        profit: parseFloat(pnlData.profit.toFixed(2)),
        betAmount: parseFloat(pnlData.betAmount.toFixed(2)),
        closePositionValue: parseFloat(pnlData.closePositionValue.toFixed(2)),
        netProfit: parseFloat(pnlData.profit.toFixed(2))
      };
    }
    return trade;
  });
}

// Helper to fetch closed positions for profitable trades calculation
async function fetchClosedPositionsForProfitableTrades(walletAddress: string, limit: number = 5000): Promise<any[]> {
  try {
    console.log(`📊 Fetching closed positions for profitable trades (limit: ${limit})...`);
    
    // API max is 50 per request, so use 50 as page size
    const pageSize = 50;
    const firstPageResponse = await axios.get(`${POLYMARKET_DATA_API}/closed-positions`, {
      params: {
        user: walletAddress,
        limit: pageSize,
        offset: 0
      },
      timeout: 10000
    }).catch(() => ({ data: [] }));
    
    const firstBatch = firstPageResponse.data || [];
    if (firstBatch.length === 0) {
      console.log(`   ✓ No closed positions found`);
      return [];
    }
    
    const allPositions: any[] = [...firstBatch];
    console.log(`   Fetched page 1: ${firstBatch.length} positions (total: ${allPositions.length})`);
    
    // If first page is full (50 items), fetch remaining pages in parallel batches
    // Continue fetching even if first page has less than pageSize, as long as we haven't reached the limit
    if (firstBatch.length >= pageSize || allPositions.length < limit) {
      const maxPages = Math.ceil(limit / pageSize);
      const parallelBatchSize = 20; // Fetch 20 pages at a time in parallel (20 * 50 = 1000 positions per batch)
      let offset = pageSize;
      let pageCount = 1;
      
      while (pageCount < maxPages && allPositions.length < limit) {
        // Create parallel requests for next batch of pages
        const batchPromises = [];
        const remainingPages = maxPages - pageCount;
        const pagesToFetch = Math.min(parallelBatchSize, remainingPages);
        
        for (let i = 0; i < pagesToFetch && allPositions.length < limit; i++) {
          batchPromises.push(
            axios.get(`${POLYMARKET_DATA_API}/closed-positions`, {
              params: {
                user: walletAddress,
                limit: pageSize,
                offset: offset + (i * pageSize)
              },
              timeout: 10000
            }).catch(() => ({ data: [] }))
          );
        }
        
        const batchResults = await Promise.all(batchPromises);
        let hasMore = false;
        let fetchedInBatch = 0;
        
        for (let i = 0; i < batchResults.length; i++) {
          const batch = batchResults[i].data || [];
          if (Array.isArray(batch) && batch.length > 0) {
            allPositions.push(...batch);
            pageCount++;
            fetchedInBatch += batch.length;
            console.log(`   Fetched page ${pageCount}: ${batch.length} positions (total: ${allPositions.length})`);
            
            if (batch.length === pageSize) {
              hasMore = true;
            }
          }
        }
        
        // If we got no new data in this batch, stop
        if (fetchedInBatch === 0) {
          console.log(`   No more positions available, stopping at ${allPositions.length} total`);
          break;
        }
        
        // If we've reached the limit or no more pages, stop
        if (allPositions.length >= limit || !hasMore) {
          break;
        }
        
        offset += pagesToFetch * pageSize;
      }
    }
    
    console.log(`   ✓ Fetched ${allPositions.length} total closed positions`);
    return allPositions;
  } catch (error) {
    console.error('Error fetching closed positions:', error);
    return [];
  }
}

// Helper to calculate profitable trades from closed positions
function calculateProfitableTradesFromClosedPositions(closedPositions: any[]): any[] {
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
      
      // Build Polymarket URL - prefer eventSlug, fallback to slug, then conditionId
      const marketUrl = pos.eventSlug 
        ? `https://polymarket.com/event/${pos.eventSlug}`
        : pos.slug 
        ? `https://polymarket.com/event/${pos.slug}`
        : pos.conditionId
        ? `https://polymarket.com/condition/${pos.conditionId}`
        : null;
      
      return {
        id: pos.asset || pos.conditionId || `position-${Date.now()}-${Math.random()}`,
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
        buyAmount: parseFloat(buyAmount.toFixed(2)),
        sellAmount: parseFloat(sellAmount.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        profit: parseFloat(netProfit.toFixed(2)), // Alias for compatibility
        
        // Additional info
        slug: pos.slug,
        eventSlug: pos.eventSlug,
        conditionId: pos.conditionId,
        
        // For compatibility with existing schema
        betAmount: parseFloat(buyAmount.toFixed(2)),
        closePositionValue: parseFloat(sellAmount.toFixed(2)),
        type: 'SELL' as const,
        size: totalBought,
        price: avgPrice
      };
    })
    .sort((a, b) => b.netProfit - a.netProfit); // Sort by profit descending
  
  return profitable;
}

// Helper to fetch user volume and additional data from leaderboard API
async function fetchUserVolume(walletAddress: string): Promise<{ volume: number; xUsername?: string; rank?: string }> {
  try {
    console.log(`📊 Fetching volume from leaderboard for wallet: ${walletAddress}`);
    
    const response = await axios.get(`${POLYMARKET_DATA_API}/v1/leaderboard`, {
      params: {
        timePeriod: 'all',
        orderBy: 'VOL',
        limit: 1,
        offset: 0,
        category: 'overall',
        user: walletAddress,
      },
      timeout: 5000,
    });

    const data = response.data;
    if (Array.isArray(data) && data.length > 0 && data[0].vol) {
      const volume = parseFloat(data[0].vol);
      const username = data[0].userName || 'Unknown';
      const xUsername = data[0].xUsername;
      const rank = data[0].rank;
      console.log(`   ✓ Leaderboard data: $${volume.toLocaleString()} (User: ${username}, X: @${xUsername || 'N/A'}, Rank: #${rank || 'N/A'})`);
      return { volume, xUsername, rank };
    }

    console.log('   ⚠ No volume data in leaderboard response (user may not be ranked)');
    return { volume: 0 };
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log('   ⚠ User not found in leaderboard (404)');
    } else if (error.response?.status) {
      console.error(`   ❌ Leaderboard API error: ${error.response.status} - ${error.response.statusText}`);
    } else {
      console.error(`   ❌ Error fetching volume from leaderboard: ${error.message}`);
    }
    return { volume: 0 };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Cache-busting headers to prevent stale data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    console.log(`📍 [VERCEL API ROUTE] Dashboard request for username: ${username}`);
    console.log(`🚀🚀🚀 [CODE VERSION CHECK] Backend code is LATEST VERSION with nationality feature! 🚀🚀🚀`);

    // Find user by username
    let userInfo;
    try {
      userInfo = await findUserByUsername(username);
      console.log('User info found:', userInfo);
    } catch (error: any) {
      // Check if it's a "user not found" error
      if (error.message?.includes('User not found') || error.message?.includes('No profiles found')) {
        console.log(`User not found: ${username}`);
        res.status(404).json({ 
          error: `User not found: ${username}`,
          message: 'The requested user could not be found in Polymarket'
        });
        return;
      }
      // Re-throw other errors to be handled by outer catch
      throw error;
    }

    // Fetch user data in parallel (including closed positions for profitable trades)
    const [positions, trades, pnlData, leaderboardData, closedPositions] = await Promise.all([
      fetchUserPositions(userInfo.wallet),
      fetchAllUserTrades(userInfo.wallet),
      fetchUserPnLData(userInfo.wallet),
      fetchUserVolume(userInfo.wallet),
        fetchClosedPositionsForProfitableTrades(userInfo.wallet, 5000)
    ]);
    
    // Use leaderboard volume if available, otherwise calculate from trades as fallback
    let totalVolume = leaderboardData.volume;
    const xUsername = leaderboardData.xUsername;
    const rank = leaderboardData.rank;
    
    if (totalVolume === 0 && trades.length > 0) {
      console.log('   ⚠ Leaderboard volume is 0, calculating from trades as fallback...');
      totalVolume = trades.reduce((sum: number, trade: any) => {
        return sum + Math.abs((trade.outcomeTokenAmount || 0) * (trade.outcomeTokenPrice || 0));
      }, 0);
      console.log(`   ✓ Fallback volume from trades: $${totalVolume.toLocaleString()}`);
    }

    // Log first position and trade to see structure
    if (positions.length > 0) {
      console.log('First position structure:', JSON.stringify(positions[0], null, 2));
    }
    if (trades.length > 0) {
      console.log('First trade structure:', JSON.stringify(trades[0], null, 2));
    }

    // Calculate PnL for each trade (attaches profit to SELL trades)
    // This must be done before win rate calculation
    const tradesWithPnL = calculateTradesWithPnL(trades);
    console.log(`📊 Calculated PnL for ${tradesWithPnL.filter((t: any) => t.profit !== undefined).length} SELL trades`);

    // Calculate win rate from SELL trades that have profit data
    // Only SELL trades have profit attached (realized PnL)
    const sellTradesWithProfit = tradesWithPnL.filter((trade: any) => {
      const side = (trade.side === "BUY" || trade.side === "buy" || trade.type === "BUY") ? "BUY" : "SELL";
      return side === "SELL" && trade.profit !== undefined;
    });
    const winningTrades = sellTradesWithProfit.filter((trade: any) => trade.profit > 0).length;
    const winRate = sellTradesWithProfit.length > 0 ? (winningTrades / sellTradesWithProfit.length) * 100 : 0;

    // Calculate best trade and worst trade from ALL positions (open + closed)
    let bestTrade = 0;
    let worstTrade = 0;
    
    // Check open positions
    positions.forEach((pos: any) => {
      const unrealizedPnL = parseFloat(pos.cashPnl || 0);
      if (unrealizedPnL > bestTrade) bestTrade = unrealizedPnL;
      if (unrealizedPnL < worstTrade) worstTrade = unrealizedPnL;
    });
    
    console.log(`📊 Checking ${pnlData.allClosedPositions?.length || 0} closed positions from subgraph...`);
    
    // Check ALL closed positions from subgraph (not just the 100 in history)
    (pnlData.allClosedPositions || []).forEach((pos: any) => {
      const realizedPnL = parseFloat(pos.realizedPnl || 0);
      if (realizedPnL > bestTrade) {
        console.log(`   New best trade found: $${realizedPnL.toFixed(2)}`);
        bestTrade = realizedPnL;
      }
      if (realizedPnL < worstTrade) {
        console.log(`   New worst trade found: $${realizedPnL.toFixed(2)}`);
        worstTrade = realizedPnL;
      }
    });

    console.log(`📊 Final - Best Trade: $${bestTrade.toFixed(2)}, Worst Trade: $${worstTrade.toFixed(2)}`);

    // Generate PnL history from closed positions
    const pnlHistory = [];
    let cumulativePnl = 0;
    
    // Sort by date and create cumulative PnL chart data
    const sortedPositions = (pnlData.closedPositionsHistory || [])
      .sort((a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    
    // Add starting point (7 days before first closed position or 1 day ago if no history)
    if (sortedPositions.length > 0) {
      const firstTime = new Date(sortedPositions[0].endDate).getTime();
      const startTime = firstTime - (7 * 24 * 60 * 60 * 1000);
      pnlHistory.push({
        timestamp: new Date(startTime).toISOString(),
        value: 0
      });
    }
    
    // Sample if too many positions for performance
    const shouldSample = sortedPositions.length > 1000;
    const sampleInterval = shouldSample ? Math.ceil(sortedPositions.length / 500) : 1;
    
    for (let i = 0; i < sortedPositions.length; i++) {
      const pos = sortedPositions[i];
      cumulativePnl += pos.realizedPnl;
      
      // Include all points or sample for large datasets
      if (i % sampleInterval === 0 || i === sortedPositions.length - 1) {
        pnlHistory.push({
          timestamp: pos.endDate,
          value: parseFloat(cumulativePnl.toFixed(2))
        });
      }
    }
    
    // Handle gap between last closed position and current total PnL (includes unrealized)
    const unrealizedPnL = pnlData.totalPnl - cumulativePnl;
    if (sortedPositions.length > 0 && Math.abs(unrealizedPnL) > 100) {
      const now = Date.now();
      const lastClosedTime = new Date(sortedPositions[sortedPositions.length - 1].endDate).getTime();
      const daysSinceLastClosed = (now - lastClosedTime) / (24 * 60 * 60 * 1000);
      
      if (daysSinceLastClosed > 0.5) {
        // Add intermediate points for smooth transition to current value
        const numPoints = Math.min(5, Math.max(2, Math.floor(daysSinceLastClosed)));
        const timeStep = (now - lastClosedTime) / numPoints;
        const pnlStep = unrealizedPnL / numPoints;
        
        for (let i = 1; i <= numPoints; i++) {
          const timestamp = lastClosedTime + (timeStep * i);
          const value = cumulativePnl + (pnlStep * i);
          pnlHistory.push({
            timestamp: new Date(timestamp).toISOString(),
            value: parseFloat(value.toFixed(2))
          });
        }
      } else {
        // Just add current point with total PnL
        pnlHistory.push({
          timestamp: new Date().toISOString(),
          value: pnlData.totalPnl
        });
      }
    } else {
      // Add current point with total PnL
      pnlHistory.push({
        timestamp: new Date().toISOString(),
        value: pnlData.totalPnl
      });
    }

    // Fetch X profile data (nationality and affiliate) if xUsername exists
    // Non-blocking: Start the call but don't wait more than 15 seconds (X API has 12s timeout)
    let xProfileData: { nationality?: string | null; affiliate?: { username: string; profileImage: string; description: string } } = {};
    
    if (xUsername) {
      console.log(`📍 [X API] Starting fetch for @${xUsername}...`);
      // Start X API call with a max wait time
      const xApiPromise = getXUserAbout(xUsername).catch((err) => {
        console.error(`📍 [X API] Error in getXUserAbout for @${xUsername}:`, err?.message || err);
        return null;
      });
      
      // Don't wait more than 15 seconds for X API (X API has 12s timeout, so 15s gives buffer)
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.log(`📍 [X API] Timeout reached for @${xUsername} after 15s`);
          resolve(null);
        }, 15000);
      });
      
      // Race: get result or timeout after 15 seconds
      const xData = await Promise.race([xApiPromise, timeoutPromise]);
      
      if (xData) {
        console.log(`📍 [X API] Successfully fetched data for @${xUsername}:`, {
          accountBasedIn: xData.accountBasedIn,
          hasAffiliate: !!xData.affiliate
        });
        xProfileData.nationality = xData.accountBasedIn || 'Unknown';
        if (xData.affiliate) {
          xProfileData.affiliate = xData.affiliate;
          console.log(`📍 [X API] Affiliate data:`, xData.affiliate);
        }
      } else {
        console.log(`📍 [X API] No data returned for @${xUsername} (timeout or error)`);
        xProfileData.nationality = 'Unknown';
      }
    } else {
      console.log(`📍 [X API] No xUsername provided, setting nationality to 'Unknown'`);
      xProfileData.nationality = 'Unknown';
    }

    // Build profile data - ALWAYS include nationality field
    console.log(`📍 [PROFILE BUILD] Building profile data...`);
    const profileData: any = {
      username,
      walletAddress: userInfo.wallet,
      profileImage: userInfo.profileImage,
      bio: userInfo.bio,
    };
    
    // Add optional fields only if they exist (otherwise they become undefined and get stripped)
    if (xUsername) {
      profileData.xUsername = xUsername;
    }
    if (rank) {
      profileData.rank = rank;
    }
    
    // CRITICAL: Always add nationality - use 'Unknown' as default, never null/undefined
    profileData.nationality = xProfileData.nationality || 'Unknown';
    console.log(`📍 [PROFILE BUILD] Set nationality to: "${profileData.nationality}"`);
    
    // Add affiliate if available
    if (xProfileData.affiliate) {
      profileData.affiliate = xProfileData.affiliate;
      console.log(`📍 [PROFILE BUILD] Set affiliate to: @${xProfileData.affiliate.username}`);
    }
    
    console.log(`📍 [PROFILE BUILD] profileData keys: ${Object.keys(profileData).join(', ')}`);
    console.log(`📍 [PROFILE BUILD] profileData.nationality exists: ${('nationality' in profileData)}`);
    console.log(`📍 [PROFILE BUILD] profileData.nationality value: "${profileData.nationality}"`);
    console.log(`📍 [PROFILE BUILD] profileData.affiliate exists: ${('affiliate' in profileData)}`);

    const dashboardData = {
      profile: profileData,
      stats: {
        totalPnL: pnlData.totalPnl,
        realizedPnL: pnlData.realizedPnl,
        unrealizedPnL: pnlData.unrealizedPnl,
        winRate: Math.round(winRate * 100) / 100,
        totalVolume,
        openPositionsValue: pnlData.portfolioValue,
        totalTrades: trades.length,
        activePositions: pnlData.openPositions,
        closedPositions: pnlData.closedPositions,
        bestTrade,
        worstTrade,
      },
      pnlHistory,
      positions: positions.map((pos: any) => {
        // Extract slug from various possible fields (matching server/routes.ts logic)
        const slug = pos.slug || pos.market?.slug || pos.eventSlug || pos.market?.eventSlug || pos.market?.id || "";
        // Condition ID for marketId
        const conditionId = pos.conditionId || pos.market?.condition_id || pos.condition_id || pos.market?.conditionId || pos.marketId || pos.market?.id || "";
        
        return {
          id: pos.id || pos.asset || `pos-${Math.random()}`,
          marketName: (typeof pos.market === 'object' ? (pos.market?.question || pos.market?.title) : pos.market) || pos.title || "Unknown Market",
          marketId: conditionId,
          marketSlug: slug,
          eventSlug: slug, // Use slug for both eventSlug and marketSlug (Polymarket URL structure)
          outcome: pos.outcome || "YES",
          size: parseFloat(pos.size || 0),
          entryPrice: parseFloat(pos.avgPrice || pos.average_price || pos.price || 0),
          currentPrice: parseFloat(pos.curPrice || pos.current_price || pos.price || 0),
          unrealizedPnL: parseFloat(pos.cashPnl || pos.pnl || 0), // Use API's calculated PnL
          status: parseFloat(pos.size || 0) > 0 ? "ACTIVE" : "CLOSED",
          openedAt: pos.createdAt || pos.created_at || new Date().toISOString(),
        };
      }),
      recentTrades: tradesWithPnL.slice(0, 10).map((trade: any) => ({
        id: trade.id || `trade-${Math.random()}`,
        marketName: (typeof trade.market === 'object' ? (trade.market?.question || trade.market?.title) : trade.market) || trade.title || "Unknown Market",
        outcome: trade.outcome || "YES",
        size: parseFloat(trade.outcomeTokenAmount || trade.size || trade.amount || 0),
        price: parseFloat(trade.outcomeTokenPrice || trade.price || 0),
        timestamp: trade.timestamp || trade.created_at || new Date().toISOString(),
        type: (trade.side === "BUY" || trade.side === "buy" || trade.type === "BUY") ? "BUY" : "SELL",
        profit: trade.profit !== undefined ? trade.profit : undefined, // Use calculated PnL
      })),
      profitableTrades: (() => {
        // Use closed positions API directly for accurate profitable trades
        // This is the most accurate source with correct buy/sell amounts
        console.log(`📊 [PROFITABLE TRADES] Total closed positions fetched: ${closedPositions.length}`);
        const profitable = calculateProfitableTradesFromClosedPositions(closedPositions);
        
        console.log(`💰 Profitable trades found: ${profitable.length}`);
        if (profitable.length > 0) {
          console.log(`   Top 3 profitable trades:`, profitable.slice(0, 3).map((t: any) => ({
            market: t.marketName.substring(0, 50),
            profit: t.netProfit,
            buyAmount: t.buyAmount,
            sellAmount: t.sellAmount
          })));
        }
        console.log(`📊 [PROFITABLE TRADES] Returning ${profitable.length} profitable trades to frontend`);
        return profitable;
      })(),
    };

    // Final verification before sending response
    console.log(`📍 [FINAL CHECK] About to send response...`);
    console.log(`📍 [FINAL CHECK] Profile nationality: "${dashboardData.profile.nationality}"`);
    console.log(`📍 [FINAL CHECK] Profile keys: ${Object.keys(dashboardData.profile).join(', ')}`);
    console.log(`📍 [FINAL CHECK] Profitable trades count: ${dashboardData.profitableTrades?.length || 0}`);
    
    // Double-check nationality is present
    if (!dashboardData.profile.nationality) {
      console.error(`📍 [FINAL CHECK] ❌ ERROR: nationality is falsy! Forcing to 'Unknown'`);
      dashboardData.profile.nationality = 'Unknown';
    }

    // Check response size (Vercel has 4.5MB limit for serverless functions)
    const responseString = JSON.stringify(dashboardData);
    const responseSizeMB = Buffer.byteLength(responseString, 'utf8') / (1024 * 1024);
    console.log(`📍 [FINAL CHECK] Response size: ${responseSizeMB.toFixed(2)} MB`);
    
    if (responseSizeMB > 4.0) {
      console.warn(`⚠️ [FINAL CHECK] Response size is close to Vercel limit (4.5MB). Consider pagination.`);
    }

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}