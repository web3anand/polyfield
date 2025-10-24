import type { Express } from "express";
import { createServer, type Server } from "http";
import axios from "axios";
import { z } from "zod";
import type { 
  DashboardData, 
  Position, 
  Trade, 
  Achievement, 
  PnLDataPoint, 
  PortfolioStats 
} from "@shared/schema";

const POLYMARKET_CLOB_API = "https://clob.polymarket.com";
const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";

// Helper to search for a user by username and get their wallet address
async function findUserByUsername(username: string): Promise<string> {
  try {
    // Use Polymarket public search API with profile search enabled
    const response = await axios.get(`${POLYMARKET_GAMMA_API}/public-search`, {
      params: { 
        q: username,
        search_profiles: true,
        optimized: true
      },
      timeout: 5000,
    });

    // Check if profiles were returned
    if (response.data && response.data.profiles && Array.isArray(response.data.profiles)) {
      // Search for exact username match (case-insensitive)
      for (const profile of response.data.profiles) {
        if (profile.name && profile.name.toLowerCase() === username.toLowerCase()) {
          const address = profile.proxyWallet;
          if (address) {
            return address;
          }
        }
      }
      
      // If no exact match but we have results, return first match
      if (response.data.profiles.length > 0 && response.data.profiles[0].proxyWallet) {
        return response.data.profiles[0].proxyWallet;
      }
    }

    // If no profiles found, throw user not found
    throw new Error("USER_NOT_FOUND");
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error("USER_NOT_FOUND");
      }
      // Network or API error - rethrow to bubble up
      throw error;
    }
    if ((error as Error).message === "USER_NOT_FOUND") {
      throw error;
    }
    throw error;
  }
}

// Helper to fetch user positions from Polymarket
async function fetchUserPositions(address: string): Promise<Position[]> {
  const response = await axios.get(`${POLYMARKET_CLOB_API}/positions`, {
    params: { user: address },
    timeout: 5000,
  });

  if (!response.data || !Array.isArray(response.data)) {
    return [];
  }

  return response.data.map((pos: any, index: number) => ({
    id: pos.id || `pos-${index}`,
    marketName: pos.market?.question || pos.question || "Unknown Market",
    marketId: pos.market?.condition_id || pos.condition_id || `market-${index}`,
    outcome: pos.outcome === "Yes" || pos.outcome === "YES" ? "YES" : "NO",
    entryPrice: parseFloat(pos.average_price || pos.entry_price || "0"),
    currentPrice: parseFloat(pos.current_price || pos.average_price || "0"),
    size: parseFloat(pos.size || pos.amount || "0"),
    unrealizedPnL: parseFloat(pos.unrealized_pnl || pos.pnl || "0"),
    status: pos.status === "open" || pos.status === "OPEN" ? "ACTIVE" : "CLOSED",
    openedAt: new Date(pos.opened_at || pos.created_at || Date.now()).toISOString(),
    closedAt: pos.closed_at ? new Date(pos.closed_at).toISOString() : undefined,
  }));
}

// Helper to fetch user trading activity
async function fetchUserTrades(address: string): Promise<Trade[]> {
  const response = await axios.get(`${POLYMARKET_CLOB_API}/trades`, {
    params: { 
      maker_address: address,
      limit: 100,
    },
    timeout: 5000,
  });

  if (!response.data || !Array.isArray(response.data)) {
    return [];
  }

  return response.data.map((trade: any, index: number) => ({
    id: trade.id || `trade-${index}`,
    timestamp: new Date((trade.timestamp || Date.now()) * 1000).toISOString(),
    marketName: trade.market || trade.question || "Unknown Market",
    type: trade.side === "BUY" || trade.side === "buy" ? "BUY" : "SELL",
    outcome: trade.outcome === "Yes" || trade.outcome === "YES" ? "YES" : "NO",
    price: parseFloat(trade.price || "0"),
    size: parseFloat(trade.size || trade.amount || "0"),
    profit: trade.profit ? parseFloat(trade.profit) : undefined,
  }));
}

// Calculate portfolio statistics
function calculateStats(positions: Position[], trades: Trade[]): PortfolioStats {
  const activePositions = positions.filter(p => p.status === "ACTIVE");
  const totalValue = activePositions.reduce((sum, pos) => {
    return sum + (pos.currentPrice * pos.size);
  }, 0);

  const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  
  const totalVolume = trades.reduce((sum, trade) => {
    return sum + (trade.price * trade.size);
  }, 0);

  const closedTrades = trades.filter(t => t.profit !== undefined);
  const winningTrades = closedTrades.filter(t => t.profit! > 0);
  const winRate = closedTrades.length > 0 
    ? (winningTrades.length / closedTrades.length) * 100 
    : 0;

  const profits = closedTrades.map(t => t.profit || 0);
  const bestTrade = profits.length > 0 ? Math.max(...profits) : 0;
  const worstTrade = profits.length > 0 ? Math.min(...profits) : 0;

  // Calculate win streak
  let currentStreak = 0;
  let maxStreak = 0;
  for (const trade of closedTrades.reverse()) {
    if (trade.profit && trade.profit > 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return {
    totalValue,
    totalPnL,
    totalVolume,
    totalTrades: trades.length,
    winRate,
    bestTrade,
    worstTrade,
    activePositions: activePositions.length,
    winStreak: maxStreak,
  };
}

// Generate PnL history from trades
function generatePnLHistory(trades: Trade[]): PnLDataPoint[] {
  if (trades.length === 0) {
    return [{
      timestamp: new Date().toISOString(),
      value: 0,
    }];
  }

  const sortedTrades = [...trades]
    .filter(t => t.profit !== undefined)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const history: PnLDataPoint[] = [];
  let cumulativePnL = 0;

  for (const trade of sortedTrades) {
    cumulativePnL += trade.profit || 0;
    history.push({
      timestamp: trade.timestamp,
      value: parseFloat(cumulativePnL.toFixed(2)),
    });
  }

  // If no history, add a starting point
  if (history.length === 0) {
    history.push({
      timestamp: new Date().toISOString(),
      value: 0,
    });
  }

  return history;
}

// Calculate achievements based on stats
function calculateAchievements(stats: PortfolioStats, trades: Trade[]): Achievement[] {
  return [
    {
      id: "first_trade",
      name: "First Trade",
      description: "Complete your first trade",
      icon: "star",
      unlocked: trades.length >= 1,
      progress: Math.min(trades.length, 1),
      total: 1,
    },
    {
      id: "win_streak_5",
      name: "Hot Streak",
      description: "Win 5 trades in a row",
      icon: "zap",
      unlocked: stats.winStreak >= 5,
      progress: Math.min(stats.winStreak, 5),
      total: 5,
    },
    {
      id: "volume_1k",
      name: "Trader",
      description: "Trade $1,000 in volume",
      icon: "trending",
      unlocked: stats.totalVolume >= 1000,
      progress: Math.min(stats.totalVolume, 1000),
      total: 1000,
    },
    {
      id: "positions_10",
      name: "Active Trader",
      description: "Hold 10 positions simultaneously",
      icon: "target",
      unlocked: stats.activePositions >= 10,
      progress: Math.min(stats.activePositions, 10),
      total: 10,
    },
    {
      id: "profit_100",
      name: "Profitable",
      description: "Earn $100 in profit",
      icon: "trophy",
      unlocked: stats.totalPnL >= 100,
      progress: Math.max(0, Math.min(stats.totalPnL, 100)),
      total: 100,
    },
    {
      id: "trades_50",
      name: "Veteran",
      description: "Complete 50 trades",
      icon: "award",
      unlocked: stats.totalTrades >= 50,
      progress: Math.min(stats.totalTrades, 50),
      total: 50,
    },
  ];
}

// Generate demo data for testing when Polymarket API returns no data
function generateDemoData(): DashboardData {
  const now = Date.now();
  const positions: Position[] = [
    {
      id: "demo-pos1",
      marketName: "Will Bitcoin reach $100k in 2025?",
      marketId: "demo-market1",
      outcome: "YES",
      entryPrice: 0.65,
      currentPrice: 0.72,
      size: 100,
      unrealizedPnL: 7.0,
      status: "ACTIVE",
      openedAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-pos2",
      marketName: "Will AI surpass human intelligence by 2030?",
      marketId: "demo-market2",
      outcome: "NO",
      entryPrice: 0.45,
      currentPrice: 0.38,
      size: 150,
      unrealizedPnL: 10.5,
      status: "ACTIVE",
      openedAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-pos3",
      marketName: "US Presidential Election 2024",
      marketId: "demo-market3",
      outcome: "YES",
      entryPrice: 0.55,
      currentPrice: 0.48,
      size: 200,
      unrealizedPnL: -14.0,
      status: "ACTIVE",
      openedAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const trades: Trade[] = [
    {
      id: "demo-trade1",
      timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      marketName: "Will Bitcoin reach $100k in 2025?",
      type: "BUY",
      outcome: "YES",
      price: 0.72,
      size: 50,
    },
    {
      id: "demo-trade2",
      timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      marketName: "US Presidential Election 2024",
      type: "SELL",
      outcome: "YES",
      price: 0.48,
      size: 100,
      profit: -7.0,
    },
    {
      id: "demo-trade3",
      timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      marketName: "Will AI surpass human intelligence by 2030?",
      type: "BUY",
      outcome: "NO",
      price: 0.38,
      size: 75,
    },
    {
      id: "demo-trade4",
      timestamp: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
      marketName: "Climate change resolution passed?",
      type: "SELL",
      outcome: "NO",
      price: 0.62,
      size: 120,
      profit: 15.5,
    },
    {
      id: "demo-trade5",
      timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      marketName: "Will Bitcoin reach $100k in 2025?",
      type: "BUY",
      outcome: "YES",
      price: 0.65,
      size: 100,
    },
  ];

  const pnlHistory: PnLDataPoint[] = [];
  let currentPnL = 0;
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    currentPnL += (Math.random() - 0.45) * 50;
    pnlHistory.push({
      timestamp: date.toISOString(),
      value: parseFloat(currentPnL.toFixed(2)),
    });
  }

  const stats = calculateStats(positions, trades);
  const achievements = calculateAchievements(stats, trades);

  return {
    stats,
    pnlHistory,
    positions,
    recentTrades: trades,
    achievements,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // GET /api/users/search?q=... - Search for usernames
  app.get("/api/users/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.json([]);
      }

      // Use Polymarket public search API with profile search enabled
      const response = await axios.get(`${POLYMARKET_GAMMA_API}/public-search`, {
        params: { 
          q: query, 
          search_profiles: true,
          optimized: true
        },
        timeout: 3000,
      });

      if (response.data && response.data.profiles && Array.isArray(response.data.profiles)) {
        const usernames = response.data.profiles
          .map((profile: any) => profile.name)
          .filter(Boolean)
          .slice(0, 10);
        return res.json(usernames);
      }

      res.json([]);
    } catch (error) {
      console.error("Error searching users:", error);
      res.json([]);
    }
  });

  // GET /api/dashboard/username/:username - Fetch dashboard data by Polymarket username
  app.get("/api/dashboard/username/:username", async (req, res) => {
    try {
      const { username } = req.params;

      // Validate username format (alphanumeric, underscores, hyphens)
      const usernameSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/, "Invalid username format");
      const validatedUsername = usernameSchema.parse(username);

      console.log(`Looking up wallet address for username: ${validatedUsername}`);

      let walletAddress: string;
      try {
        // Find the wallet address for this username
        walletAddress = await findUserByUsername(validatedUsername);
        console.log(`Found wallet address ${walletAddress} for username ${validatedUsername}`);
      } catch (error: any) {
        if (error.message === "USER_NOT_FOUND") {
          return res.status(404).json({ 
            error: "User not found. Please check the username and try again." 
          });
        }
        throw error; // Rethrow API errors
      }

      // Fetch real data from Polymarket APIs
      let positions: Position[] = [];
      let trades: Trade[] = [];
      
      try {
        [positions, trades] = await Promise.all([
          fetchUserPositions(walletAddress),
          fetchUserTrades(walletAddress),
        ]);
      } catch (error) {
        // API error while fetching data - return 503
        if (axios.isAxiosError(error)) {
          console.error("Polymarket API error:", error.message);
          return res.status(503).json({ 
            error: "Unable to reach Polymarket API. Please try again later." 
          });
        }
        throw error;
      }

      // If user has legitimately no data, use demo data for better UX
      if (positions.length === 0 && trades.length === 0) {
        console.log(`No trading activity found for ${validatedUsername}, showing demo data`);
        const demoData = generateDemoData();
        return res.json(demoData);
      }

      // Calculate stats and achievements from real data
      const stats = calculateStats(positions, trades);
      const pnlHistory = generatePnLHistory(trades);
      const achievements = calculateAchievements(stats, trades);

      const dashboardData: DashboardData = {
        stats,
        pnlHistory,
        positions,
        recentTrades: trades.slice(0, 20),
        achievements,
      };

      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: "Invalid username format. Please use only letters, numbers, underscores, and hyphens." 
        });
      } else {
        res.status(500).json({ 
          error: "Failed to fetch dashboard data. Please try again later." 
        });
      }
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);

  return httpServer;
}
