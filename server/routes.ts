import type { Express } from "express";
import { createServer, type Server } from "http";
import axios from "axios";
import { z } from "zod";
import sqlite3 from "sqlite3";
import path from "path";
import { createClient } from '@supabase/supabase-js';
import type {
  DashboardData,
  Position,
  Trade,
  Achievement,
  PnLDataPoint,
  PortfolioStats,
} from "@shared/schema";
import { fetchUserPnLData, generateFullPnLHistory } from "../api/utils/polymarket-pnl";
import { getXUserAbout } from "../api/utils/x-api";

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

// Supabase configuration for leaderboard
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bzlxrggciehkcslchooe.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTM3NzcsImV4cCI6MjA4MDU4OTc3N30.vIcU83OafM_MGPRy-RjheuSQqkQNRw-RcaI2aDXH4gM';

// Helper function to query Supabase using REST API (more reliable than JS client in Node.js)
async function querySupabase(table: string, filters: { [key: string]: any } = {}, options: { orderBy?: string; ascending?: boolean; limit?: number; offset?: number } = {}) {
  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      url += `&${key}=eq.${encodeURIComponent(value)}`;
    });
    
    // Add ordering
    if (options.orderBy) {
      url += `&order=${options.orderBy}.${options.ascending !== false ? 'asc' : 'desc'}`;
    }
    
    // Build headers
    const headers: any = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
    
    // Add pagination using Range header (Supabase REST API standard)
    if (options.limit !== undefined && options.offset !== undefined) {
      const start = options.offset;
      const end = options.offset + options.limit - 1;
      headers['Range'] = `${start}-${end}`;
    } else if (options.limit !== undefined) {
      headers['Range'] = `0-${options.limit - 1}`;
    }
    
    console.log(`🔍 [querySupabase] Querying ${table}: ${url.substring(0, 200)}...`);
    
    const response = await axios.get(url, {
      headers,
      timeout: 10000,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });
    
    console.log(`🔍 [querySupabase] Response status: ${response.status}, data type: ${Array.isArray(response.data) ? 'array' : typeof response.data}`);
    
    // Handle 206 (Partial Content) or 200 (OK) responses
    if (response.status === 200 || response.status === 206) {
      const data = Array.isArray(response.data) ? response.data : [];
      console.log(`✓ [querySupabase] Successfully fetched ${data.length} records from ${table}`);
      return { data, error: null };
    }
    
    // Handle 416 (Range Not Satisfiable) - means no more data
    if (response.status === 416) {
      console.log(`⚠️ [querySupabase] Range not satisfiable (416) - no more data available`);
      return { data: [], error: null };
    }
    
    // Handle other errors - return empty array (not an error, just no data)
    console.log(`⚠️ Supabase returned status ${response.status} for table ${table} - returning empty array`);
    return { data: [], error: null };
  } catch (error: any) {
    // Log the error for debugging
    console.error(`❌ Supabase query error for table ${table}:`, error.message);
    if (error.response) {
      console.error(`   Response status: ${error.response.status}`);
      const responseData = error.response.data;
      if (typeof responseData === 'string' && responseData.includes('<!DOCTYPE')) {
        console.error(`   ⚠️ Received HTML instead of JSON - endpoint may not exist or URL is wrong`);
        console.error(`   URL was: ${SUPABASE_URL}/rest/v1/${table}`);
      } else {
        console.error(`   Response data:`, JSON.stringify(responseData).substring(0, 200));
      }
    }
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    // Always return empty array on error to prevent frontend crashes
    return { data: [], error: null };
  }
}

// Keep Supabase client for compatibility (but prefer REST API)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
            profileImage: profile.profileImage || profile.profile_image_url || profile.profile_image || profile.avatar_url || profile.avatar || undefined,
            bio: profile.bio || profile.description || undefined,
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
              profileImage: profile.profileImage || profile.profile_image_url || profile.profile_image || profile.avatar_url || profile.avatar || undefined,
              bio: profile.bio || profile.description || undefined,
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

// Helper function to set CORS headers consistently
function setCORSHeaders(res: any): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Content-Type', 'application/json');
}

// Helper function to handle OPTIONS requests
function handleOPTIONS(req: any, res: any): boolean {
  if (req.method === 'OPTIONS') {
    setCORSHeaders(res);
    res.status(200).end();
    return true;
  }
  return false;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Clear all old search caches on startup
  const cacheKeys = Array.from(cache.keys());
  cacheKeys.forEach(key => {
    if (key.startsWith('search_')) {
      cache.delete(key);
    }
  });
  console.log(`Cleared ${cacheKeys.filter(k => k.startsWith('search_')).length} search cache entries`);

  // Log Supabase configuration (without exposing the full key)
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Supabase Key: ${SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT SET'}`);
  
  // Test Supabase connection on startup (non-blocking)
  // Use a simple health check query
  (async () => {
    try {
      // Try to query a small amount of data to test connectivity
      const testResult = await querySupabase('leaderboard_users', {}, { limit: 1 });
      
      // Check if we got a network error by trying a direct axios call
      try {
        const testUrl = `${SUPABASE_URL}/rest/v1/leaderboard_users?select=count&limit=1`;
        await axios.get(testUrl, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          timeout: 5000,
          validateStatus: () => true, // Don't throw on any status
        });
        console.log(`✓ Supabase connection test: OK (can reach Supabase API)`);
      } catch (testErr: any) {
        if (testErr.code === 'ENOTFOUND' || testErr.code === 'ECONNREFUSED') {
          console.warn(`⚠️ Supabase connection test: FAILED (DNS/Network error)`);
          console.warn(`   Error: ${testErr.code} - ${testErr.message}`);
          console.warn(`   The Supabase URL "${SUPABASE_URL}" cannot be reached.`);
          console.warn(`   Please verify:`);
          console.warn(`   1. The Supabase project exists and is active`);
          console.warn(`   2. The SUPABASE_URL environment variable is correct`);
          console.warn(`   3. Your network can reach Supabase services`);
          console.warn(`   Leaderboard features will return empty data until this is fixed.`);
        } else {
          // Other errors (like 401, 404) mean we can reach the server but have config issues
          console.log(`⚠️ Supabase connection test: Can reach server but may have config issues`);
          console.log(`   Error: ${testErr.response?.status || testErr.message}`);
        }
      }
    } catch (err: any) {
      console.warn(`⚠️ Supabase connection test: Unexpected error - ${err.message}`);
    }
  })();

  // ============================================================================
  // USER ROUTES
  // ============================================================================

  // GET /api/users/search?q=... - Search for usernames using Polymarket GAMMA API
  // Official API: https://gamma-api.polymarket.com/public-search
  // Response structure: { events: [...], tags: [...], profiles: [...], pagination: {...} }
  // Profile object structure: { name: string, profileImage?: string, pseudonym?: string, proxyWallet?: string }
  app.get("/api/users/search", async (req, res) => {
    setCORSHeaders(res);
    
    if (handleOPTIONS(req, res)) return;
    
    try {
      const query = (req.query.q as string)?.trim();

      // Validate query
      if (!query || query.length < 2) {
        return res.status(200).json([]);
      }

      // Check cache first (30 second TTL)
      // Use query as-is for cache key to preserve case-sensitive searches
      const cacheKey = `search_${query}`;
      const cached = getCached<any[]>(cacheKey, 30000);
      if (cached) {
        console.log(`[Search] Using cached results for: "${query}" (${cached.length} profiles)`);
        return res.status(200).json(cached);
      }

      // Rate limiting: 20 requests per 10 seconds
      if (!checkRateLimit('gamma_search', 20, 10000)) {
        console.log(`[Search] Rate limit exceeded for query: ${query}, using cached data`);
        const staleCache = getCached<any[]>(cacheKey, 300000); // 5 minute stale cache
        return res.status(200).json(staleCache || []);
      }

      // Call Polymarket GAMMA API public-search endpoint
      // Try multiple requests with different parameters to get more results
      let allProfiles: any[] = [];
      const maxRequests = 3; // Try up to 3 requests to get more results
      
      for (let attempt = 0; attempt < maxRequests; attempt++) {
        try {
          const params: any = {
            q: query,
            search_profiles: true,
          };
          
          // Try different pagination parameters
          if (attempt === 0) {
            params.limit = 50;
          } else if (attempt === 1) {
            params.offset = 0;
            params.limit = 50;
          } else {
            params.page = attempt;
            params.limit = 50;
          }
          
          const response = await axios.get(`${POLYMARKET_GAMMA_API}/public-search`, {
            params,
            timeout: 5000,
            validateStatus: (status) => status < 500,
          });

          // Handle API errors
          if (response.status >= 400) {
            if (attempt === 0) {
              console.warn(`[Search] Polymarket API returned ${response.status} for query: ${query}`);
            }
            break; // Stop trying if API returns error
          }

          // Extract profiles from response
          const profiles: any[] = response.data?.profiles || [];
          const pagination = response.data?.pagination;

          if (attempt === 0) {
            console.log(`[Search] API returned ${profiles.length} profiles for query: "${query}"`);
            if (pagination) {
              console.log(`[Search] Pagination info:`, JSON.stringify(pagination));
            }
          }

          if (profiles.length > 0) {
            // Add profiles that we haven't seen yet (deduplicate by username)
            const existingUsernames = new Set(allProfiles.map(p => (p.name || p.pseudonym)?.toLowerCase()));
            const newProfiles = profiles.filter(p => {
              const username = (p.name || p.pseudonym)?.toLowerCase();
              return username && !existingUsernames.has(username);
            });
            allProfiles.push(...newProfiles);
            
            // If we got fewer results than requested, we've likely reached the end
            if (profiles.length < 50 || (pagination && !pagination.hasMore)) {
              break;
            }
          } else {
            break; // No more profiles
          }
          
          // Small delay between requests to avoid rate limiting
          if (attempt < maxRequests - 1 && profiles.length >= 50) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error: any) {
          if (attempt === 0) {
            console.error(`[Search] Error fetching profiles:`, error.message);
          }
          break;
        }
      }

      const profiles = allProfiles;

      if (profiles.length === 0) {
        console.log(`[Search] No profiles found for query: ${query}`);
        return res.status(200).json([]);
      }

      // Transform profiles to match frontend expectations
      // Official API fields: name (primary), profileImage (optional), pseudonym (optional)
      const userResults = profiles
        .map((profile: any) => {
          // Use 'name' as primary username, fallback to 'pseudonym' if name is missing
          // This ensures we capture all profiles, not just those with 'name'
          const username = profile.name || profile.pseudonym;
          
          // Skip if no username at all
          if (!username || typeof username !== 'string') {
            return null;
          }

          // Extract profile image (official API field is 'profileImage')
          const profileImage = profile.profileImage;

          return {
            username: username.trim(),
            profileImage: profileImage && typeof profileImage === 'string' ? profileImage.trim() : undefined,
          };
        })
        .filter((item) => item !== null && typeof item === 'object' && 'username' in item)
        .slice(0, 20) as Array<{ username: string; profileImage?: string }>; // Increased to 20 results

      console.log(`[Search] Query: "${query}" → Found ${userResults.length} profiles (from ${profiles.length} total API results, ${allProfiles.length} after pagination attempts)`);

      // Cache the result
      setCache(cacheKey, userResults);
      return res.status(200).json(userResults);

    } catch (error: any) {
      console.error(`[Search] Error for query "${req.query.q}":`, error.message);
      
      // Return cached data if available
      const cacheKey = `search_${(req.query.q as string)?.toLowerCase() || ''}`;
      const cached = getCached<any[]>(cacheKey, 300000);
      return res.status(200).json(cached || []);
    }
  });

  // ============================================================================
  // DASHBOARD ROUTES
  // ============================================================================

  // GET /api/dashboard/username?username=... - Get dashboard data for a username
  app.get("/api/dashboard/username", async (req, res) => {
    setCORSHeaders(res);
    
    // Cache-busting headers to prevent stale data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (handleOPTIONS(req, res)) return;

    // Set a timeout for the entire request (60 seconds)
    const requestTimeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error('Dashboard request timeout after 60 seconds');
        res.status(504).json({ 
          error: 'Request timeout',
          message: 'The dashboard data fetch took too long. Please try again.'
        });
      }
    }, 60000);

    try {
      const { username } = req.query;

      if (!username || typeof username !== 'string') {
        res.status(400).json({ error: 'Username is required' });
        return;
      }

      console.log(`📍 [EXPRESS API ROUTE] Dashboard request for username: ${username}`);

      // Find user by username with timeout
      let userInfo;
      try {
        const findUserPromise = findUserByUsername(username);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User lookup timeout')), 10000)
        );
        userInfo = await Promise.race([findUserPromise, timeoutPromise]) as { wallet: string; profileImage?: string; bio?: string };
        console.log('User info found:', { wallet: userInfo.wallet, hasImage: !!userInfo.profileImage });
      } catch (error: any) {
        // Check if it's a "user not found" error
        if (error.message?.includes('User not found') || error.message?.includes('No profiles found') || error.message?.includes('USER_NOT_FOUND')) {
          console.log(`User not found: ${username}`);
          res.status(404).json({ 
            error: `User not found: ${username}`,
            message: 'The requested user could not be found in Polymarket'
          });
          return;
        }
        if (error.message?.includes('timeout')) {
          console.error(`Timeout finding user: ${username}`);
          res.status(504).json({ 
            error: 'Request timeout',
            message: 'The user lookup took too long. Please try again.'
          });
          return;
        }
        // Re-throw other errors to be handled by outer catch
        throw error;
      }

      // Helper function to calculate PnL for trades (FIFO method)
      function calculateTradesWithPnL(trades: any[]): any[] {
        console.log(`📊 Calculating PnL for ${trades.length} trades...`);
        
        // First, assign stable IDs to all trades that don't have one
        const tradesWithIds = trades.map((trade, index) => {
          if (!trade.id) {
            const timestamp = trade.timestamp || trade.created_at || Date.now();
            const marketName = (typeof trade.market === 'object' ? (trade.market?.question || trade.market?.title) : trade.market) || trade.title || "Unknown Market";
            const outcome = trade.outcome || "YES";
            const price = trade.outcomeTokenPrice || trade.price || 0;
            const size = trade.outcomeTokenAmount || trade.size || 0;
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

        const tradePnLMap = new Map<string, { profit: number; betAmount: number; closePositionValue: number }>();

        // Match buys with sells to calculate realized PnL using proper FIFO
        for (const [key, { buys, sells }] of Object.entries(marketPositions)) {
          if (sells.length === 0) continue;
          
          const sortedBuys = buys
            .map(buy => ({
              ...buy,
              price: parseFloat(buy.outcomeTokenPrice || buy.price || 0),
              size: parseFloat(buy.outcomeTokenAmount || buy.size || 0),
              remainingSize: parseFloat(buy.outcomeTokenAmount || buy.size || 0),
            }))
            .sort((a, b) => new Date(a.timestamp || a.created_at).getTime() - new Date(b.timestamp || b.created_at).getTime());

          for (const sell of sells.sort((a, b) => new Date(a.timestamp || a.created_at).getTime() - new Date(b.timestamp || b.created_at).getTime())) {
            const sellPrice = parseFloat(sell.outcomeTokenPrice || sell.price || 0);
            let sellSize = parseFloat(sell.outcomeTokenAmount || sell.size || 0);
            let totalCostBasis = 0;
            let totalMatchedSize = 0;

            for (const buy of sortedBuys) {
              if (sellSize <= 0) break;
              
              if (buy.remainingSize > 0) {
                const sizeToMatch = Math.min(sellSize, buy.remainingSize);
                const costForThisMatch = buy.price * sizeToMatch;
                
                totalCostBasis += costForThisMatch;
                totalMatchedSize += sizeToMatch;
                buy.remainingSize -= sizeToMatch;
                sellSize -= sizeToMatch;
              }
            }

            if (totalMatchedSize > 0) {
              const totalProceeds = sellPrice * totalMatchedSize;
              const pnl = totalProceeds - totalCostBasis;
              const tradeId = sell.id;
              tradePnLMap.set(tradeId, {
                profit: pnl,
                betAmount: totalCostBasis,
                closePositionValue: totalProceeds
              });
            }
          }
        }

        return tradesWithIds.map(trade => {
          const tradeId = trade.id;
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

      // Helper function to fetch ALL trades with optimized parallel pagination
      async function fetchAllTrades(walletAddress: string): Promise<any[]> {
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
      }

      // Fetch user data in parallel with individual error handling
      // Note: fetchUserPositions and fetchUserTrades return typed arrays, 
      // but we need raw API responses for the dashboard format
      console.log(`📊 Fetching dashboard data for wallet: ${userInfo.wallet}`);
      
      const [positionsRaw, tradesRaw, pnlData, leaderboardData, closedPositionsRaw] = await Promise.allSettled([
        axios.get(`${POLYMARKET_DATA_API}/positions`, {
          params: { user: userInfo.wallet, limit: 1000 },
          timeout: 15000,
        }).then(res => res.data || []).catch((err) => {
          console.error('Error fetching positions:', err.message);
          return [];
        }),
        fetchAllTrades(userInfo.wallet).catch((err) => {
          console.error('Error fetching all trades:', err.message);
          return [];
        }),
        fetchUserPnLData(userInfo.wallet).catch((err) => {
          console.error('Error fetching PnL data:', err.message);
          return { totalPnl: 0, realizedPnl: 0, unrealizedPnl: 0, portfolioValue: 0, openPositions: 0, closedPositions: 0, allClosedPositions: [], closedPositionsHistory: [] };
        }),
        fetchUserVolume(userInfo.wallet).catch((err) => {
          console.error('Error fetching volume:', err.message);
          return { volume: 0 };
        }),
        fetchClosedPositionsForProfitableTrades(userInfo.wallet, 5000).catch((err) => {
          console.error('Error fetching closed positions:', err.message);
          return [];
        })
      ]);

      // Extract values from Promise.allSettled results
      const positions = Array.isArray(positionsRaw.status === 'fulfilled' ? positionsRaw.value : []) 
        ? (positionsRaw.status === 'fulfilled' ? positionsRaw.value : [])
        : [];
      const trades = Array.isArray(tradesRaw.status === 'fulfilled' ? tradesRaw.value : []) 
        ? (tradesRaw.status === 'fulfilled' ? tradesRaw.value : [])
        : [];
      const pnl = pnlData.status === 'fulfilled' ? pnlData.value : {
        realizedPnl: 0,
        unrealizedPnl: 0,
        totalPnl: 0,
        portfolioValue: 0,
        closedPositions: 0,
        openPositions: 0,
        closedPositionsHistory: [],
        allClosedPositions: [],
      };
      const leaderboard: { volume: number; xUsername?: string; rank?: string } = leaderboardData.status === 'fulfilled' ? leaderboardData.value : { volume: 0 };
      const closedPositions = Array.isArray(closedPositionsRaw.status === 'fulfilled' ? closedPositionsRaw.value : []) 
        ? (closedPositionsRaw.status === 'fulfilled' ? closedPositionsRaw.value : [])
        : [];

      // Filter positions to only those with size > 0
      const filteredPositions = positions.filter((pos: any) => parseFloat(pos.size || 0) > 0);
      
      // Use leaderboard volume if available, otherwise calculate from trades as fallback
      let totalVolume = leaderboard.volume || 0;
      const xUsername = leaderboard.xUsername || undefined;
      const rank = leaderboard.rank || undefined;

      // Fetch X (Twitter) profile data if xUsername exists
      console.log(`📍 [X API] xUsername: ${xUsername || 'NOT FOUND'}`);
      let nationality = 'Unknown';
      let affiliate: { username: string; profileImage: string; description: string } | undefined = undefined;

      if (xUsername) {
        try {
          console.log(`📍 [X API] Fetching profile data for X username: ${xUsername}`);
          
          // Fetch user about data (contains nationality and affiliate info)
          // Use Promise.race with timeout to prevent blocking (X API has 12s timeout, use 15s buffer)
          const xApiPromise = getXUserAbout(xUsername).catch(() => null);
          const timeoutPromise = new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), 15000);
          });
          
          const aboutData = await Promise.race([xApiPromise, timeoutPromise]);
          
          if (aboutData?.accountBasedIn) {
            nationality = aboutData.accountBasedIn;
            console.log(`   ✅ [X API] Nationality found: ${nationality}`);
          } else {
            console.log(`   ⚠ [X API] No nationality found in user_about response`);
          }
          
          if (aboutData?.affiliate) {
            affiliate = aboutData.affiliate;
            console.log(`   ✅ [X API] Affiliate found: @${affiliate.username}`);
          }

        } catch (error: any) {
          console.error(`   ❌ [X API] Error fetching X profile data:`, error.message);
          // Keep nationality as 'Unknown' on error
        }
      } else {
        console.log(`   ⚠ [X API] No X username found for user ${username}`);
      }
      
      if (totalVolume === 0 && trades.length > 0) {
        console.log('   ⚠ Leaderboard volume is 0, calculating from trades as fallback...');
        totalVolume = trades.reduce((sum: number, trade: any) => {
          return sum + Math.abs((trade.outcomeTokenAmount || 0) * (trade.outcomeTokenPrice || 0));
        }, 0);
        console.log(`   ✓ Fallback volume from trades: $${totalVolume.toLocaleString()}`);
      }

      // Calculate PnL for each trade
      const tradesWithPnL = calculateTradesWithPnL(trades);
      console.log(`📊 Calculated PnL for ${tradesWithPnL.filter((t: any) => t.profit !== undefined).length} SELL trades`);

      // Calculate win rate from SELL trades that have profit data
      const sellTradesWithProfit = tradesWithPnL.filter((trade: any) => {
        const side = (trade.side === "BUY" || trade.side === "buy" || trade.type === "BUY") ? "BUY" : "SELL";
        return side === "SELL" && trade.profit !== undefined;
      });
      const winningTrades = sellTradesWithProfit.filter((trade: any) => trade.profit > 0).length;
      const winRate = sellTradesWithProfit.length > 0 ? (winningTrades / sellTradesWithProfit.length) * 100 : 0;

      // Calculate best trade and worst trade
      let bestTrade = 0;
      let worstTrade = 0;
      
      filteredPositions.forEach((pos: any) => {
        const unrealizedPnL = parseFloat(pos.cashPnl || 0);
        if (unrealizedPnL > bestTrade) bestTrade = unrealizedPnL;
        if (unrealizedPnL < worstTrade) worstTrade = unrealizedPnL;
      });
      
      (pnl.allClosedPositions || []).forEach((pos: any) => {
        const realizedPnL = parseFloat(pos.realizedPnl || 0);
        if (realizedPnL > bestTrade) bestTrade = realizedPnL;
        if (realizedPnL < worstTrade) worstTrade = realizedPnL;
      });

      // Generate PnL history from closed positions
      const pnlHistory = [];
      let cumulativePnl = 0;
      
      const sortedPositions = (pnl.closedPositionsHistory || [])
        .filter((p: any) => p.endDate) // Filter out positions without endDate
        .sort((a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
      
      if (sortedPositions.length > 0) {
        const firstTime = new Date(sortedPositions[0].endDate).getTime();
        const startTime = firstTime - (7 * 24 * 60 * 60 * 1000);
        pnlHistory.push({
          timestamp: new Date(startTime).toISOString(),
          value: 0
        });
      }
      
      const shouldSample = sortedPositions.length > 1000;
      const sampleInterval = shouldSample ? Math.ceil(sortedPositions.length / 500) : 1;
      
      for (let i = 0; i < sortedPositions.length; i++) {
        const pos = sortedPositions[i];
        cumulativePnl += pos.realizedPnl;
        
        if (i % sampleInterval === 0 || i === sortedPositions.length - 1) {
          pnlHistory.push({
            timestamp: pos.endDate,
            value: parseFloat(cumulativePnl.toFixed(2))
          });
        }
      }
      
      const unrealizedPnL = pnl.totalPnl - cumulativePnl;
      if (sortedPositions.length > 0 && Math.abs(unrealizedPnL) > 100) {
        const now = Date.now();
        const lastClosedTime = new Date(sortedPositions[sortedPositions.length - 1].endDate).getTime();
        const daysSinceLastClosed = (now - lastClosedTime) / (24 * 60 * 60 * 1000);
        
        if (daysSinceLastClosed > 0.5) {
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
          pnlHistory.push({
            timestamp: new Date().toISOString(),
            value: pnl.totalPnl
          });
        }
      } else {
        pnlHistory.push({
          timestamp: new Date().toISOString(),
          value: pnl.totalPnl
        });
      }

      const dashboardData = {
        profile: {
          username,
          walletAddress: userInfo.wallet,
          profileImage: userInfo.profileImage || undefined, // Ensure undefined instead of null
          bio: userInfo.bio || undefined,
          xUsername: xUsername || undefined,
          rank: rank || undefined,
          nationality: nationality, // Real nationality from X API or 'Unknown' as fallback
          affiliate: affiliate || undefined, // Optional: Affiliate company info if available
        },
        stats: {
          totalPnL: pnl.totalPnl || 0,
          realizedPnL: pnl.realizedPnl ?? 0, // Note: fetchUserPnLData returns 'realizedPnl' (lowercase n)
          unrealizedPnL: pnl.unrealizedPnl ?? 0, // Note: fetchUserPnLData returns 'unrealizedPnl' (lowercase n)
          winRate: Math.round(winRate * 100) / 100,
          totalVolume: typeof totalVolume === 'number' ? totalVolume : 0,
          openPositionsValue: pnl.portfolioValue || 0,
          totalTrades: trades.length,
          activePositions: pnl.openPositions || 0,
          closedPositions: pnl.closedPositions || 0,
          bestTrade: bestTrade || 0,
          worstTrade: worstTrade || 0,
        },
        pnlHistory,
        positions: filteredPositions.map((pos: any) => {
          // Extract slug from various possible fields (consistent with fetchUserPositions logic)
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
            unrealizedPnL: parseFloat(pos.cashPnl || pos.pnl || 0),
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
          profit: trade.profit !== undefined ? trade.profit : undefined,
        })),
        profitableTrades: (() => {
          // Use closed positions API directly for accurate profitable trades
          // This is the most accurate source with correct buy/sell amounts
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
          return profitable;
        })(),
      };

      console.log('Dashboard data prepared:', {
        profile: dashboardData.profile,
        stats: {
          ...dashboardData.stats,
          totalVolume: `$${dashboardData.stats.totalVolume.toLocaleString()}`
        },
        pnlHistoryCount: dashboardData.pnlHistory.length,
        positionsCount: dashboardData.positions.length,
        tradesCount: dashboardData.recentTrades.length,
        profitableTradesCount: dashboardData.profitableTrades?.length || 0,
      });

      // Clear timeout and ensure response is sent
      clearTimeout(requestTimeout);
      if (!res.headersSent) {
        res.status(200).json(dashboardData);
      }
    } catch (error: any) {
      clearTimeout(requestTimeout);
      console.error('Dashboard API error:', error);
      
      // Ensure error response is sent
      if (!res.headersSent) {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Internal server error',
          message: 'Failed to fetch dashboard data. Please try again.'
        });
      } else {
        console.error('Response already sent, cannot send error response');
      }
    }
  });

  // ============================================================================
  // LEADERBOARD ROUTES
  // ============================================================================

  // GET /api/leaderboard/users - Get user leaderboard from Supabase
  app.get("/api/leaderboard/users", async (req, res) => {
    setCORSHeaders(res);
    
    if (handleOPTIONS(req, res)) return;

    try {
      const timePeriod = (req.query.timePeriod as string) || "all";
      const fetchAll = req.query.fetchAll === 'true'; // Flag to fetch all available data
      
      // If fetchAll is true, don't use limit/offset - fetch everything
      // Otherwise, use pagination
      // If fetchAll is true, fetch in large chunks until no more data
      // Otherwise, use pagination
      let allUsers: any[] = [];
      let result: { data: any[]; error: any };
      
      if (fetchAll) {
        // Fetch ALL records by paginating through all available data
        console.log(`📊 [EXPRESS API] Fetching ALL users from Supabase (fetchAll mode)`);
        let page = 0;
        const chunkSize = 2000; // Large chunks to minimize requests
        
        while (true) {
          const offset = page * chunkSize;
          try {
            const chunkResult = await querySupabase(
              'leaderboard_users',
              { time_period: timePeriod.toLowerCase() },
              { orderBy: 'rank', ascending: true, limit: chunkSize, offset }
            );
            
            const chunkData = chunkResult?.data || [];
            if (chunkData.length === 0) {
              console.log(`✓ Fetched all users: ${allUsers.length} total (stopped at page ${page})`);
              break;
            }
            
            allUsers.push(...chunkData);
            console.log(`📊 Fetched chunk ${page + 1}: ${chunkData.length} users (total: ${allUsers.length})`);
            
            // If we got less than chunkSize, we've reached the end
            if (chunkData.length < chunkSize) {
              console.log(`✓ Reached end of data at chunk ${page + 1}`);
              break;
            }
            
            page++;
          } catch (queryError: any) {
            console.error(`❌ Error fetching chunk ${page + 1}:`, queryError?.message || queryError);
            if (page === 0) {
              // If first chunk fails, return error
              return res.status(200).json([]);
            }
            // Otherwise, return what we have
            break;
          }
        }
        
        result = { data: allUsers, error: null };
      } else {
        // Use pagination
        const limit = parseInt(req.query.limit as string) || 1000;
        const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
        console.log(`📊 [EXPRESS API] Fetching user leaderboard: timePeriod=${timePeriod}, limit=${limit}, offset=${offset}`);
        try {
          result = await querySupabase(
            'leaderboard_users',
            { time_period: timePeriod.toLowerCase() },
            { orderBy: 'rank', ascending: true, limit, offset }
          );
        } catch (queryError: any) {
          console.error('❌ Error calling querySupabase:', queryError?.message || queryError);
          console.log(`⚠️ Returning empty array due to query error`);
          return res.status(200).json([]);
        }
      }
      
      const cachedUsers = result?.data || [];
      const supabaseError = result?.error;

      // Note: querySupabase now always returns error: null, so this check is redundant
      // but kept for clarity and future-proofing
      if (supabaseError) {
        console.error('❌ Supabase fetch error:', supabaseError);
        // Return empty array instead of error to prevent frontend crashes
        // The database might be empty or not synced yet
        console.log(`⚠️ Returning empty array due to Supabase error (database may be empty or not synced)`);
        return res.status(200).json([]);
      }

      // Check if we need to trigger sync (if data is missing or too few records)
      const shouldTriggerSync = (!cachedUsers || cachedUsers.length === 0);
      
      if (shouldTriggerSync) {
        console.log(`⚠️ No users found in Supabase for timePeriod=${timePeriod}`);
        console.log(`🔄 Triggering automatic sync in background...`);
        
        // Trigger sync in background (non-blocking)
        (async () => {
          try {
            // Try to call sync endpoint if available, otherwise just log
            const syncUrl = process.env.SYNC_URL || 'http://localhost:3000/api/leaderboard/sync';
            axios.get(syncUrl, {
              params: { type: 'users', timePeriod: timePeriod },
              timeout: 1000, // Quick timeout - don't wait for completion
            }).catch(() => {
              // Ignore errors - sync will happen in background or via cron
            });
            console.log(`✓ Background sync triggered for users`);
          } catch (err) {
            // Silent fail - sync will be handled by cron
          }
        })();
      }

      if (!cachedUsers || cachedUsers.length === 0) {
        console.log(`📡 Falling back to Polymarket API...`);
        
        // Fallback to Polymarket API when Supabase is empty
        try {
          const fallbackLimit = 50; // API max is 50 per request
          const fallbackOffset = 0;
          const response = await axios.get(`${POLYMARKET_DATA_API}/v1/leaderboard`, {
            params: {
              timePeriod: timePeriod.toLowerCase(),
              orderBy: 'VOL',
              limit: fallbackLimit,
              offset: fallbackOffset,
              category: 'overall',
            },
            timeout: 10000,
          });

          const users = response.data || [];
          console.log(`✓ [EXPRESS API] Fetched ${users.length} users from Polymarket API (fallback)`);

          // Transform Polymarket API data to match frontend expectations
          const transformedUsers = users.map((user: any, index: number) => {
            const walletAddress = user.proxyWallet || user.user || user.walletAddress || user.wallet || user.address;
            
            return {
              rank: user.rank || fallbackOffset + index + 1,
              userName: user.userName || user.name || 'Unknown',
              xUsername: user.xUsername,
              vol: parseFloat(user.vol || user.volume || 0),
              walletAddress: walletAddress,
              profileImage: user.profileImage || user.avatar,
              pnl: user.pnl !== undefined ? parseFloat(user.pnl) : undefined,
            };
          });

          return res.status(200).json(transformedUsers);
        } catch (apiError: any) {
          console.error('❌ Polymarket API fallback failed:', apiError.message);
          return res.status(200).json([]);
        }
      }

      console.log(`✓ [EXPRESS API] Fetched ${cachedUsers.length} users from Supabase`);
      
      let transformedUsers;
      try {
        transformedUsers = cachedUsers.map((user: any) => ({
          rank: user.rank?.toString() || String(user.rank || 0),
          userName: user.username || '',
          xUsername: user.x_username || undefined,
          vol: parseFloat(user.volume || 0),
          walletAddress: user.wallet_address || undefined,
          profileImage: user.profile_image || undefined,
          pnl: user.pnl !== null && user.pnl !== undefined ? parseFloat(user.pnl) : undefined,
        }));
      } catch (transformError: any) {
        console.error('❌ Error transforming users:', transformError);
        return res.status(200).json([]);
      }

      return res.status(200).json(transformedUsers);
    } catch (error: any) {
      console.error("❌ [EXPRESS API] Error fetching user leaderboard:", error);
      // Return empty array instead of 500 to prevent frontend crashes
      return res.status(200).json([]);
    }
  });

  // GET /api/leaderboard/builders - Get builder leaderboard from Supabase
  app.get("/api/leaderboard/builders", async (req, res) => {
    setCORSHeaders(res);
    
    if (handleOPTIONS(req, res)) return;

    try {
      const timePeriod = (req.query.timePeriod as string) || "ALL";
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      console.log(`📊 [EXPRESS API] Fetching builder leaderboard: timePeriod=${timePeriod}, limit=${limit}, offset=${offset}`);

      // Use REST API instead of JS client for better reliability
      let result;
      try {
        result = await querySupabase(
          'leaderboard_builders',
          { time_period: timePeriod.toLowerCase() },
          { orderBy: 'rank', ascending: true, limit, offset }
        );
      } catch (queryError: any) {
        console.error('❌ Error calling querySupabase:', queryError?.message || queryError);
        console.log(`⚠️ Returning empty array due to query error`);
        return res.status(200).json([]);
      }
      
      const cachedBuilders = result?.data || [];
      const supabaseError = result?.error;

      // Note: querySupabase now always returns error: null, so this check is redundant
      // but kept for clarity and future-proofing
      if (supabaseError) {
        console.error('❌ Supabase fetch error:', supabaseError);
        // Return empty array instead of error to prevent frontend crashes
        // The database might be empty or not synced yet
        console.log(`⚠️ Returning empty array due to Supabase error (database may be empty or not synced)`);
        return res.status(200).json([]);
      }

      if (!cachedBuilders || cachedBuilders.length === 0) {
        console.log(`⚠️ No builders found in Supabase for timePeriod=${timePeriod}, offset=${offset}`);
        console.log(`📡 Falling back to Polymarket API...`);
        
        // Fallback to Polymarket API when Supabase is empty
        try {
          const response = await axios.get(`${POLYMARKET_DATA_API}/v1/builders/leaderboard`, {
            params: {
              timePeriod: timePeriod.toUpperCase(),
              limit: Math.min(limit, 50), // API max is 50
              offset,
            },
            timeout: 10000,
          });

          const builders = response.data || [];
          console.log(`✓ [EXPRESS API] Fetched ${builders.length} builders from Polymarket API (fallback)`);

          // Transform Polymarket API data to match frontend expectations
          const transformedBuilders = builders.map((builder: any) => ({
            rank: builder.rank?.toString() || (builders.indexOf(builder) + offset + 1).toString(),
            builder: builder.builderName || builder.name || builder.builder || 'Unknown',
            volume: parseFloat(builder.vol || builder.volume || 0),
            activeUsers: parseInt(builder.activeUsers || 0),
            verified: builder.verified === true || builder.verified === 'true',
            builderLogo: builder.builderLogo || builder.logo || builder.image || undefined,
            marketsCreated: parseInt(builder.marketsCreated || builder.markets || 0),
          }));

          return res.status(200).json(transformedBuilders);
        } catch (apiError: any) {
          console.error('❌ Polymarket API fallback failed:', apiError.message);
          return res.status(200).json([]);
        }
      }

      console.log(`✓ [EXPRESS API] Fetched ${cachedBuilders.length} builders from Supabase`);
      
      let transformedBuilders;
      try {
        transformedBuilders = cachedBuilders.map((builder: any) => ({
          rank: builder.rank?.toString() || String(builder.rank || 0),
          builder: builder.builder_name || '',
          volume: parseFloat(builder.volume || 0),
          activeUsers: parseInt(builder.active_users || 0),
          verified: builder.verified === true,
          builderLogo: builder.builder_logo || undefined,
          marketsCreated: parseInt(builder.markets_created || 0),
        }));
      } catch (transformError: any) {
        console.error('❌ Error transforming builders:', transformError);
        return res.status(200).json([]);
      }

      return res.status(200).json(transformedBuilders);
    } catch (error: any) {
      console.error("❌ [EXPRESS API] Error fetching builder leaderboard:", error);
      // Return empty array instead of 500 to prevent frontend crashes
      return res.status(200).json([]);
    }
  });

  // GET /api/leaderboard/wallet?username=... - Get wallet address for username
  app.get("/api/leaderboard/wallet", async (req, res) => {
    setCORSHeaders(res);
    
    if (handleOPTIONS(req, res)) return;

    try {
      const { username } = req.query;

      if (!username || typeof username !== 'string') {
        res.status(400).json({ error: 'Username is required' });
        return;
      }

      console.log(`📊 [EXPRESS API] Fetching wallet for username: ${username}`);

      try {
        const userInfo = await findUserByUsername(username);
        const walletAddress = userInfo.wallet;
        
        console.log(`✓ Found wallet for ${username}: ${walletAddress}`);

        res.status(200).json({
          username,
          walletAddress,
        });
      } catch (error: any) {
        console.error(`❌ Error processing ${username}:`, error.message);
        
        res.status(200).json({
          username,
          walletAddress: null,
          error: error.message,
        });
      }
    } catch (error: any) {
      console.error('Error in wallet endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to fetch wallet data',
        message: error.message 
      });
    }
  });

  // GET /api/leaderboard/pnl?wallet=... - Get PnL for wallet
  app.get("/api/leaderboard/pnl", async (req, res) => {
    setCORSHeaders(res);
    
    if (handleOPTIONS(req, res)) return;

    try {
      const { wallet } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        res.status(400).json({ error: 'Wallet address is required' });
        return;
      }

      console.log(`📊 [EXPRESS API] Fetching PnL for wallet: ${wallet}`);

      try {
        const pnlData = await fetchUserPnLData(wallet, false);
        
        res.status(200).json({
          wallet,
          totalPnL: pnlData.totalPnl,
          realizedPnL: pnlData.realizedPnl,
          unrealizedPnL: pnlData.unrealizedPnl,
        });
      } catch (error: any) {
        console.error(`❌ Error fetching PnL for ${wallet}:`, error);
        res.status(200).json({
          wallet,
          totalPnL: 0,
          realizedPnL: 0,
          unrealizedPnL: 0,
        });
      }
    } catch (error: any) {
      console.error('Error in PnL endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to fetch PnL data',
        message: error.message 
      });
    }
  });

  // GET /api/leaderboard/builders/volume?timePeriod=... - Get builder volume timeseries
  app.get("/api/leaderboard/builders/volume", async (req, res) => {
    setCORSHeaders(res);
    
    if (handleOPTIONS(req, res)) return;

    try {
      let timePeriod = (req.query.timePeriod as string) || "ALL";

      // ALL returns only aggregated data for one date, so use DAY for historical data
      // But allow explicit timePeriod override
      const apiTimePeriod = timePeriod === "ALL" ? "DAY" : timePeriod.toUpperCase();

      console.log(`📊 [EXPRESS API] Fetching builder volume time-series: requested=${timePeriod}, api=${apiTimePeriod}`);

      const response = await axios.get(`${POLYMARKET_DATA_API}/v1/builders/volume`, {
        params: {
          timePeriod: apiTimePeriod,
        },
        timeout: 10000,
      });

      const rawData = response.data || [];
      console.log(`✓ [EXPRESS API] Fetched ${rawData.length} raw volume data points`);

      // Return data per builder (not aggregated) so frontend can show different colors
      const volumeData = rawData
        .map((entry: any) => {
          const builder = entry.builder || entry.Builder || 'Unknown';
          const volume = parseFloat(entry.volume || entry.vol || 0) || 0;
          const dt = entry.dt || entry.date || entry.timestamp;
          
          return {
            dt: dt,
            builder: builder,
            volume: volume,
            activeUsers: parseInt(entry.activeUsers || entry.active_users || 0) || 0,
            verified: entry.verified || false,
          };
        })
        .filter((entry: any) => entry.dt && entry.builder && entry.builder !== 'Unknown')
        .sort((a: { dt: string }, b: { dt: string }) => new Date(a.dt).getTime() - new Date(b.dt).getTime());

      console.log(`✓ [EXPRESS API] Sending ${volumeData.length} data points (per builder)`);

      res.status(200).json(volumeData);
    } catch (error: any) {
      console.error("❌ [EXPRESS API] Error fetching builder volume time-series:", error);
      
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
        
        if (error.response.status >= 500) {
          console.warn("External API error, returning empty array");
          return res.status(200).json([]);
        }
        
        return res.status(error.response.status).json({
          error: error.response.data?.error || "Failed to fetch builder volume time-series",
        });
      }
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.warn("Request timeout, returning empty array");
        return res.status(200).json([]);
      }
      
      console.warn("Unknown error, returning empty array");
      return res.status(200).json([]);
    }
  });

  // GET /api/leaderboard/sync - Trigger leaderboard sync (health check and sync trigger)
  app.get("/api/leaderboard/sync", async (req, res) => {
    setCORSHeaders(res);
    
    if (handleOPTIONS(req, res)) return;

    try {
      const { type, timePeriod, health } = req.query;
      
      // Health check
      if (health === 'true') {
        try {
          // Check Supabase for data freshness
          const usersResult = await querySupabase('leaderboard_users', { time_period: 'all' }, { limit: 1 });
          const buildersResult = await querySupabase('leaderboard_builders', { time_period: 'all' }, { limit: 1 });
          
          const usersCount = await querySupabase('leaderboard_users', { time_period: 'all' }, {});
          const buildersCount = await querySupabase('leaderboard_builders', { time_period: 'all' }, {});
          
          return res.status(200).json({
            success: true,
            health: {
              users: {
                count: usersCount.data?.length || 0,
                hasData: (usersResult.data?.length || 0) > 0,
              },
              builders: {
                count: buildersCount.data?.length || 0,
                hasData: (buildersResult.data?.length || 0) > 0,
              },
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error: any) {
          return res.status(200).json({
            success: false,
            health: { error: error.message },
            timestamp: new Date().toISOString(),
          });
        }
      }

      // For sync, we'll trigger it via the Vercel function if available
      // Or return a message that sync should be triggered manually
      res.status(200).json({
        success: true,
        message: 'Sync endpoint - use Vercel function /api/leaderboard/sync or run npm run sync:leaderboard',
        note: 'For local development, sync is handled by Vercel cron or manual trigger',
      });
    } catch (error: any) {
      console.error('Sync endpoint error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Create and return HTTP server
  const server = createServer(app);
  return server;
}