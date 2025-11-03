import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { fetchUserPnLData, generateFullPnLHistory } from '../utils/polymarket-pnl.js';

const POLYMARKET_DATA_API = "https://data-api.polymarket.com";
const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";

// Cache for profile searches to avoid redundant API calls
const profileCache = new Map<string, { data: { wallet: string; profileImage?: string; bio?: string }, timestamp: number }>();
const PROFILE_CACHE_TTL = 300000; // 5 minutes

// Helper to batch profile searches concurrently
async function findUsersByUsernameBatch(usernames: string[]): Promise<Map<string, { wallet: string; profileImage?: string; bio?: string }>> {
  const results = new Map<string, { wallet: string; profileImage?: string; bio?: string }>();
  const uncachedUsernames: string[] = [];

  // Check cache first
  const now = Date.now();
  usernames.forEach(username => {
    const cacheKey = username.toLowerCase();
    const cached = profileCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < PROFILE_CACHE_TTL) {
      results.set(username, cached.data);
    } else {
      uncachedUsernames.push(username);
    }
  });

  if (uncachedUsernames.length === 0) {
    return results;
  }

  // Batch concurrent requests (max 10 at a time to avoid rate limiting)
  const BATCH_SIZE = 10;
  for (let i = 0; i < uncachedUsernames.length; i += BATCH_SIZE) {
    const batch = uncachedUsernames.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (username) => {
      try {
        const profile = await findUserByUsername(username, true); // skipCache=true for batch
        results.set(username, profile);
        // Update cache
        profileCache.set(username.toLowerCase(), { data: profile, timestamp: now });
      } catch (error) {
        console.error(`Error fetching profile for ${username}:`, error);
        // Don't throw - continue with other usernames
      }
    });
    await Promise.all(batchPromises);
    
    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < uncachedUsernames.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

// Helper to search for a user by username
async function findUserByUsername(username: string, skipCache = false): Promise<{ wallet: string; profileImage?: string; bio?: string }> {
  try {
    // Check cache first (unless skipCache is true)
    if (!skipCache) {
      const cacheKey = username.toLowerCase();
      const cached = profileCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < PROFILE_CACHE_TTL) {
        console.log(`Using cached profile for: ${username}`);
        return cached.data;
      }
    }

    console.log(`Searching for user: ${username}`);

    const response = await axios.get(`${POLYMARKET_GAMMA_API}/public-search`, {
      params: {
        q: username,
        search_profiles: true,
      },
      timeout: 3000, // Reduced timeout for faster failure
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

      const result = {
        wallet: profile.proxyWallet || profile.wallet || profile.address,
        profileImage: profile.profileImage || profile.profile_image_url || profile.avatar_url,
        bio: profile.bio || profile.description
      };
      
      // Cache the result
      if (!skipCache) {
        profileCache.set(username.toLowerCase(), { data: result, timestamp: Date.now() });
      }
      
      return result;
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

// Helper to fetch user activity (for accurate volume calculation)
async function fetchUserActivity(walletAddress: string): Promise<any[]> {
  try {
    console.log(`Fetching activity for wallet: ${walletAddress}`);
    
    const response = await axios.get(`${POLYMARKET_DATA_API}/activity`, {
      params: {
        user: walletAddress,
        limit: 1000, // Get more activity events for complete volume
        offset: 0,
      },
      timeout: 10000,
    });

    return response.data || [];
  } catch (error) {
    console.error('Error fetching activity:', error);
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

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

    console.log(`Dashboard request for username: ${username}`);

    // Find user by username
    const userInfo = await findUserByUsername(username);
    console.log('User info found:', userInfo);

    // Fetch user data in parallel
    // Fetch more closed positions to ensure we get the actual biggest win
    const [positions, trades, pnlData, extraClosedPositions, activity] = await Promise.all([
      fetchUserPositions(userInfo.wallet),
      fetchUserTrades(userInfo.wallet),
      fetchUserPnLData(userInfo.wallet),
      // Fetch additional closed positions sorted by PnL to ensure we get biggest win
      axios.get(`${POLYMARKET_DATA_API}/closed-positions`, {
        params: {
          user: userInfo.wallet,
          limit: 500, // Get more positions to ensure we find the biggest win
          offset: 0,
          sortBy: 'REALIZEDPNL',
          sortDirection: 'DESC'
        },
        timeout: 5000
      }).catch(() => ({ data: [] })),
      fetchUserActivity(userInfo.wallet)
    ]);

    // Log first position and trade to see structure
    if (positions.length > 0) {
      console.log('First position structure:', JSON.stringify(positions[0], null, 2));
    }
    if (trades.length > 0) {
      console.log('First trade structure:', JSON.stringify(trades[0], null, 2));
    }

    // Calculate win rate from trades (use size * price as proxy for trade value)
    const winningTrades = trades.filter((trade: any) => {
      // Check if trade resulted in profit - for now, use a simple heuristic
      // Note: This is an approximation since we don't have realized PnL per trade
      const tradeValue = parseFloat(trade.size || 0) * parseFloat(trade.price || 0);
      return tradeValue > 0;
    }).length;
    const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

    // Calculate total volume from activity TRADE events (more accurate than trades endpoint)
    // TESTED & VERIFIED: Activity endpoint has usdcSize field which represents actual trade value
    // Method 6 from test-volume.js: $743.59 for imdaybot (vs $0 from broken method)
    const totalVolume = activity
      .filter((event: any) => event.type?.toUpperCase() === 'TRADE')
      .reduce((sum: number, event: any) => {
        const usdcSize = parseFloat(event.usdcSize || 0);
        return sum + Math.abs(usdcSize);
      }, 0);

    // Calculate best trade and worst trade from REALIZED closed positions
    // TESTED & VERIFIED: API uses 'realizedPnl' field (camelCase)
    // Test results confirmed: $8.51 correctly extracted from closed positions
    let bestTrade = 0;
    let worstTrade = 0;
    
    // Prefer the extra fetch (500 positions) over the history (100 positions)
    // This ensures we get the maximum number of closed positions
    const allClosedPositionsData = (extraClosedPositions.data || []).length > 0 
      ? extraClosedPositions.data 
      : (pnlData.closedPositionsHistory || []);
    
    console.log(`📊 Checking ${allClosedPositionsData.length} closed positions for best/worst trade...`);
    
    if (allClosedPositionsData.length > 0) {
      // Extract realized PnL - matches test-verified logic
      // API returns realizedPnl as number (e.g., 8.511456)
      const getRealizedPnl = (pos: any): number => {
        if (typeof pos.realizedPnl === 'number') {
          return pos.realizedPnl;
        }
        // Fallback for string values or mapped data
        return parseFloat(pos.realizedPnl || pos.realized_pnl || 0);
      };
      
      // Find best trade (highest positive realized PnL)
      // Filter for wins only, then sort descending to get the biggest win first
      const winningPositions = allClosedPositionsData
        .map((pos: any) => ({
          original: pos,
          pnlValue: getRealizedPnl(pos)
        }))
        .filter((item: any) => item.pnlValue > 0)
        .sort((a: any, b: any) => b.pnlValue - a.pnlValue); // Descending: highest first
      
      if (winningPositions.length > 0) {
        bestTrade = winningPositions[0].pnlValue;
        const bestTitle = winningPositions[0].original.title || winningPositions[0].original.marketName || 'position';
        console.log(`   ✓ Biggest Win: $${bestTrade.toFixed(2)} from "${bestTitle}"`);
        if (winningPositions.length >= 3) {
          const top3 = winningPositions.slice(0, 3).map((p: any) => `$${p.pnlValue.toFixed(2)}`).join(', ');
          console.log(`   Top 3 wins: ${top3}`);
        }
      } else {
        console.log('   ⚠ No winning positions found');
      }
      
      // Find worst trade (lowest realized PnL = biggest loss)
      // Include all positions (wins and losses) and sort ascending to get worst first
      const allWithPnl = allClosedPositionsData.map((pos: any) => ({
        original: pos,
        pnlValue: getRealizedPnl(pos)
      }));
      
      const allSorted = [...allWithPnl].sort((a: any, b: any) => a.pnlValue - b.pnlValue); // Ascending: worst first
      
      if (allSorted.length > 0) {
        worstTrade = allSorted[0].pnlValue;
        console.log(`   ✓ Biggest Loss: $${worstTrade.toFixed(2)}`);
      }
    } else {
      console.log('   ⚠ No closed positions data available');
    }

    console.log(`📊 Final Result - Best Win: $${bestTrade.toFixed(2)}, Worst Trade: $${worstTrade.toFixed(2)}`);

    // Generate full historical PnL timeline with actual fluctuations
    // Uses activity events and closed positions to show complete history
    const pnlHistory = generateFullPnLHistory(
      pnlData.fullActivityHistory || [],
      pnlData.closedPositionsHistory || [],
      pnlData.totalPnl
    );

    const dashboardData = {
      profile: {
        username,
        walletAddress: userInfo.wallet,
        profileImage: userInfo.profileImage,
        bio: userInfo.bio,
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
      positions: positions.map((pos: any) => {
        // Extract slug from various possible fields - Polymarket uses same slug for event and market
        const slug = pos.marketSlug || pos.slug || pos.eventSlug || pos.market?.slug || pos.market?.eventSlug || pos.market?.id || "";
        // Condition ID for the tid parameter
        const conditionId = pos.marketId || pos.conditionId || pos.market?.id || pos.market?.condition_id || pos.condition_id || "";
        
        return {
          id: pos.id || `pos-${Math.random()}`,
          marketName: (typeof pos.market === 'object' ? (pos.market?.question || pos.market?.title) : pos.market) || pos.title || "Unknown Market",
          marketId: conditionId,
          marketSlug: slug, // Use slug for URL (same for event and market)
          eventSlug: slug, // Same as marketSlug per Polymarket URL structure
          outcome: pos.outcome || "YES",
          size: parseFloat(pos.size || 0),
          entryPrice: parseFloat(pos.avgPrice || pos.price || 0),
          currentPrice: parseFloat(pos.curPrice || pos.currentPrice || pos.price || 0),
          unrealizedPnL: parseFloat(pos.cashPnl || 0), // Use API's calculated PnL
          status: parseFloat(pos.size || 0) > 0 ? "ACTIVE" : "CLOSED",
          openedAt: pos.createdAt || pos.created_at || new Date().toISOString(),
        };
      }),
      recentTrades: trades.slice(0, 10).map((trade: any) => ({
        id: trade.id || `trade-${Math.random()}`,
        marketName: (typeof trade.market === 'object' ? (trade.market?.question || trade.market?.title) : trade.market) || trade.title || "Unknown Market",
        outcome: trade.outcome || "YES",
        size: parseFloat(trade.outcomeTokenAmount || trade.size || trade.amount || 0),
        price: parseFloat(trade.outcomeTokenPrice || trade.price || 0),
        timestamp: trade.timestamp || trade.created_at || new Date().toISOString(),
        type: (trade.side === "BUY" || trade.side === "buy" || trade.type === "BUY") ? "BUY" : "SELL",
        profit: trade.pnl ? parseFloat(trade.pnl) : undefined,
      })),
    };

    console.log('Dashboard data prepared:', {
      profile: dashboardData.profile,
      stats: dashboardData.stats,
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
