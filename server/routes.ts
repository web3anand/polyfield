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
  PortfolioStats,
} from "@shared/schema";

// Simple in-memory cache and rate limiting
const cache = new Map<string, { data: any; timestamp: number }>();
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limiting helper
function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = rateLimitMap.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}

// Cache helper
function getCached<T>(key: string, ttlMs: number = 30000): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.data;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

const POLYMARKET_DATA_API = "https://data-api.polymarket.com";
const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";

// Helper to search for a user by username and get their wallet address and profile
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

    // Log the full response structure for debugging
    console.log("API Response status:", response.status);
    console.log("API Response data keys:", Object.keys(response.data || {}));

    // Try multiple possible response structures
    let profiles: any[] = [];

    // Check different possible response structures
    if (Array.isArray(response.data)) {
      // Response is directly an array
      profiles = response.data;
      console.log("Profiles found in root array, count:", profiles.length);
    } else if (
      response.data?.profiles &&
      Array.isArray(response.data.profiles)
    ) {
      // Response has profiles array
      profiles = response.data.profiles;
      console.log("Profiles found in data.profiles, count:", profiles.length);
    } else if (
      response.data?.data?.profiles &&
      Array.isArray(response.data.data.profiles)
    ) {
      // Response has nested data.profiles
      profiles = response.data.data.profiles;
      console.log(
        "Profiles found in data.data.profiles, count:",
        profiles.length,
      );
    } else if (response.data?.results && Array.isArray(response.data.results)) {
      // Response has results array
      profiles = response.data.results;
      console.log("Profiles found in data.results, count:", profiles.length);
    }

    if (profiles.length > 0) {
      console.log(
        "First profile structure:",
        JSON.stringify(profiles[0], null, 2),
      );

      // Try different field names for username and wallet
      const possibleNameFields = [
        "name",
        "username",
        "displayName",
        "handle",
        "pseudonym",
      ];
      const possibleWalletFields = [
        "proxyWallet",
        "wallet",
        "address",
        "walletAddress",
      ];

      // Search for exact match
      for (const profile of profiles) {
        let profileName: string | undefined;
        let walletAddress: string | undefined;

        // Find the username field
        for (const field of possibleNameFields) {
          if (profile[field]) {
            profileName = profile[field];
            break;
          }
        }

        // Find the wallet field
        for (const field of possibleWalletFields) {
          if (profile[field]) {
            walletAddress = profile[field];
            break;
          }
        }

        if (
          profileName &&
          walletAddress &&
          profileName.toLowerCase() === username.toLowerCase()
        ) {
          console.log(
            `✓ Exact match found: ${profileName} -> ${walletAddress}`,
          );
          return {
            wallet: walletAddress,
            profileImage: profile.profileImage || profile.profile_image,
            bio: profile.bio,
          };
        }
      }

      // If no exact match, return first profile with wallet
      for (const profile of profiles) {
        for (const field of possibleWalletFields) {
          if (profile[field]) {
            const wallet = profile[field];
            const name =
              possibleNameFields.map((f) => profile[f]).find(Boolean) ||
              "unknown";
            console.log(`→ Using first match: ${name} -> ${wallet}`);
            return {
              wallet,
              profileImage: profile.profileImage || profile.profile_image,
              bio: profile.bio,
            };
          }
        }
      }
    }

    console.log("✗ No profiles found with wallet address");
    throw new Error("USER_NOT_FOUND");
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Profile search API error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
      });

      if (error.response?.status === 404) {
        throw new Error("USER_NOT_FOUND");
      }
      throw error;
    }
    if ((error as Error).message === "USER_NOT_FOUND") {
      throw error;
    }
    throw error;
  }
}

// Helper to fetch user positions from Polymarket with optimized pagination
async function fetchUserPositions(address: string): Promise<Position[]> {
  try {
    // Check cache first
    const cacheKey = `positions_${address}`;
    const cached = getCached<Position[]>(cacheKey, 300000); // 5 minute cache
    if (cached) {
      console.log(`Using cached positions for ${address}`);
      return cached;
    }

    console.log(`Fetching positions for ${address} (single batch approach)...`);
    
    try {
      // Try to fetch everything in one large request first
      console.log(`Attempting single large fetch (limit: 1000)`);
      
      const response = await axios.get(`${POLYMARKET_DATA_API}/positions`, {
        params: { 
          user: address,
          limit: 1000, // Try to get up to 1000 positions in one go
          offset: 0,
        },
        timeout: 10000, // Longer timeout for large request
      });

      if (!response.data || !Array.isArray(response.data)) {
        console.log("No positions data returned");
        return [];
      }

      const allPositions = response.data.map((pos: any, index: number) => ({
        id: pos.asset || pos.id || `pos-${index}`,
        marketName: pos.title || pos.market?.question || "Unknown Market",
        marketId: pos.conditionId || pos.market?.condition_id || `market-${index}`,
        outcome: (pos.outcome === "YES" || pos.outcome === "NO" ? pos.outcome : "YES") as "YES" | "NO",
        entryPrice: parseFloat(pos.avgPrice || pos.average_price || "0"),
        currentPrice: parseFloat(pos.curPrice || pos.current_price || "0"),
        size: parseFloat(pos.size || "0"),
        unrealizedPnL: parseFloat(pos.cashPnl || pos.pnl || "0"),
        status: (parseFloat(pos.size || "0") > 0 ? "ACTIVE" : "CLOSED") as "ACTIVE" | "CLOSED",
        openedAt: pos.created_at
          ? new Date(pos.created_at).toISOString()
          : new Date().toISOString(),
        closedAt: pos.closed_at
          ? new Date(pos.closed_at).toISOString()
          : undefined,
      }));

      console.log(`Found ${allPositions.length} positions in single request`);
      
      // Cache the result
      setCache(cacheKey, allPositions);
      return allPositions;

    } catch (error) {
      console.log("Single request failed, falling back to minimal pagination...");
      
      // Fallback to minimal pagination if single request fails
      const allPositions: Position[] = [];
      let offset = 0;
      const limit = 500;
      let hasMore = true;
      let batchCount = 0;
      const maxBatches = 2; // Only 2 batches as fallback
      const maxPositions = 1000;

      while (hasMore && batchCount < maxBatches && allPositions.length < maxPositions) {
        try {
          console.log(`Fetching positions batch ${batchCount + 1} (offset: ${offset})`);
          
          const response = await axios.get(`${POLYMARKET_DATA_API}/positions`, {
            params: { 
              user: address,
              limit,
              offset,
            },
            timeout: 8000,
          });

          if (!response.data || !Array.isArray(response.data)) {
            console.log("No positions data returned in batch");
            break;
          }

          const batchPositions = response.data.map((pos: any, index: number) => ({
            id: pos.asset || pos.id || `pos-${offset + index}`,
            marketName: pos.title || pos.market?.question || "Unknown Market",
            marketId: pos.conditionId || pos.market?.condition_id || `market-${offset + index}`,
            outcome: (pos.outcome === "YES" || pos.outcome === "NO" ? pos.outcome : "YES") as "YES" | "NO",
            entryPrice: parseFloat(pos.avgPrice || pos.average_price || "0"),
            currentPrice: parseFloat(pos.curPrice || pos.current_price || "0"),
            size: parseFloat(pos.size || "0"),
            unrealizedPnL: parseFloat(pos.cashPnl || pos.pnl || "0"),
            status: (parseFloat(pos.size || "0") > 0 ? "ACTIVE" : "CLOSED") as "ACTIVE" | "CLOSED",
            openedAt: pos.created_at
              ? new Date(pos.created_at).toISOString()
              : new Date().toISOString(),
            closedAt: pos.closed_at
              ? new Date(pos.closed_at).toISOString()
              : undefined,
          }));

          allPositions.push(...batchPositions);
          console.log(`Batch ${batchCount + 1}: ${batchPositions.length} positions (total: ${allPositions.length})`);

          if (batchPositions.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
            batchCount++;
          }

        } catch (batchError) {
          console.error(`Error in positions batch ${batchCount + 1}:`, batchError);
          break;
        }
      }

      console.log(`Found total ${allPositions.length} positions across ${batchCount + 1} batches`);
      
      // Cache the result
      setCache(cacheKey, allPositions);
      return allPositions;
    }
  } catch (error) {
    console.error("Error fetching positions:", error);
    // Return cached data if available
    const cacheKey = `positions_${address}`;
    const cached = getCached<Position[]>(cacheKey, 600000); // 10 minute fallback
    return cached || [];
  }
}

// Helper to fetch user activity with optimized pagination
async function fetchUserActivity(address: string): Promise<any[]> {
  try {
    // Check cache first
    const cacheKey = `activity_${address}`;
    const cached = getCached<any[]>(cacheKey, 300000); // 5 minute cache
    if (cached) {
      console.log(`Using cached activity for ${address}`);
      return cached;
    }

    console.log(`Fetching activity for ${address} (single batch approach)...`);
    
    try {
      // Try to fetch everything in one large request first
      console.log(`Attempting single large fetch (limit: 1000)`);
      
      const response = await axios.get(`${POLYMARKET_DATA_API}/activity`, {
        params: {
          user: address,
          limit: 1000, // Try to get up to 1000 events in one go
          offset: 0,
        },
        timeout: 10000, // Longer timeout for large request
      });

      if (!response.data || !Array.isArray(response.data)) {
        console.log("No activity data returned");
        return [];
      }

      console.log(`Found ${response.data.length} activity events in single request`);
      
      // Cache the result
      setCache(cacheKey, response.data);
      return response.data;

    } catch (error) {
      console.log("Single request failed, falling back to minimal pagination...");
      
      // Fallback to minimal pagination if single request fails
      const allActivity: any[] = [];
      let offset = 0;
      const limit = 500;
      let hasMore = true;
      let batchCount = 0;
      const maxBatches = 2; // Only 2 batches as fallback
      const maxActivity = 1000;

      while (hasMore && batchCount < maxBatches && allActivity.length < maxActivity) {
        try {
          console.log(`Fetching activity batch ${batchCount + 1} (offset: ${offset})`);
          
          const response = await axios.get(`${POLYMARKET_DATA_API}/activity`, {
            params: {
              user: address,
              limit,
              offset,
            },
            timeout: 8000,
          });

          if (!response.data || !Array.isArray(response.data)) {
            console.log("No activity data returned in batch");
            break;
          }

          allActivity.push(...response.data);
          console.log(`Batch ${batchCount + 1}: ${response.data.length} events (total: ${allActivity.length})`);

          if (response.data.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
            batchCount++;
          }

        } catch (batchError) {
          console.error(`Error in activity batch ${batchCount + 1}:`, batchError);
          break;
        }
      }

      console.log(`Found total ${allActivity.length} activity events across ${batchCount + 1} batches`);
      
      // Cache the result
      setCache(cacheKey, allActivity);
      return allActivity;
    }
  } catch (error) {
    console.error("Error fetching activity:", error);
    // Return cached data if available
    const cacheKey = `activity_${address}`;
    const cached = getCached<any[]>(cacheKey, 600000); // 10 minute fallback
    return cached || [];
  }
}

// Helper to fetch user trading activity with optimized pagination
async function fetchUserTrades(address: string): Promise<Trade[]> {
  try {
    // Check cache first
    const cacheKey = `trades_${address}`;
    const cached = getCached<Trade[]>(cacheKey, 300000); // 5 minute cache
    if (cached) {
      console.log(`Using cached trades for ${address}`);
      return cached;
    }

    console.log(`Fetching trades for ${address} (single batch approach)...`);
    
    try {
      // Try to fetch everything in one large request first
      console.log(`Attempting single large fetch (limit: 1000)`);
      
      const response = await axios.get(`${POLYMARKET_DATA_API}/trades`, {
        params: {
          user: address,
          limit: 1000, // Try to get up to 1000 trades in one go
          offset: 0,
        },
        timeout: 10000, // Longer timeout for large request
      });

      if (!response.data || !Array.isArray(response.data)) {
        console.log("No trades data returned");
        return [];
      }

      const allTrades = response.data.map((trade: any, index: number) => ({
        id: trade.transactionHash || trade.id || `trade-${index}`,
        // Handle both seconds and milliseconds timestamps
        timestamp: new Date(
          trade.timestamp > 1e12 ? trade.timestamp : trade.timestamp * 1000,
        ).toISOString(),
        marketName: trade.title || trade.market || "Unknown Market",
        type: (trade.side === "BUY" || trade.side === "buy" ? "BUY" : "SELL") as "BUY" | "SELL",
        outcome: (trade.outcome === "YES" || trade.outcome === "NO" ? trade.outcome : "YES") as "YES" | "NO",
        price: parseFloat(trade.price || "0"),
        size: parseFloat(trade.size || "0"),
        profit: undefined, // Trades endpoint doesn't provide profit
      }));

      console.log(`Found ${allTrades.length} trades in single request`);
      
      // Cache the result
      setCache(cacheKey, allTrades);
      return allTrades;

    } catch (error) {
      console.log("Single request failed, falling back to minimal pagination...");
      
      // Fallback to minimal pagination if single request fails
      const allTrades: Trade[] = [];
      let offset = 0;
      const limit = 500;
      let hasMore = true;
      let batchCount = 0;
      const maxBatches = 2; // Only 2 batches as fallback
      const maxTrades = 1000;

      while (hasMore && batchCount < maxBatches && allTrades.length < maxTrades) {
        try {
          console.log(`Fetching trades batch ${batchCount + 1} (offset: ${offset})`);
          
          const response = await axios.get(`${POLYMARKET_DATA_API}/trades`, {
            params: {
              user: address,
              limit,
              offset,
            },
            timeout: 8000,
          });

          if (!response.data || !Array.isArray(response.data)) {
            console.log("No trades data returned in batch");
            break;
          }

          const batchTrades = response.data.map((trade: any, index: number) => ({
            id: trade.transactionHash || trade.id || `trade-${offset + index}`,
            // Handle both seconds and milliseconds timestamps
            timestamp: new Date(
              trade.timestamp > 1e12 ? trade.timestamp : trade.timestamp * 1000,
            ).toISOString(),
            marketName: trade.title || trade.market || "Unknown Market",
            type: (trade.side === "BUY" || trade.side === "buy" ? "BUY" : "SELL") as "BUY" | "SELL",
            outcome: (trade.outcome === "YES" || trade.outcome === "NO" ? trade.outcome : "YES") as "YES" | "NO",
            price: parseFloat(trade.price || "0"),
            size: parseFloat(trade.size || "0"),
            profit: undefined, // Trades endpoint doesn't provide profit
          }));

          allTrades.push(...batchTrades);
          console.log(`Batch ${batchCount + 1}: ${batchTrades.length} trades (total: ${allTrades.length})`);

          if (batchTrades.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
            batchCount++;
          }

        } catch (batchError) {
          console.error(`Error in trades batch ${batchCount + 1}:`, batchError);
          break;
        }
      }

      console.log(`Found total ${allTrades.length} trades across ${batchCount + 1} batches`);
      
      // Cache the result
      setCache(cacheKey, allTrades);
      return allTrades;
    }
  } catch (error) {
    console.error("Error fetching trades:", error);
    // Return cached data if available
    const cacheKey = `trades_${address}`;
    const cached = getCached<Trade[]>(cacheKey, 600000); // 10 minute fallback
    return cached || [];
  }
}

// Calculate cash balance and realized PnL from activity ledger (optimized)
function calculateBalanceFromActivity(activity: any[]): { cashBalance: number; realizedPnL: number; netDeposits: number } {
  let cashBalance = 0;
  let deposits = 0;
  let withdrawals = 0;

  // Only process recent activity for performance (last 1500 events)
  const recentActivity = activity.slice(0, 1500);
  console.log(`\n📊 Processing ${recentActivity.length} recent activity events for balance calculation`);

  for (const event of recentActivity) {
    const type = event.type?.toUpperCase();
    const usdcSize = parseFloat(event.usdcSize || "0");
    const side = event.side?.toUpperCase();

    // Track deposits and withdrawals
    if (type === "DEPOSIT" || (type === "CONVERSION" && usdcSize > 0)) {
      deposits += Math.abs(usdcSize);
      cashBalance += Math.abs(usdcSize);
    } else if (type === "WITHDRAW") {
      withdrawals += Math.abs(usdcSize);
      cashBalance -= Math.abs(usdcSize);
    }
    // Track trades (BUY spends cash, SELL adds cash)
    else if (type === "TRADE") {
      if (side === "BUY") {
        cashBalance -= usdcSize;
      } else if (side === "SELL") {
        cashBalance += usdcSize;
      }
    }
    // Track redeems and rewards (add cash but don't count as pure profit)
    else if (type === "REDEEM" || type === "REWARD" || type === "CLAIM") {
      cashBalance += usdcSize;
    }
    // Track fees (subtract from cash)
    else if (type === "FEE") {
      cashBalance -= Math.abs(usdcSize);
    }
  }

  const netDeposits = deposits - withdrawals;
  const realizedPnL = cashBalance - netDeposits;

  console.log(`📈 Activity Summary: $${deposits.toFixed(2)} deposits, $${withdrawals.toFixed(2)} withdrawals, $${realizedPnL.toFixed(2)} realized PnL`);

  return {
    cashBalance: parseFloat(cashBalance.toFixed(2)),
    realizedPnL: parseFloat(realizedPnL.toFixed(2)),
    netDeposits: parseFloat(netDeposits.toFixed(2)),
  };
}

// Calculate realized PnL from buy/sell trade pairs
function calculateRealizedPnLFromTrades(trades: Trade[]): { realizedPnL: number; winRate: number; bestTrade: number; worstTrade: number; winStreak: number } {
  // Group trades by market and outcome
  const marketPositions: Record<string, { buys: Trade[], sells: Trade[] }> = {};
  
  for (const trade of trades) {
    const key = `${trade.marketName}_${trade.outcome}`;
    if (!marketPositions[key]) {
      marketPositions[key] = { buys: [], sells: [] };
    }
    if (trade.type === "BUY") {
      marketPositions[key].buys.push(trade);
    } else {
      marketPositions[key].sells.push(trade);
    }
  }

  let totalRealizedPnL = 0;
  const tradePnLs: number[] = [];
  let wins = 0;
  let losses = 0;
  let currentStreak = 0;
  let maxStreak = 0;

  // Match buys with sells to calculate realized PnL
  for (const [key, { buys, sells }] of Object.entries(marketPositions)) {
    let remainingBuySize = 0;
    let avgBuyPrice = 0;
    let totalBuyCost = 0;

    // Calculate FIFO cost basis from buys
    for (const buy of buys.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())) {
      totalBuyCost += buy.price * buy.size;
      remainingBuySize += buy.size;
      avgBuyPrice = totalBuyCost / remainingBuySize;
    }

    // Match with sells
    for (const sell of sells.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())) {
      const sizeToMatch = Math.min(sell.size, remainingBuySize);
      if (sizeToMatch > 0) {
        const pnl = (sell.price - avgBuyPrice) * sizeToMatch;
        totalRealizedPnL += pnl;
        tradePnLs.push(pnl);
        
        if (pnl > 0) {
          wins++;
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else if (pnl < 0) {
          losses++;
          currentStreak = 0;
        }
        
        remainingBuySize -= sizeToMatch;
        totalBuyCost -= avgBuyPrice * sizeToMatch;
        if (remainingBuySize > 0) {
          avgBuyPrice = totalBuyCost / remainingBuySize;
        }
      }
    }
  }

  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const bestTrade = tradePnLs.length > 0 ? Math.max(...tradePnLs) : 0;
  const worstTrade = tradePnLs.length > 0 ? Math.min(...tradePnLs) : 0;

  return {
    realizedPnL: parseFloat(totalRealizedPnL.toFixed(2)),
    winRate: parseFloat(winRate.toFixed(1)),
    bestTrade: parseFloat(bestTrade.toFixed(2)),
    worstTrade: parseFloat(worstTrade.toFixed(2)),
    winStreak: maxStreak,
  };
}

// Calculate portfolio statistics
function calculateStats(
  positions: Position[],
  trades: Trade[],
  activity: any[] = [],
): PortfolioStats {
  const activePositions = positions.filter((p) => p.status === "ACTIVE");

  // Calculate balance from activity ledger
  const { cashBalance, realizedPnL: ledgerRealizedPnL, netDeposits } = calculateBalanceFromActivity(activity);

  // Calculate realized PnL from matched buy/sell trades
  const tradeMetrics = calculateRealizedPnLFromTrades(trades);

  // Portfolio value = cash + value of active positions
  const positionValue = activePositions.reduce((sum, pos) => {
    return sum + pos.currentPrice * pos.size;
  }, 0);
  
  const totalValue = cashBalance + positionValue;

  // All-time PnL: Use trade-based calculation as primary (more accurate for REDEEM events)
  // Ledger-based calculation is flawed because REDEEM includes both cost basis + profit
  const unrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  const totalPnL = tradeMetrics.realizedPnL + unrealizedPnL;

  const totalVolume = trades.reduce((sum, trade) => {
    return sum + trade.price * trade.size;
  }, 0);

  // Use trade-based metrics if we have trades, otherwise fall back to positions
  const winRate = trades.length > 0 ? tradeMetrics.winRate : 0;
  const bestTrade = trades.length > 0 ? tradeMetrics.bestTrade : (positions.length > 0 ? Math.max(...positions.map(p => p.unrealizedPnL)) : 0);
  const worstTrade = trades.length > 0 ? tradeMetrics.worstTrade : (positions.length > 0 ? Math.min(...positions.map(p => p.unrealizedPnL)) : 0);
  const winStreak = trades.length > 0 ? tradeMetrics.winStreak : 0;

  console.log(`\n💼 Portfolio Summary:`);
  console.log(`  Cash balance: $${cashBalance.toFixed(2)}`);
  console.log(`  Position value: $${positionValue.toFixed(2)}`);
  console.log(`  Total value: $${totalValue.toFixed(2)}`);
  console.log(`  Realized PnL (ledger): $${ledgerRealizedPnL.toFixed(2)}`);
  console.log(`  Realized PnL (trades): $${tradeMetrics.realizedPnL.toFixed(2)}`);
  console.log(`  Unrealized PnL: $${unrealizedPnL.toFixed(2)}`);
  console.log(`  All-time PnL: $${totalPnL.toFixed(2)}`);
  console.log(`  Win rate: ${winRate.toFixed(1)}%`);

  return {
    totalValue,
    totalPnL,
    totalVolume,
    totalTrades: trades.length,
    winRate,
    bestTrade,
    worstTrade,
    activePositions: activePositions.length,
    winStreak,
  };
}

// Generate PnL history from activity ledger (optimized for performance)
function generatePnLHistory(activity: any[]): PnLDataPoint[] {
  if (activity.length === 0) {
    return [{
      timestamp: new Date().toISOString(),
      value: 0,
    }];
  }

  // Only process recent activity for performance (last 1000 events)
  const recentActivity = activity.slice(0, 1000);
  
  // Sort activity by timestamp
  const sortedActivity = [...recentActivity].sort((a, b) => {
    const timeA = new Date(a.timestamp > 1e12 ? a.timestamp : a.timestamp * 1000).getTime();
    const timeB = new Date(b.timestamp > 1e12 ? b.timestamp : b.timestamp * 1000).getTime();
    return timeA - timeB;
  });

  // Track running cash balance and net deposits over time
  let cashBalance = 0;
  let deposits = 0;
  let withdrawals = 0;
  const history: PnLDataPoint[] = [];

  // Sample every 10th event to reduce data points
  for (let i = 0; i < sortedActivity.length; i += 10) {
    const event = sortedActivity[i];
    const type = event.type?.toUpperCase();
    const usdcSize = parseFloat(event.usdcSize || "0");
    const side = event.side?.toUpperCase();

    // Track deposits and withdrawals
    if (type === "DEPOSIT" || (type === "CONVERSION" && usdcSize > 0)) {
      deposits += Math.abs(usdcSize);
      cashBalance += Math.abs(usdcSize);
    } else if (type === "WITHDRAW") {
      withdrawals += Math.abs(usdcSize);
      cashBalance -= Math.abs(usdcSize);
    }
    // Track trades (BUY spends cash, SELL adds cash)
    else if (type === "TRADE") {
      if (side === "BUY") {
        cashBalance -= usdcSize;
      } else if (side === "SELL") {
        cashBalance += usdcSize;
      }
    }
    // Track redeems and rewards (add cash but note they include cost basis + profit)
    else if (type === "REDEEM" || type === "REWARD" || type === "CLAIM") {
      cashBalance += usdcSize;
    }
    // Track fees (subtract from cash)
    else if (type === "FEE") {
      cashBalance -= Math.abs(usdcSize);
    }

    // Add data point (showing realized PnL = cash balance - net deposits)
    const netDeposits = deposits - withdrawals;
    const realizedPnL = cashBalance - netDeposits;
    
    const timestamp = new Date(event.timestamp > 1e12 ? event.timestamp : event.timestamp * 1000).toISOString();
    
    history.push({
      timestamp,
      value: parseFloat(realizedPnL.toFixed(2)),
    });
  }

  // Add current point if we have history
  if (history.length > 0) {
    const lastValue = history[history.length - 1].value;
    history.push({
      timestamp: new Date().toISOString(),
      value: lastValue,
    });
  }

  return history.length > 0 ? history : [{
    timestamp: new Date().toISOString(),
    value: 0,
  }];
}

// Calculate achievements based on stats
function calculateAchievements(
  stats: PortfolioStats,
  trades: Trade[],
): Achievement[] {
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

// Generate demo data for testing
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

  const stats = calculateStats(positions, trades, []);
  const achievements = calculateAchievements(stats, trades);

  return {
    profile: {
      username: "demo_user",
      profileImage: undefined,
      bio: "Demo account for preview",
      walletAddress: "0x0000000000000000000000000000000000000000",
    },
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

      // Check cache first
      const cacheKey = `search_${query}`;
      const cached = getCached<string[]>(cacheKey, 30000); // 30 second cache
      if (cached) {
        return res.json(cached);
      }

      // Check rate limit (300 requests per 10s for GAMMA Search)
      if (!checkRateLimit('gamma_search', 20, 10000)) { // Conservative: 20 requests per 10s
        console.log('Rate limit exceeded for search, using cached data');
        const cached = getCached<string[]>(cacheKey, 300000);
        return res.json(cached || []);
      }

      const response = await axios.get(
        `${POLYMARKET_GAMMA_API}/public-search`,
        {
          params: {
            q: query,
            search_profiles: true,
          },
          timeout: 3000,
        },
      );

      // Try multiple response structures
      let profiles: any[] = [];

      if (Array.isArray(response.data)) {
        profiles = response.data;
      } else if (
        response.data?.profiles &&
        Array.isArray(response.data.profiles)
      ) {
        profiles = response.data.profiles;
      } else if (
        response.data?.data?.profiles &&
        Array.isArray(response.data.data.profiles)
      ) {
        profiles = response.data.data.profiles;
      } else if (
        response.data?.results &&
        Array.isArray(response.data.results)
      ) {
        profiles = response.data.results;
      }

      if (profiles.length > 0) {
        const possibleNameFields = [
          "name",
          "username",
          "displayName",
          "handle",
          "pseudonym",
        ];
        const usernames = profiles
          .map((profile: any) => {
            for (const field of possibleNameFields) {
              if (profile[field]) return profile[field];
            }
            return null;
          })
          .filter(Boolean)
          .slice(0, 10);
        
        // Cache the result
        setCache(cacheKey, usernames);
        return res.json(usernames);
      }

      res.json([]);
    } catch (error) {
      console.error("Error searching users:", error);
      // Return cached data if available
      const cacheKey = `search_${req.query.q}`;
      const cached = getCached<string[]>(cacheKey, 300000);
      res.json(cached || []);
    }
  });

  // GET /api/dashboard/username/:username - Fetch dashboard data by username
  app.get("/api/dashboard/username/:username", async (req, res) => {
    // Set a timeout for the entire request
    const requestTimeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: "Request timeout. The dashboard is taking too long to load. Please try again.",
        });
      }
    }, 15000); // 15 second timeout

    try {
      const { username } = req.params;

      const usernameSchema = z
        .string()
        .regex(/^[a-zA-Z0-9_-]+$/, "Invalid username format");
      const validatedUsername = usernameSchema.parse(username);

      console.log(`\n=== Fetching dashboard for: ${validatedUsername} ===`);

      let walletAddress: string = "";
      let profileImage: string | undefined;
      let bio: string | undefined;
      let useDemoData = false;
      
      try {
        const userProfile = await findUserByUsername(validatedUsername);
        walletAddress = userProfile.wallet;
        profileImage = userProfile.profileImage;
        bio = userProfile.bio;
        console.log(`✓ Wallet found: ${walletAddress}`);
      } catch (error: any) {
        if (error.message === "USER_NOT_FOUND") {
          console.log(`✗ User '${validatedUsername}' not found in Polymarket - using demo data`);
          useDemoData = true;
        } else {
          throw error;
        }
      }

      let positions: Position[] = [];
      let trades: Trade[] = [];
      let activity: any[] = [];

      // Only fetch real data if we have a wallet address
      if (!useDemoData && walletAddress) {
        try {
          // Use Promise.race to add timeout to the parallel requests
          const dataPromise = Promise.all([
            fetchUserPositions(walletAddress),
            fetchUserTrades(walletAddress),
            fetchUserActivity(walletAddress),
          ]);

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Data fetch timeout')), 10000);
          });

          [positions, trades, activity] = await Promise.race([dataPromise, timeoutPromise]) as [Position[], Trade[], any[]];
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            console.log(`API error: status ${status}`);

            if (status === 401 || status === 403 || status === 404) {
              console.log("→ Using demo data");
              useDemoData = true;
            } else {
              return res.status(503).json({
                error: "Unable to reach Polymarket API. Please try again later.",
              });
            }
          } else if (error instanceof Error && error.message === 'Data fetch timeout') {
            console.log("→ Data fetch timeout, using demo data");
            useDemoData = true;
          } else {
            throw error;
          }
        }
      }

      // Only use demo data if explicitly requested (user not found or API auth failed)
      if (useDemoData) {
        console.log("→ Returning demo data");
        const demoData = generateDemoData();
        clearTimeout(requestTimeout);
        return res.json(demoData);
      }

      const stats = calculateStats(positions, trades, activity);
      const pnlHistory = generatePnLHistory(activity);
      const achievements = calculateAchievements(stats, trades);

      const dashboardData: DashboardData = {
        profile: {
          username: validatedUsername,
          profileImage,
          bio,
          walletAddress,
        },
        stats,
        pnlHistory,
        positions,
        recentTrades: trades.slice(0, 20),
        achievements,
      };

      console.log(
        `✓ Dashboard ready - ${stats.totalTrades} trades, $${stats.totalVolume.toFixed(2)} volume`,
      );
      console.log("=== Complete ===\n");

      clearTimeout(requestTimeout);
      res.json(dashboardData);
    } catch (error) {
      clearTimeout(requestTimeout);
      console.error("Error fetching dashboard data:", error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          error:
            "Invalid username format. Please use only letters, numbers, underscores, and hyphens.",
        });
      } else {
        res.status(500).json({
          error: "Failed to fetch dashboard data. Please try again later.",
        });
      }
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
