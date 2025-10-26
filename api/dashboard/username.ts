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
        active: true,
      },
      timeout: 10000,
    });

    return response.data || [];
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
    const [positions, trades, pnlData] = await Promise.all([
      fetchUserPositions(userInfo.wallet),
      fetchUserTrades(userInfo.wallet),
      fetchUserPnLData(userInfo.wallet)
    ]);

    // Calculate win rate
    const winningTrades = trades.filter((trade: any) => 
      trade.outcomeTokenAmount * trade.outcomeTokenPrice > 0
    ).length;
    const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

    // Calculate total volume from trades
    const totalVolume = trades.reduce((sum: number, trade: any) => {
      return sum + Math.abs(trade.outcomeTokenAmount * trade.outcomeTokenPrice);
    }, 0);

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
      },
      pnlHistory,
      positions: positions.map((pos: any) => ({
        id: pos.id,
        market: pos.market,
        outcome: pos.outcome,
        size: pos.size,
        currentPrice: pos.currentPrice,
        status: pos.status,
        createdAt: pos.createdAt,
      })),
      recentTrades: trades.slice(0, 10).map((trade: any) => ({
        id: trade.id,
        market: trade.market,
        outcome: trade.outcome,
        amount: trade.outcomeTokenAmount,
        price: trade.outcomeTokenPrice,
        timestamp: trade.timestamp,
        pnl: trade.outcomeTokenAmount * trade.outcomeTokenPrice,
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
