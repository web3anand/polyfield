import express from 'express';
import axios from 'axios';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

// NOTE: Dashboard route removed - now handled by server/routes.ts
// which uses the leaderboard API for accurate volume data

// Export for Vercel serverless functions
export default async (req: VercelRequest, res: VercelResponse) => {
  // Handle the request with Express app
  return new Promise((resolve, reject) => {
    app(req as any, res as any, (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });
};