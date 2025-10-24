import express from 'express';
import axios from 'axios';
import { z } from 'zod';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

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
      const exactMatch = profiles.find((profile: any) => 
        profile.name?.toLowerCase() === username.toLowerCase() ||
        profile.username?.toLowerCase() === username.toLowerCase() ||
        profile.pseudonym?.toLowerCase() === username.toLowerCase()
      );

      if (exactMatch) {
        console.log(`✓ Exact match found: ${username} -> ${exactMatch.proxyWallet}`);
        return {
          wallet: exactMatch.proxyWallet,
          profileImage: exactMatch.profileImage,
          bio: exactMatch.bio
        };
      }

      // Fallback to first result
      const firstProfile = profiles[0];
      console.log(`✓ Using first result: ${username} -> ${firstProfile.proxyWallet}`);
      return {
        wallet: firstProfile.proxyWallet,
        profileImage: firstProfile.profileImage,
        bio: firstProfile.bio
      };
    }

    throw new Error(`No profiles found for username: ${username}`);
  } catch (error) {
    console.error(`Error searching for user ${username}:`, error);
    throw error;
  }
}

// Fetch user positions
async function fetchUserPositions(walletAddress: string): Promise<any[]> {
  try {
    console.log(`Fetching positions for ${walletAddress} (single batch approach)...`);
    console.log("Attempting single large fetch (limit: 1000)");

    const response = await axios.get(`${POLYMARKET_DATA_API}/positions`, {
      params: {
        user: walletAddress,
        limit: 1000,
      },
      timeout: 10000,
    });

    const positions = response.data || [];
    console.log(`Found ${positions.length} positions in single request`);
    return positions;
  } catch (error) {
    console.error(`Error fetching positions for ${walletAddress}:`, error);
    return [];
  }
}

// Fetch user trades
async function fetchUserTrades(walletAddress: string): Promise<any[]> {
  try {
    console.log(`Fetching trades for ${walletAddress} (single batch approach)...`);
    console.log("Attempting single large fetch (limit: 1000)");

    const response = await axios.get(`${POLYMARKET_DATA_API}/trades`, {
      params: {
        user: walletAddress,
        limit: 1000,
      },
      timeout: 10000,
    });

    const trades = response.data || [];
    console.log(`Found ${trades.length} trades in single request`);
    return trades;
  } catch (error) {
    console.error(`Error fetching trades for ${walletAddress}:`, error);
    return [];
  }
}

// Fetch user activity
async function fetchUserActivity(walletAddress: string): Promise<any[]> {
  try {
    console.log(`Fetching activity for ${walletAddress} (single batch approach)...`);
    console.log("Attempting single large fetch (limit: 1000)");

    const response = await axios.get(`${POLYMARKET_DATA_API}/activity`, {
      params: {
        user: walletAddress,
        limit: 1000,
      },
      timeout: 10000,
    });

    const activity = response.data || [];
    console.log(`Found ${activity.length} activity events in single request`);
    return activity;
  } catch (error) {
    console.error(`Error fetching activity for ${walletAddress}:`, error);
    return [];
  }
}

// Calculate balance from activity
function calculateBalanceFromActivity(activity: any[]): number {
  console.log(`📊 Processing ${activity.length} recent activity events for balance calculation`);
  
  let balance = 0;
  let deposits = 0;
  let withdrawals = 0;
  let realizedPnL = 0;

  // Process only recent activity (last 1500 events)
  const recentActivity = activity.slice(0, 1500);
  
  for (const event of recentActivity) {
    const amount = parseFloat(event.amount || "0");
    
    switch (event.type) {
      case "DEPOSIT":
        balance += amount;
        deposits += amount;
        break;
      case "WITHDRAWAL":
        balance -= amount;
        withdrawals += amount;
        break;
      case "TRADE":
      case "REDEEM":
      case "REWARD":
      case "FEE":
        balance += amount;
        if (event.type === "TRADE" || event.type === "REDEEM") {
          realizedPnL += amount;
        }
        break;
    }
  }

  console.log(`📈 Activity Summary: $${deposits.toFixed(2)} deposits, $${withdrawals.toFixed(2)} withdrawals, $${realizedPnL.toFixed(2)} realized PnL`);
  
  return balance;
}

// Generate PnL history from activity
function generatePnLHistory(activity: any[]): any[] {
  const recentActivity = activity.slice(0, 1000);
  const pnlHistory: any[] = [];
  let runningBalance = 0;

  // Group by day and calculate daily PnL
  const dailyBalances = new Map<string, number>();
  
  for (const event of recentActivity) {
    const date = new Date(event.timestamp).toISOString().split('T')[0];
    const amount = parseFloat(event.amount || "0");
    
    if (event.type === "TRADE" || event.type === "REDEEM") {
      runningBalance += amount;
      dailyBalances.set(date, runningBalance);
    }
  }

  // Convert to array and sort by date
  for (const [date, balance] of dailyBalances) {
    pnlHistory.push({
      timestamp: new Date(date).toISOString(),
      value: balance
    });
  }

  return pnlHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/users/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res.json([]);
    }

    const response = await axios.get(`${POLYMARKET_GAMMA_API}/public-search`, {
      params: {
        q: query,
        search_profiles: true
      },
      timeout: 3000
    });

    let profiles: any[] = [];
    if (Array.isArray(response.data)) {
      profiles = response.data;
    } else if (response.data?.profiles && Array.isArray(response.data.profiles)) {
      profiles = response.data.profiles;
    }

    if (profiles.length > 0) {
      const possibleNameFields = ['name', 'username', 'displayName', 'handle', 'pseudonym'];
      const usernames = profiles.map((profile: any) => {
        for (const field of possibleNameFields) {
          if (profile[field]) return profile[field];
        }
        return null;
      }).filter(Boolean).slice(0, 10);
      
      return res.json(usernames);
    }
    
    res.json([]);
  } catch (error) {
    console.error('Error searching users:', error);
    res.json([]);
  }
});

app.get('/api/dashboard/username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    console.log(`=== Fetching dashboard for: ${username} ===`);
    
    // Find user by username
    const userInfo = await findUserByUsername(username);
    console.log(`✓ Wallet found: ${userInfo.wallet}`);
    
    // Fetch all data in parallel
    const [positions, trades, activity] = await Promise.all([
      fetchUserPositions(userInfo.wallet),
      fetchUserTrades(userInfo.wallet),
      fetchUserActivity(userInfo.wallet)
    ]);
    
    // Calculate balance and PnL
    const balance = calculateBalanceFromActivity(activity);
    const pnlHistory = generatePnLHistory(activity);
    
    // Process positions
    const processedPositions = positions.map((pos: any) => ({
      id: pos.id || `pos-${Math.random()}`,
      marketName: pos.market?.question || "Unknown Market",
      marketId: pos.market?.id || pos.market_id,
      outcome: (pos.outcome === "YES" || pos.outcome === "NO" ? pos.outcome : "YES") as "YES" | "NO",
      entryPrice: parseFloat(pos.price || "0"),
      currentPrice: parseFloat(pos.current_price || pos.price || "0"),
      size: parseFloat(pos.size || "0"),
      unrealizedPnL: parseFloat(pos.unrealized_pnl || "0"),
      status: (parseFloat(pos.size || "0") > 0 ? "ACTIVE" : "CLOSED") as "ACTIVE" | "CLOSED",
      openedAt: pos.created_at || new Date().toISOString()
    }));
    
    // Process trades
    const processedTrades = trades.map((trade: any) => ({
      id: trade.id || `trade-${Math.random()}`,
      timestamp: trade.timestamp || new Date().toISOString(),
      marketName: trade.market?.question || "Unknown Market",
      type: (trade.side === "BUY" || trade.side === "buy" ? "BUY" : "SELL") as "BUY" | "SELL",
      outcome: (trade.outcome === "YES" || trade.outcome === "NO" ? trade.outcome : "YES") as "YES" | "NO",
      price: parseFloat(trade.price || "0"),
      size: parseFloat(trade.amount || "0"),
      profit: parseFloat(trade.pnl || "0")
    }));
    
    // Calculate stats
    const totalValue = balance + processedPositions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0);
    const totalPnL = balance;
    const totalVolume = processedTrades.reduce((sum, trade) => sum + (trade.size * trade.price), 0);
    const totalTrades = processedTrades.length;
    const winRate = processedTrades.length > 0 ? 
      (processedTrades.filter(t => t.profit > 0).length / processedTrades.length) * 100 : 0;
    const activePositions = processedPositions.filter(p => p.status === "ACTIVE").length;
    
    const stats = {
      totalValue,
      totalPnL,
      totalVolume,
      totalTrades,
      winRate,
      bestTrade: Math.max(...processedTrades.map(t => t.profit), 0),
      worstTrade: Math.min(...processedTrades.map(t => t.profit), 0),
      activePositions,
      winStreak: 0 // TODO: Calculate actual win streak
    };
    
    console.log(`💼 Portfolio Summary:`);
    console.log(`  Cash balance: $${balance.toFixed(2)}`);
    console.log(`  Position value: $${(totalValue - balance).toFixed(2)}`);
    console.log(`  Total value: $${totalValue.toFixed(2)}`);
    console.log(`  Realized PnL (ledger): $${balance.toFixed(2)}`);
    console.log(`  Unrealized PnL: $${(totalValue - balance).toFixed(2)}`);
    console.log(`  All-time PnL: $${totalValue.toFixed(2)}`);
    console.log(`  Win rate: ${winRate.toFixed(1)}%`);
    console.log(`✓ Dashboard ready - ${totalTrades} trades, $${totalVolume.toFixed(2)} volume`);
    console.log(`=== Complete ===`);
    
    const dashboardData = {
      profile: {
        username: username,
        profileImage: userInfo.profileImage,
        bio: userInfo.bio,
        walletAddress: userInfo.wallet
      },
      stats,
      pnlHistory,
      positions: processedPositions,
      recentTrades: processedTrades.slice(0, 10),
      achievements: [
        {
          id: "first_trade",
          name: "First Trade",
          description: "Complete your first trade",
          icon: "star",
          unlocked: totalTrades > 0,
          progress: Math.min(totalTrades, 1),
          total: 1
        }
      ]
    };
    
    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default app;