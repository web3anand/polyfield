import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const POLYMARKET_DATA_API = "https://data-api.polymarket.com";
// Use environment variables - should be set in Vercel
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bzlxrggciehkcslchooe.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTM3NzcsImV4cCI6MjA4MDU4OTc3N30.vIcU83OafM_MGPRy-RjheuSQqkQNRw-RcaI2aDXH4gM';

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
    const timePeriod = (req.query.timePeriod as string) || "ALL";
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`📊 [VERCEL API] Fetching builder leaderboard: timePeriod=${timePeriod}, limit=${limit}, offset=${offset}`);

    // Fetch from Supabase only (no fallback to Polymarket)
    const { data: cachedBuilders, error: supabaseError } = await supabase
      .from('leaderboard_builders')
      .select('*')
      .eq('time_period', timePeriod.toLowerCase())
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1);

    if (supabaseError) {
      console.error('❌ Supabase fetch error:', supabaseError);
      return res.status(500).json({
        error: 'Failed to fetch from database',
        message: supabaseError.message,
      });
    }

    if (!cachedBuilders || cachedBuilders.length === 0) {
      console.log(`⚠️ No builders found in database for timePeriod=${timePeriod}, offset=${offset}`);
      return res.status(200).json([]);
    }

    console.log(`✓ [VERCEL API] Fetched ${cachedBuilders.length} builders from Supabase`);
    
    // Transform Supabase data to match frontend expectations
    const transformedBuilders = cachedBuilders.map((builder: any) => ({
      rank: builder.rank.toString(),
      builder: builder.builder_name,
      volume: parseFloat(builder.volume || 0),
      activeUsers: parseInt(builder.active_users || 0),
      verified: builder.verified === true,
      builderLogo: builder.builder_logo || undefined,
      marketsCreated: parseInt(builder.markets_created || 0),
    }));

    return res.status(200).json(transformedBuilders);
  } catch (error: any) {
    console.error("❌ [VERCEL API] Error fetching builder leaderboard:", error);
    
    // Handle different error types gracefully
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
      
      return res.status(error.response.status).json({
        error: error.response.data?.error || "Failed to fetch builder leaderboard",
      });
    }
    
    // Network errors, timeouts, etc.
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.warn("Request timeout");
      return res.status(500).json({ error: "Request timeout" });
    }
    
    return res.status(500).json({
      error: "Failed to fetch builder leaderboard",
    });
  }
}

