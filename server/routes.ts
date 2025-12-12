import type { Express } from "express";
import { createServer, type Server } from "http";
import axios from "axios";
import { z } from "zod";
import sqlite3 from "sqlite3";
import path from "path";
import type {
  DashboardData,
  Position,
  Trade,
  Achievement,
  PnLDataPoint,
  PortfolioStats,
} from "@shared/schema";
import { fetchUserPnLData, generateFullPnLHistory } from "../api/utils/polymarket-pnl";

// Simple in-memory cache and rate limiting
const cache = new Map<string, { data: any; timestamp: number }>();
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
// Track ongoing requests to prevent duplicate fetches
const ongoingRequests = new Map<string, Promise<any>>();

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

// Helper to search for a user by username and get their wallet address and profile
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
          const result = {
            wallet: walletAddress,
            profileImage: profile.profileImage || profile.profile_image,
            bio: profile.bio,
          };
          // Cache the result
          if (!skipCache) {
            profileCache.set(username.toLowerCase(), { data: result, timestamp: Date.now() });
          }
          return result;
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
            const result = {
              wallet,
              profileImage: profile.profileImage || profile.profile_image,
              bio: profile.bio,
            };
            // Cache the result
            if (!skipCache) {
              profileCache.set(username.toLowerCase(), { data: result, timestamp: Date.now() });
            }
            return result;
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
    const cacheKey = `positions_v2_${address}`; // v2 to bust old cache
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

      const allPositions = response.data.map((pos: any, index: number) => {
        // Extract slug from various possible fields
        const slug = pos.slug || pos.market?.slug || pos.eventSlug || pos.market?.eventSlug || pos.market?.id;
        // Condition ID for the tid parameter
        const conditionId = pos.conditionId || pos.market?.condition_id || pos.condition_id || pos.market?.conditionId;
        
        return {
          id: pos.asset || pos.id || `pos-${index}`,
          marketName: pos.title || pos.market?.question || pos.market?.title || "Unknown Market",
          marketId: conditionId || `market-${index}`,
          marketSlug: slug, // Use slug for URL (same for event and market in Polymarket format)
          eventSlug: slug, // Same as marketSlug per Polymarket URL structure
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
        };
      });

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

          const batchPositions = response.data.map((pos: any, index: number) => {
            // Extract slug from various possible fields
            const slug = pos.slug || pos.market?.slug || pos.eventSlug || pos.market?.eventSlug || pos.market?.id;
            // Condition ID for the tid parameter
            const conditionId = pos.conditionId || pos.market?.condition_id || pos.condition_id || pos.market?.conditionId;
            
            return {
              id: pos.asset || pos.id || `pos-${offset + index}`,
              marketName: pos.title || pos.market?.question || pos.market?.title || "Unknown Market",
              marketId: conditionId || `market-${offset + index}`,
              marketSlug: slug, // Use slug for URL (same for event and market in Polymarket format)
              eventSlug: slug, // Same as marketSlug per Polymarket URL structure
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
            };
          });

          if (batchCount === 0 && batchPositions.length > 0) {
            console.log(`Sample position: ${batchPositions[0].marketName}`);
            console.log(`  eventSlug: ${batchPositions[0].eventSlug}`);
            console.log(`  marketSlug: ${batchPositions[0].marketSlug}`);
          }

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
  // Check cache first
  const cacheKey = `activity_${address}`;
  const cached = getCached<any[]>(cacheKey, 300000); // 5 minute cache
  if (cached) {
    console.log(`Using cached activity for ${address}`);
    return cached;
  }

  console.log(`Fetching recent activity for ${address} (optimized)...`);
  
  try {
    // Fetch recent activity for chart - API limit: offset max 10,000, limit max 500
    const response = await axios.get(`${POLYMARKET_DATA_API}/activity`, {
      params: {
        user: address,
        limit: 100, // Only 100 events for fast response
        offset: 0,
      },
      timeout: 2000, // 2 second timeout
    });

    const activityData = response.data || [];
    console.log(`Fetched ${activityData.length} recent activity events`);
    
    // Cache the result
    setCache(cacheKey, activityData);
    return activityData;
    
  } catch (error) {
    console.error("Error fetching activity:", error);
    // Return cached data if available
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
function calculateRealizedPnLFromTrades(trades: Trade[]): { 
  realizedPnL: number; 
  winRate: number; 
  bestTrade: number; 
  worstTrade: number; 
  winStreak: number;
  tradesWithPnL: Trade[]; // Return trades with PnL attached to SELL trades
} {
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
  const tradePnLMap = new Map<string, number>(); // Map trade ID to PnL
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
        
        // Store PnL for this sell trade
        tradePnLMap.set(sell.id, pnl);
        
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

  // Attach PnL to trades
  const tradesWithPnL = trades.map(trade => {
    if (trade.type === "SELL" && tradePnLMap.has(trade.id)) {
      return {
        ...trade,
        profit: parseFloat(tradePnLMap.get(trade.id)!.toFixed(2))
      };
    }
    return trade;
  });

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
    tradesWithPnL,
  };
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

// Calculate portfolio statistics - accepts pre-fetched PnL data to avoid duplicate fetches
async function calculateStatsWithPnLData(
  positions: Position[],
  trades: Trade[],
  activity: any[] = [],
  walletAddress?: string,
  pnlData?: any | null,
  leaderboardVolume?: { volume: number; xUsername?: string; rank?: string },
): Promise<PortfolioStats> {
  const activePositions = positions.filter((p) => p.status === "ACTIVE");

  let realizedPnL = 0;
  let unrealizedPnL = 0;
  let portfolioValue = 0;
  let closedPositions = 0;
  let closedPositionsHistory: any[] | undefined = undefined;

  // Use pre-fetched PnL data if available, otherwise use fallback
  if (pnlData && walletAddress) {
    realizedPnL = pnlData.realizedPnl || 0;
    unrealizedPnL = pnlData.unrealizedPnl || 0;
    portfolioValue = pnlData.portfolioValue || 0;
    closedPositions = pnlData.closedPositions || 0;
    closedPositionsHistory = pnlData.closedPositionsHistory;
    
    console.log(`\n💼 Portfolio Summary (from PnL API):`);
    console.log(`  Portfolio value: $${portfolioValue.toFixed(2)}`);
    console.log(`  Realized PnL: $${realizedPnL.toFixed(2)}`);
    console.log(`  Unrealized PnL: $${unrealizedPnL.toFixed(2)}`);
    console.log(`  Total PnL: $${(realizedPnL + unrealizedPnL).toFixed(2)}`);
    console.log(`  Closed Positions: ${closedPositions}`);
  } else {
    // Fallback to old calculation method
    const { cashBalance, realizedPnL: ledgerRealizedPnL } = calculateBalanceFromActivity(activity);
    const tradeMetrics = calculateRealizedPnLFromTrades(trades);
    
    realizedPnL = tradeMetrics.realizedPnL;
    unrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    
    const positionValue = activePositions.reduce((sum, pos) => {
      return sum + pos.currentPrice * pos.size;
    }, 0);
    portfolioValue = cashBalance + positionValue;
    closedPositions = positions.filter((p) => p.status === "CLOSED").length;
    console.log(`\n💼 Portfolio Summary (from fallback calculation):`);
    console.log(`  Portfolio value: $${portfolioValue.toFixed(2)}`);
    console.log(`  Realized PnL: $${realizedPnL.toFixed(2)}`);
    console.log(`  Unrealized PnL: $${unrealizedPnL.toFixed(2)}`);
  }

  const totalPnL = realizedPnL + unrealizedPnL;

  // Calculate trade metrics
  const tradeMetrics = calculateRealizedPnLFromTrades(trades);
  
  // Use leaderboard volume if available, otherwise calculate from trades as fallback
  let totalVolume = (leaderboardVolume && leaderboardVolume.volume) || 0;
  if (totalVolume === 0 && trades.length > 0) {
    console.log('   ⚠ Leaderboard volume is 0, calculating from trades as fallback...');
    totalVolume = trades.reduce((sum, trade) => {
      return sum + trade.price * trade.size;
    }, 0);
    console.log(`   ✓ Fallback volume from trades: $${totalVolume.toLocaleString()}`);
  }

  // Calculate best trade from closed positions (most accurate - uses actual realized PnL)
  // Try multiple sources: allClosedPositions (from subgraph), closedPositionsHistory (from API), then fallback
  let bestTrade = 0;
  let worstTrade = 0;
  
  // First try: Use allClosedPositions from subgraph (most accurate, has all positions)
  // Note: allClosedPositions from subgraph already has realizedPnl in USD (already scaled)
  if (pnlData && pnlData.allClosedPositions && pnlData.allClosedPositions.length > 0) {
    const positionPnLs = pnlData.allClosedPositions
      .map((p: any) => {
        // The realizedPnl from subgraph is already in USD (scaled by COLLATERAL_SCALE in fetchRealizedPnl)
        return parseFloat(p.realizedPnl || 0);
      })
      .filter((pnl: number) => Math.abs(pnl) > 0.01);
    
    if (positionPnLs.length > 0) {
      bestTrade = Math.max(...positionPnLs);
      worstTrade = Math.min(...positionPnLs);
      console.log(`✓ Best trade from subgraph: $${bestTrade.toFixed(2)}, Worst: $${worstTrade.toFixed(2)} (from ${positionPnLs.length} positions)`);
    }
  }
  
  // Second try: Use closedPositionsHistory from API if subgraph data not available
  if (bestTrade === 0 && closedPositionsHistory && closedPositionsHistory.length > 0) {
    const positionPnLs = closedPositionsHistory
      .map((p: any) => parseFloat(p.realizedPnl || 0))
      .filter((pnl: number) => Math.abs(pnl) > 0.01);
    
    if (positionPnLs.length > 0) {
      bestTrade = Math.max(...positionPnLs);
      worstTrade = Math.min(...positionPnLs);
      console.log(`✓ Best trade from API closed positions: $${bestTrade.toFixed(2)} (from ${positionPnLs.length} positions)`);
    }
  }
  
  // Fallback to trade-based metrics if no closed positions available
  if (!bestTrade && !worstTrade && trades.length > 0) {
    bestTrade = tradeMetrics.bestTrade;
    worstTrade = tradeMetrics.worstTrade;
    console.log(`✓ Best trade from trades (fallback): $${bestTrade.toFixed(2)}`);
  } else if (!bestTrade && !worstTrade && positions.length > 0) {
    // Last resort: use unrealized PnL from active positions
    const unrealizedPnLs = positions.map(p => p.unrealizedPnL).filter(pnl => Math.abs(pnl) > 0.01);
    if (unrealizedPnLs.length > 0) {
      bestTrade = Math.max(...unrealizedPnLs);
      worstTrade = Math.min(...unrealizedPnLs);
    }
  }
  
  const winRate = trades.length > 0 ? tradeMetrics.winRate : 0;
  const winStreak = trades.length > 0 ? tradeMetrics.winStreak : 0;

  return {
    totalValue: portfolioValue,
    totalPnL,
    realizedPnL,
    unrealizedPnL,
    totalVolume,
    totalTrades: trades.length,
    winRate,
    bestTrade,
    worstTrade,
    activePositions: activePositions.length,
    closedPositions,
    openPositionsValue: portfolioValue,
    winStreak,
    closedPositionsHistory, // Add the history data
  } as any; // Type assertion to allow the new field
}

// Legacy function for backwards compatibility
async function calculateStats(
  positions: Position[],
  trades: Trade[],
  activity: any[] = [],
  walletAddress?: string,
): Promise<PortfolioStats> {
  return calculateStatsWithPnLData(positions, trades, activity, walletAddress, null);
}

// Generate PnL history from activity ledger (optimized for performance)
// Updated to show actual total PnL with final point from accurate API
function generatePnLHistory(closedPositions: any[] | undefined, finalTotalPnL?: number): PnLDataPoint[] {
  // Use closed positions with timestamps to build PnL history
  if (!closedPositions || closedPositions.length === 0) {
    // No historical data - just show current value
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return [
      {
        timestamp: oneDayAgo.toISOString(),
        value: finalTotalPnL || 0,
      },
      {
        timestamp: now.toISOString(),
        value: finalTotalPnL || 0,
      }
    ];
  }

  console.log(`📊 Building PnL history from ${closedPositions.length} closed positions...`);
  
  // Sort by endDate (oldest first)
  const sorted = [...closedPositions]
    .filter(p => p.endDate)
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  
  // Build cumulative PnL over time
  let cumulativePnL = 0;
  const history: PnLDataPoint[] = [];
  
  sorted.forEach(position => {
    cumulativePnL += position.realizedPnl || 0;
    history.push({
      timestamp: position.endDate,
      value: parseFloat(cumulativePnL.toFixed(2))
    });
  });
  
  // Add current point with accurate total PnL if provided
  history.push({
    timestamp: new Date().toISOString(),
    value: finalTotalPnL !== undefined ? finalTotalPnL : cumulativePnL
  });
  
  console.log(`   ✓ Generated ${history.length} data points from ${sorted[0]?.endDate} to now`);
  
  return history;
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
      unlocked: (stats.winStreak ?? 0) >= 5,
      progress: Math.min((stats.winStreak ?? 0), 5),
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
async function generateDemoData(): Promise<DashboardData> {
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

  const stats = await calculateStats(positions, trades, []);
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
        const userResults = profiles
          .map((profile: any) => {
            let username = null;
            for (const field of possibleNameFields) {
              if (profile[field]) {
                username = profile[field];
                break;
              }
            }
            if (!username) return null;
            
            return {
              username,
              profileImage: profile.profileImage || profile.profile_image
            };
          })
          .filter(Boolean)
          .slice(0, 10);
        
        // Cache the result
        setCache(cacheKey, userResults);
        return res.json(userResults);
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
}