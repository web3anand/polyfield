import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { fetchUserPnLData } from '../utils/polymarket-pnl.js';

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

    let profiles: any[] = [];

    if (Array.isArray(response.data)) {
      profiles = response.data;
    } else if (response.data?.profiles && Array.isArray(response.data.profiles)) {
      profiles = response.data.profiles;
    }

    if (profiles.length > 0) {
      console.log("First profile structure:", JSON.stringify(profiles[0], null, 2));
      
      // Look for exact username match first
      let profile = profiles.find(p => 
        p.username?.toLowerCase() === username.toLowerCase() ||
        p.display_name?.toLowerCase() === username.toLowerCase()
      );
      
      // If no exact match, use the first result
      if (!profile) {
        profile = profiles[0];
      }

      console.log("Selected profile:", JSON.stringify(profile, null, 2));

      return {
        wallet: profile.proxyWallet || profile.wallet || profile.address,
        profileImage: profile.profileImage || profile.profile_image_url || profile.avatar_url,
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

// Helper to fetch user trades
async function fetchUserTrades(walletAddress: string): Promise<any[]> {
  try {
    console.log(`Fetching trades for wallet: ${walletAddress}`);
    
    const response = await axios.get(`${POLYMARKET_DATA_API}/trades`, {
      params: {
        user: walletAddress,
        limit: 50,
      },
      timeout: 10000,
    });

    return response.data || [];
  } catch (error) {
    console.error('Error fetching trades:', error);
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

  const tradePnLMap = new Map<string, number>(); // Map trade ID to PnL

  // Match buys with sells to calculate realized PnL
  for (const [key, { buys, sells }] of Object.entries(marketPositions)) {
    if (sells.length === 0) continue; // Skip if no sells
    
    let remainingBuySize = 0;
    let avgBuyPrice = 0;
    let totalBuyCost = 0;

    // Calculate FIFO cost basis from buys
    for (const buy of buys.sort((a, b) => new Date(a.timestamp || a.created_at).getTime() - new Date(b.timestamp || b.created_at).getTime())) {
      const price = parseFloat(buy.outcomeTokenPrice || buy.price || 0);
      const size = parseFloat(buy.outcomeTokenAmount || buy.size || 0);
      totalBuyCost += price * size;
      remainingBuySize += size;
      avgBuyPrice = totalBuyCost / remainingBuySize;
    }

    console.log(`   Market: ${key}`);
    console.log(`     ${buys.length} BUYs (total size: ${remainingBuySize.toFixed(2)}, avg price: $${avgBuyPrice.toFixed(3)})`);
    console.log(`     ${sells.length} SELLs`);

    // Match with sells
    for (const sell of sells.sort((a, b) => new Date(a.timestamp || a.created_at).getTime() - new Date(b.timestamp || b.created_at).getTime())) {
      const price = parseFloat(sell.outcomeTokenPrice || sell.price || 0);
      const size = parseFloat(sell.outcomeTokenAmount || sell.size || 0);
      const sizeToMatch = Math.min(size, remainingBuySize);
      
      if (sizeToMatch > 0) {
        const pnl = (price - avgBuyPrice) * sizeToMatch;
        
        // Store PnL for this sell trade (use the stable ID we assigned earlier)
        const tradeId = sell.id;
        tradePnLMap.set(tradeId, pnl);
        console.log(`       SELL ${size.toFixed(2)} @ $${price.toFixed(3)} → PnL: $${pnl.toFixed(2)} (matched ${sizeToMatch.toFixed(2)})`);
        
        remainingBuySize -= sizeToMatch;
        totalBuyCost -= avgBuyPrice * sizeToMatch;
        if (remainingBuySize > 0) {
          avgBuyPrice = totalBuyCost / remainingBuySize;
        }
      } else {
        console.log(`       SELL ${size.toFixed(2)} @ $${price.toFixed(3)} → No matching BUYs!`);
      }
    }
  }

  console.log(`   ✓ Calculated PnL for ${tradePnLMap.size} SELL trades`);

  // Return trades with PnL attached (use tradesWithIds to ensure IDs match)
  return tradesWithIds.map(trade => {
    const tradeId = trade.id; // ID is guaranteed to exist from tradesWithIds
    const side = (trade.side === "BUY" || trade.side === "buy" || trade.type === "BUY") ? "BUY" : "SELL";
    
    if (side === "SELL" && tradePnLMap.has(tradeId)) {
      return {
        ...trade,
        profit: parseFloat(tradePnLMap.get(tradeId)!.toFixed(2))
      };
    }
    return trade;
  });
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

    // Find user by username
    const userInfo = await findUserByUsername(username);
    console.log('User info found:', userInfo);

    // Fetch user data in parallel
    const [positions, trades, pnlData, leaderboardData] = await Promise.all([
      fetchUserPositions(userInfo.wallet),
      fetchUserTrades(userInfo.wallet),
      fetchUserPnLData(userInfo.wallet),
      fetchUserVolume(userInfo.wallet)
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
    
    for (const pos of sortedPositions) {
      cumulativePnl += pos.realizedPnl;
      pnlHistory.push({
        timestamp: pos.endDate,
        value: cumulativePnl
      });
    }
    
    // Always add a current point with total PnL (or starting point if no history)
    pnlHistory.push({
      timestamp: new Date().toISOString(),
      value: pnlData.totalPnl
    });

    const dashboardData = {
      profile: {
        username,
        walletAddress: userInfo.wallet,
        profileImage: userInfo.profileImage,
        bio: userInfo.bio,
        xUsername: xUsername,
        rank: rank,
      },
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
      positions: positions.map((pos: any) => ({
        id: pos.id || `pos-${Math.random()}`,
        marketName: (typeof pos.market === 'object' ? (pos.market?.question || pos.market?.title) : pos.market) || pos.title || "Unknown Market",
        marketId: pos.marketId || pos.market?.id || "",
        marketSlug: pos.marketSlug || pos.market?.slug || "",
        eventSlug: pos.eventSlug || pos.market?.eventSlug || "",
        outcome: pos.outcome || "YES",
        size: parseFloat(pos.size || 0),
        entryPrice: parseFloat(pos.avgPrice || pos.price || 0),
        currentPrice: parseFloat(pos.curPrice || pos.currentPrice || pos.price || 0),
        unrealizedPnL: parseFloat(pos.cashPnl || 0), // Use API's calculated PnL
        status: parseFloat(pos.size || 0) > 0 ? "ACTIVE" : "CLOSED",
        openedAt: pos.createdAt || pos.created_at || new Date().toISOString(),
      })),
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
    };

    console.log('Dashboard data prepared:', {
      profile: dashboardData.profile,
      stats: {
        ...dashboardData.stats,
        totalVolume: `$${dashboardData.stats.totalVolume.toLocaleString()} (${dashboardData.stats.totalVolume >= 1000000 ? `${(dashboardData.stats.totalVolume / 1000000).toFixed(2)}M` : `${(dashboardData.stats.totalVolume / 1000).toFixed(1)}K`})`
      },
      pnlHistoryCount: dashboardData.pnlHistory.length,
      positionsCount: dashboardData.positions.length,
      tradesCount: dashboardData.recentTrades.length,
    });

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
