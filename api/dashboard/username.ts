import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { fetchUserPnLData } from '../utils/polymarket-pnl.js';
import { getXUserAbout, getXUserLastTweet } from '../utils/x-api.js';

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
        
        // Store PnL for this sell trade
        const tradeId = sell.id;
        tradePnLMap.set(tradeId, pnl);
        console.log(`       SELL ${totalMatchedSize.toFixed(2)} @ $${sellPrice.toFixed(3)} → Cost: $${totalCostBasis.toFixed(2)}, PnL: $${pnl.toFixed(2)}`);
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

    // Fetch X profile data (nationality and latest tweet) if xUsername exists
    let xProfileData: { nationality?: string | null; latestTweet?: { text: string; url: string; createdAt: string; likeCount: number; retweetCount: number } } = {};
    
    console.log(`📍 [X-API] Starting X profile data fetch. xUsername: ${xUsername || 'NOT FOUND'}`);
    
    if (xUsername) {
      try {
        console.log(`📍 [X-API] Fetching X profile data for @${xUsername}...`);
        
        // Direct API call to ensure it works
        const response = await axios.get('https://api.twitterapi.io/twitter/user_about', {
          params: {
            userName: xUsername,
          },
          headers: {
            'X-API-Key': process.env.TWITTER_API_KEY || process.env.X_API_KEY || 'new1_492f045b10da41aaa032a5bc1e00d504',
          },
          timeout: 10000,
        });

        console.log(`📍 [X-API] Direct API call status: ${response.data?.status || 'unknown'}`);
        console.log(`📍 [X-API] Direct API response structure:`, JSON.stringify({
          status: response.data?.status,
          hasData: !!response.data?.data,
          hasAboutProfile: !!response.data?.data?.about_profile,
          accountBasedIn: response.data?.data?.about_profile?.account_based_in,
        }, null, 2));

        if (response.data?.status === 'success' && response.data?.data?.about_profile?.account_based_in) {
          const accountBasedIn = response.data.data.about_profile.account_based_in;
          xProfileData.nationality = accountBasedIn;
          console.log(`✅ [X-API] Found nationality for @${xUsername}: "${accountBasedIn}"`);
        } else {
          console.log(`⚠️ [X-API] No nationality found in direct API call`);
          xProfileData.nationality = 'Unknown'; // Use placeholder instead of empty string
        }

        // Try to get last tweet (optional, don't fail if it errors)
        try {
          const lastTweet = await getXUserLastTweet(xUsername);
          if (lastTweet) {
            xProfileData.latestTweet = lastTweet;
            console.log(`✅ [X-API] Found latest tweet for @${xUsername}`);
          }
        } catch (tweetError: any) {
          console.log(`⚠️ [X-API] Could not fetch last tweet: ${tweetError.message}`);
        }
        
        console.log(`📍 [X-API] Final xProfileData:`, JSON.stringify(xProfileData, null, 2));
      } catch (error: any) {
        console.error(`❌ [X-API] Failed to fetch X profile data for @${xUsername}:`, error.message);
        console.error(`❌ [X-API] Error details:`, error);
        // Set nationality to placeholder explicitly so the field appears in JSON
        xProfileData.nationality = 'Unknown';
        // Continue without X data - don't fail the entire request
      }
    } else {
      console.log(`📍 [X-API] No xUsername, skipping X profile data fetch`);
      // Even if no xUsername, set nationality to placeholder so field appears in JSON
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
    
    // Add latestTweet only if it exists
    if (xProfileData.latestTweet) {
      profileData.latestTweet = xProfileData.latestTweet;
    }
    
    console.log(`📍 [PROFILE BUILD] profileData keys: ${Object.keys(profileData).join(', ')}`);
    console.log(`📍 [PROFILE BUILD] profileData.nationality exists: ${('nationality' in profileData)}`);
    console.log(`📍 [PROFILE BUILD] profileData.nationality value: "${profileData.nationality}"`);

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

    // Final verification before sending response
    console.log(`📍 [FINAL CHECK] About to send response...`);
    console.log(`📍 [FINAL CHECK] Profile nationality: "${dashboardData.profile.nationality}"`);
    console.log(`📍 [FINAL CHECK] Profile keys: ${Object.keys(dashboardData.profile).join(', ')}`);
    
    // Double-check nationality is present
    if (!dashboardData.profile.nationality) {
      console.error(`📍 [FINAL CHECK] ❌ ERROR: nationality is falsy! Forcing to 'Unknown'`);
      dashboardData.profile.nationality = 'Unknown';
    }

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}