import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const POLYMARKET_DATA_API = "https://data-api.polymarket.com";
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://orxyqgecymsuwuxtjdck.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeHlxZ2VjeW1zdXd1eHRqZGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MzAxNzQsImV4cCI6MjA3NzIwNjE3NH0.pk46vevHaUjX0Ewq8dAfNidNgQjjov3fX7CJU997b8U';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const timePeriod = (req.query.timePeriod as string) || "all";
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`📊 [VERCEL API] Fetching user leaderboard: timePeriod=${timePeriod}, limit=${limit}, offset=${offset}`);

    // Try Supabase first (fast cache)
    try {
      const { data: cachedUsers, error: supabaseError } = await supabase
        .from('leaderboard_users')
        .select('*')
        .eq('time_period', timePeriod.toLowerCase())
        .order('rank', { ascending: true })
        .range(offset, offset + limit - 1);

      if (!supabaseError && cachedUsers && cachedUsers.length > 0) {
        console.log(`✓ [VERCEL API] Fetched ${cachedUsers.length} users from Supabase cache`);
        
        // Transform Supabase data to match frontend expectations
        const transformedUsers = cachedUsers.map((user: any) => ({
          rank: user.rank,
          userName: user.username,
          xUsername: user.x_username,
          vol: parseFloat(user.volume || 0),
          walletAddress: user.wallet_address || undefined,
          profileImage: user.profile_image || undefined,
          pnl: user.pnl !== null ? parseFloat(user.pnl) : undefined,
        }));

        return res.status(200).json(transformedUsers);
      }
    } catch (supabaseErr: any) {
      console.warn('⚠️ Supabase fetch failed, falling back to Polymarket API:', supabaseErr.message);
    }

    // Fallback to Polymarket API
    console.log('📡 Fetching from Polymarket API (fallback)...');
    const response = await axios.get(`${POLYMARKET_DATA_API}/v1/leaderboard`, {
      params: {
        timePeriod: timePeriod.toLowerCase(),
        orderBy: 'VOL',
        limit: Math.min(limit, 50), // API max is 50 per request
        offset,
        category: 'overall',
      },
      timeout: 10000,
    });

    const users = response.data || [];
    console.log(`✓ [VERCEL API] Fetched ${users.length} users from Polymarket API`);

    // Transform data to match frontend expectations
    const transformedUsers = users.map((user: any, index: number) => {
      // Polymarket API returns 'proxyWallet' as the wallet address field
      const walletAddress = user.proxyWallet || user.user || user.walletAddress || user.wallet || user.address;
      
      return {
        rank: user.rank || offset + index + 1,
        userName: user.userName || user.name || 'Unknown',
        xUsername: user.xUsername,
        vol: parseFloat(user.vol || user.volume || 0),
        walletAddress: walletAddress,
        profileImage: user.profileImage || user.avatar,
        pnl: user.pnl !== undefined ? parseFloat(user.pnl) : undefined, // Include PnL if available from API
      };
    });

    res.status(200).json(transformedUsers);
  } catch (error: any) {
    console.error("❌ [VERCEL API] Error fetching user leaderboard:", error);
    
    // Handle different error types gracefully
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
      
      return res.status(error.response.status).json({
        error: error.response.data?.error || "Failed to fetch user leaderboard",
      });
    }
    
    // Network errors, timeouts, etc.
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.warn("Request timeout");
      return res.status(500).json({ error: "Request timeout" });
    }
    
    return res.status(500).json({
      error: "Failed to fetch user leaderboard",
    });
  }
}

