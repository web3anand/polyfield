import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const POLYMARKET_DATA_API = "https://data-api.polymarket.com";
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://orxyqgecymsuwuxtjdck.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeHlxZ2VjeW1zdXd1eHRqZGNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTYzMDE3NCwiZXhwIjoyMDc3MjA2MTc0fQ.rAsHr2LEV81Ry7DmuxQejKFvnk9qPpoTJJtRMF9ra1E';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Sync users leaderboard
async function syncUsersLeaderboard(timePeriod: string = 'all', maxPages: number = 30) {
  console.log(`🔄 Syncing users leaderboard (${timePeriod})...`);
  
  const allUsers: any[] = [];
  const limit = 50; // API max per request
  
  // Fetch all pages in parallel
  const fetchPromises = Array.from({ length: maxPages }).map(async (_, page) => {
    const offset = page * limit;
    
    try {
      const response = await axios.get(`${POLYMARKET_DATA_API}/v1/leaderboard`, {
        params: {
          timePeriod: timePeriod.toLowerCase(),
          orderBy: 'VOL',
          limit,
          offset,
          category: 'overall',
        },
        timeout: 10000,
      });
      
      const users = response.data || [];
      if (users.length === 0) return [];
      
      return users.map((user: any) => ({
        rank: user.rank || offset + users.indexOf(user) + 1,
        username: user.userName || user.name || 'Unknown',
        x_username: user.xUsername,
        volume: parseFloat(user.vol || user.volume || 0),
        wallet_address: user.proxyWallet || user.user || user.walletAddress || user.wallet || user.address || null,
        profile_image: user.profileImage || user.avatar || null,
        pnl: user.pnl !== undefined ? parseFloat(user.pnl) : null,
        time_period: timePeriod.toLowerCase(),
      }));
    } catch (error: any) {
      console.error(`❌ Error fetching page ${page + 1}:`, error.message);
      return [];
    }
  });
  
  const results = await Promise.all(fetchPromises);
  results.forEach(pageData => {
    if (Array.isArray(pageData)) {
      allUsers.push(...pageData);
    }
  });
  
  // Sort by rank
  allUsers.sort((a, b) => a.rank - b.rank);
  
  console.log(`✓ Fetched ${allUsers.length} users from Polymarket API`);
  
  if (allUsers.length === 0) {
    console.warn('⚠️ No users to sync');
    return { synced: 0, errors: 0 };
  }
  
  // Delete old data for this time period
  const { error: deleteError } = await supabase
    .from('leaderboard_users')
    .delete()
    .eq('time_period', timePeriod.toLowerCase());
  
  if (deleteError) {
    console.error('❌ Error deleting old users:', deleteError);
  } else {
    console.log(`✓ Deleted old users data for ${timePeriod}`);
  }
  
  // Insert new data in batches of 100
  let synced = 0;
  let errors = 0;
  const batchSize = 100;
  
  for (let i = 0; i < allUsers.length; i += batchSize) {
    const batch = allUsers.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('leaderboard_users')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      errors += batch.length;
    } else {
      synced += batch.length;
      console.log(`✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} users)`);
    }
  }
  
  console.log(`✅ Users sync complete: ${synced} synced, ${errors} errors`);
  return { synced, errors };
}

// Sync builders leaderboard
async function syncBuildersLeaderboard(timePeriod: string = 'all', maxPages: number = 30) {
  console.log(`🔄 Syncing builders leaderboard (${timePeriod})...`);
  
  const allBuilders: any[] = [];
  const limit = 50; // API max per request
  
  // Fetch all pages in parallel
  const fetchPromises = Array.from({ length: maxPages }).map(async (_, page) => {
    const offset = page * limit;
    
    try {
      const response = await axios.get(`${POLYMARKET_DATA_API}/v1/builders/leaderboard`, {
        params: {
          timePeriod: timePeriod.toLowerCase(),
          orderBy: 'VOL',
          limit,
          offset,
        },
        timeout: 10000,
      });
      
      const builders = response.data || [];
      if (builders.length === 0) return [];
      
      return builders.map((builder: any) => ({
        rank: builder.rank || offset + builders.indexOf(builder) + 1,
        builder_name: builder.builderName || builder.name || builder.builder || 'Unknown',
        volume: parseFloat(builder.vol || builder.volume || 0),
        markets_created: parseInt(builder.marketsCreated || builder.markets || builder.marketsCreated || 0),
        active_users: parseInt(builder.activeUsers || builder.activeUsers || 0),
        verified: builder.verified === true || builder.verified === 'true' || false,
        builder_logo: builder.builderLogo || builder.logo || builder.image || null,
        time_period: timePeriod.toLowerCase(),
      }));
    } catch (error: any) {
      console.error(`❌ Error fetching page ${page + 1}:`, error.message);
      return [];
    }
  });
  
  const results = await Promise.all(fetchPromises);
  results.forEach(pageData => {
    if (Array.isArray(pageData)) {
      allBuilders.push(...pageData);
    }
  });
  
  // Sort by rank
  allBuilders.sort((a, b) => a.rank - b.rank);
  
  console.log(`✓ Fetched ${allBuilders.length} builders from Polymarket API`);
  
  if (allBuilders.length === 0) {
    console.warn('⚠️ No builders to sync');
    return { synced: 0, errors: 0 };
  }
  
  // Delete old data for this time period
  const { error: deleteError } = await supabase
    .from('leaderboard_builders')
    .delete()
    .eq('time_period', timePeriod.toLowerCase());
  
  if (deleteError) {
    console.error('❌ Error deleting old builders:', deleteError);
  } else {
    console.log(`✓ Deleted old builders data for ${timePeriod}`);
  }
  
  // Insert new data in batches of 100
  let synced = 0;
  let errors = 0;
  const batchSize = 100;
  
  for (let i = 0; i < allBuilders.length; i += batchSize) {
    const batch = allBuilders.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('leaderboard_builders')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      errors += batch.length;
    } else {
      synced += batch.length;
      console.log(`✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} builders)`);
    }
  }
  
  console.log(`✅ Builders sync complete: ${synced} synced, ${errors} errors`);
  return { synced, errors };
}

// Health check function
async function checkSyncHealth() {
  try {
    const { data: users, error: usersError } = await supabase
      .from('leaderboard_users')
      .select('updated_at')
      .eq('time_period', 'all')
      .order('updated_at', { ascending: false })
      .limit(1);

    const { data: builders, error: buildersError } = await supabase
      .from('leaderboard_builders')
      .select('updated_at')
      .eq('time_period', 'all')
      .order('updated_at', { ascending: false })
      .limit(1);

    const usersLastUpdate = users && users.length > 0 ? new Date(users[0].updated_at).getTime() : null;
    const buildersLastUpdate = builders && builders.length > 0 ? new Date(builders[0].updated_at).getTime() : null;
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);

    return {
      users: {
        lastUpdate: usersLastUpdate,
        isFresh: usersLastUpdate ? usersLastUpdate > fiveMinutesAgo : false,
        error: usersError,
      },
      builders: {
        lastUpdate: buildersLastUpdate,
        isFresh: buildersLastUpdate ? buildersLastUpdate > fiveMinutesAgo : false,
        error: buildersError,
      },
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

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

  // Health check endpoint
  if (req.method === 'GET' && req.query.health === 'true') {
    try {
      const health = await checkSyncHealth();
      return res.status(200).json({
        success: true,
        health,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Only allow POST or GET (for manual trigger)
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { type, timePeriod, maxPages } = req.query;
    const syncType = (type as string) || 'all'; // 'users', 'builders', or 'all'
    const period = (timePeriod as string) || 'all';
    const pages = parseInt(maxPages as string) || 30;

    console.log(`🚀 Starting leaderboard sync: type=${syncType}, timePeriod=${period}, maxPages=${pages}`);

    const results: any = {
      timestamp: new Date().toISOString(),
      timePeriod: period,
    };

    // Retry logic for failed syncs
    const maxRetries = 2;
    let retryCount = 0;

    const syncWithRetry = async (syncFn: () => Promise<any>, name: string) => {
      while (retryCount < maxRetries) {
        try {
          return await syncFn();
        } catch (error: any) {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error(`❌ ${name} sync failed after ${maxRetries} retries:`, error);
            throw error;
          }
          console.warn(`⚠️ ${name} sync failed, retrying (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
        }
      }
    };

    if (syncType === 'users' || syncType === 'all') {
      try {
        retryCount = 0;
        const usersResult = await syncWithRetry(
          () => syncUsersLeaderboard(period, pages),
          'Users'
        );
        results.users = usersResult;
      } catch (error: any) {
        console.error('❌ Users sync failed:', error);
        results.users = { error: error.message, synced: 0, errors: 0 };
      }
    }

    if (syncType === 'builders' || syncType === 'all') {
      try {
        retryCount = 0;
        const buildersResult = await syncWithRetry(
          () => syncBuildersLeaderboard(period, pages),
          'Builders'
        );
        results.builders = buildersResult;
      } catch (error: any) {
        console.error('❌ Builders sync failed:', error);
        results.builders = { error: error.message, synced: 0, errors: 0 };
      }
    }

    // Check health after sync
    const health = await checkSyncHealth();
    results.health = health;

    res.status(200).json({
      success: true,
      message: 'Leaderboard sync completed',
      ...results,
    });
  } catch (error: any) {
    console.error('❌ Sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync leaderboard',
      message: error.message,
    });
  }
}


