import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const POLYMARKET_DATA_API = "https://data-api.polymarket.com";

// Supabase config - support multiple env var naming conventions
// Priority: SUPABASE_URL > NEXT_PUBLIC_SUPABASE_URL > default
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://bzlxrggciehkcslchooe.supabase.co';

const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY environment variable');
  console.error('   SUPABASE_URL:', SUPABASE_URL);
  console.error('   Checked: SUPABASE_SERVICE_KEY, SUPABASE_KEY');
  throw new Error('Missing SUPABASE_SERVICE_KEY - must be set in Vercel environment variables');
}

// Log what we're using (for debugging)
console.log(`🔗 Using Supabase URL: ${SUPABASE_URL}`);
console.log(`🔑 Service Key: ${SUPABASE_SERVICE_KEY ? `${SUPABASE_SERVICE_KEY.substring(0, 20)}...` : 'NOT SET'}`);
console.log(`📋 Env vars checked: SUPABASE_URL=${process.env.SUPABASE_URL ? 'SET' : 'NOT SET'}, NEXT_PUBLIC_SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET'}`);

// Validate Supabase URL - reject old project
if (SUPABASE_URL.includes('orxyqgecymsuwuxtjdck')) {
  console.error(`❌ ERROR: Old Supabase project URL detected!`);
  console.error(`   Found: ${SUPABASE_URL}`);
  console.error(`   This project no longer exists. Please update Vercel environment variables:`);
  console.error(`   - Set SUPABASE_URL to: https://bzlxrggciehkcslchooe.supabase.co`);
  console.error(`   - Or set NEXT_PUBLIC_SUPABASE_URL to: https://bzlxrggciehkcslchooe.supabase.co`);
  throw new Error('Invalid Supabase URL: old project detected. Update Vercel environment variables.');
}

if (!SUPABASE_URL.includes('bzlxrggciehkcslchooe')) {
  console.warn(`⚠️ WARNING: Supabase URL does not match expected project!`);
  console.warn(`   Expected: bzlxrggciehkcslchooe.supabase.co`);
  console.warn(`   Got: ${SUPABASE_URL}`);
  console.warn(`   This may cause connection errors. Please check Vercel environment variables.`);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Sync users leaderboard - fetches until zero data, uses upsert (update existing, insert new)
async function syncUsersLeaderboard(timePeriod: string = 'all') {
  console.log(`🔄 Syncing users leaderboard (${timePeriod}) - fetching ALL pages until zero data...`);
  
  const limit = 50; // API max per request
  const fetchBatchSize = 10; // Fetch 10 pages at a time (increased for better performance)
  const saveBatchSize = 200; // Save 200 records at a time (increased for better performance)
  const delayBetweenBatches = 1500; // 1.5 seconds delay
  const delayBetweenPages = 300; // 300ms delay between pages (reduced for faster sync)
  
  let page = 0;
  let hasMoreData = true;
  let totalSynced = 0;
  let totalErrors = 0;
  let totalFetched = 0;
  const allUsers: any[] = [];
  const startTime = Date.now();
  
  // Fetch ALL pages until we get zero data (can handle 100+ pages)
  while (hasMoreData) {
    const batchStart = page;
    const batchEnd = page + fetchBatchSize;
    
    console.log(`  📥 Fetching pages ${batchStart + 1}-${batchEnd}... (Total fetched so far: ${totalFetched})`);
    
    for (let batchIndex = 0; batchIndex < fetchBatchSize; batchIndex++) {
      const currentPage = batchStart + batchIndex;
      const offset = currentPage * limit;
      
      try {
        if (batchIndex > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenPages));
        }
        
        const response = await axios.get(`${POLYMARKET_DATA_API}/v1/leaderboard`, {
          params: {
            timePeriod: timePeriod.toLowerCase(),
            orderBy: 'VOL',
            limit,
            offset,
            category: 'overall',
          },
          timeout: 15000,
        });
        
        const users = response.data || [];
        if (users.length === 0) {
          hasMoreData = false;
          console.log(`  ⚠️ Page ${currentPage + 1} returned no data - stopping fetch`);
          break;
        }
        
        const transformedUsers = users.map((user: any) => ({
          rank: user.rank || offset + users.indexOf(user) + 1,
          username: user.userName || user.name || 'Unknown',
          x_username: user.xUsername,
          volume: parseFloat(user.vol || user.volume || 0),
          wallet_address: user.proxyWallet || user.user || user.walletAddress || user.wallet || user.address || null,
          profile_image: user.profileImage || user.avatar || null,
          pnl: user.pnl !== undefined ? parseFloat(user.pnl) : null,
          time_period: timePeriod.toLowerCase(),
        }));
        
        allUsers.push(...transformedUsers);
        totalFetched += users.length;
        console.log(`    ✓ Page ${currentPage + 1}: ${users.length} users (total fetched: ${totalFetched}, in memory: ${allUsers.length})`);
      } catch (error: any) {
        console.error(`    ❌ Error fetching page ${currentPage + 1}:`, error.message);
        // Continue to next page instead of stopping (unless it's the first page)
        if (currentPage === 0) {
          hasMoreData = false;
          break;
        }
        // For other pages, continue fetching
      }
    }
    
    if (hasMoreData) {
      page += fetchBatchSize;
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  const fetchTime = Date.now() - startTime;
  console.log(`✓ Fetched ${allUsers.length} total users from Polymarket API in ${(fetchTime / 1000).toFixed(2)}s`);
  
  if (allUsers.length === 0) {
    console.warn('⚠️ No users to sync');
    return { synced: 0, errors: 0, totalFetched: 0, fetchTime: fetchTime };
  }
  
  // Sort by rank
  allUsers.sort((a, b) => a.rank - b.rank);
  
  console.log(`💾 Starting database upsert for ${allUsers.length} users (${Math.ceil(allUsers.length / saveBatchSize)} batches)...`);
  const saveStartTime = Date.now();
  
  // Upsert data in batches (update existing, insert new) - no profile_image
  for (let i = 0; i < allUsers.length; i += saveBatchSize) {
    const batch = allUsers.slice(i, i + saveBatchSize);
    const batchNum = Math.floor(i / saveBatchSize) + 1;
    const totalBatches = Math.ceil(allUsers.length / saveBatchSize);
    
    try {
      // Use upsert to update existing records or insert new ones
      // Conflict on username + time_period (unique constraint)
      const { data, error } = await supabase
        .from('leaderboard_users')
        .upsert(batch, {
          onConflict: 'username,time_period',
          ignoreDuplicates: false,
        })
        .select();
      
      if (error) {
        console.error(`❌ Error upserting batch ${batchNum}/${totalBatches}:`, error.message);
        totalErrors += batch.length;
      } else {
        totalSynced += batch.length;
        console.log(`✓ Upserted batch ${batchNum}/${totalBatches} (${batch.length} users, returned ${data?.length || 0} rows)`);
      }
    } catch (error: any) {
      console.error(`❌ Exception upserting batch ${batchNum}/${totalBatches}:`, error.message);
      totalErrors += batch.length;
    }
  }
  
  const saveTime = Date.now() - saveStartTime;
  const totalTime = Date.now() - startTime;
  console.log(`✅ Users sync complete: ${totalSynced} synced, ${totalErrors} errors (Total time: ${(totalTime / 1000).toFixed(2)}s, Save time: ${(saveTime / 1000).toFixed(2)}s)`);
  return { synced: totalSynced, errors: totalErrors, totalFetched: allUsers.length, fetchTime, saveTime, totalTime };
}

// Sync builders leaderboard - fetches until zero data, uses upsert (update existing, insert new)
async function syncBuildersLeaderboard(timePeriod: string = 'all') {
  console.log(`🔄 Syncing builders leaderboard (${timePeriod}) - fetching ALL pages until zero data...`);
  
  const limit = 50; // API max per request
  const fetchBatchSize = 10; // Fetch 10 pages at a time (increased for better performance)
  const saveBatchSize = 200; // Save 200 records at a time (increased for better performance)
  const delayBetweenBatches = 1500; // 1.5 seconds delay
  const delayBetweenPages = 300; // 300ms delay between pages (reduced for faster sync)
  
  let page = 0;
  let hasMoreData = true;
  let totalSynced = 0;
  let totalErrors = 0;
  let totalFetched = 0;
  const allBuilders: any[] = [];
  const startTime = Date.now();
  
  // Fetch ALL pages until we get zero data (can handle 100+ pages)
  while (hasMoreData) {
    const batchStart = page;
    const batchEnd = page + fetchBatchSize;
    
    console.log(`  📥 Fetching pages ${batchStart + 1}-${batchEnd}... (Total fetched so far: ${totalFetched})`);
    
    for (let batchIndex = 0; batchIndex < fetchBatchSize; batchIndex++) {
      const currentPage = batchStart + batchIndex;
      const offset = currentPage * limit;
      
      try {
        if (batchIndex > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenPages));
        }
        
        const response = await axios.get(`${POLYMARKET_DATA_API}/v1/builders/leaderboard`, {
          params: {
            timePeriod: timePeriod.toLowerCase(),
            orderBy: 'VOL',
            limit,
            offset,
          },
          timeout: 15000,
        });
        
        const builders = response.data || [];
        if (builders.length === 0) {
          hasMoreData = false;
          console.log(`  ⚠️ Page ${currentPage + 1} returned no data - stopping fetch`);
          break;
        }
        
        const transformedBuilders = builders.map((builder: any) => ({
          rank: builder.rank || offset + builders.indexOf(builder) + 1,
          builder_name: builder.builderName || builder.name || builder.builder || 'Unknown',
          volume: parseFloat(builder.vol || builder.volume || 0),
          markets_created: parseInt(builder.marketsCreated || builder.markets || builder.marketsCreated || 0),
          active_users: parseInt(builder.activeUsers || builder.activeUsers || 0),
          verified: builder.verified === true || builder.verified === 'true' || false,
          builder_logo: builder.builderLogo || builder.logo || builder.image || null,
          time_period: timePeriod.toLowerCase(),
        }));
        
        allBuilders.push(...transformedBuilders);
        totalFetched += builders.length;
        console.log(`    ✓ Page ${currentPage + 1}: ${builders.length} builders (total fetched: ${totalFetched}, in memory: ${allBuilders.length})`);
      } catch (error: any) {
        console.error(`    ❌ Error fetching page ${currentPage + 1}:`, error.message);
        // Continue to next page instead of stopping (unless it's the first page)
        if (currentPage === 0) {
          hasMoreData = false;
          break;
        }
        // For other pages, continue fetching
      }
    }
    
    if (hasMoreData) {
      page += fetchBatchSize;
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  const fetchTime = Date.now() - startTime;
  console.log(`✓ Fetched ${allBuilders.length} total builders from Polymarket API in ${(fetchTime / 1000).toFixed(2)}s`);
  
  if (allBuilders.length === 0) {
    console.warn('⚠️ No builders to sync');
    return { synced: 0, errors: 0, totalFetched: 0, fetchTime: fetchTime };
  }
  
  // Sort by rank
  allBuilders.sort((a, b) => a.rank - b.rank);
  
  console.log(`💾 Starting database upsert for ${allBuilders.length} builders (${Math.ceil(allBuilders.length / saveBatchSize)} batches)...`);
  const saveStartTime = Date.now();
  
  // Upsert data in batches (update existing, insert new)
  for (let i = 0; i < allBuilders.length; i += saveBatchSize) {
    const batch = allBuilders.slice(i, i + saveBatchSize);
    const batchNum = Math.floor(i / saveBatchSize) + 1;
    const totalBatches = Math.ceil(allBuilders.length / saveBatchSize);
    
    try {
      // Use upsert to update existing records or insert new ones
      // Conflict on builder_name + time_period (unique constraint)
      const { data, error } = await supabase
        .from('leaderboard_builders')
        .upsert(batch, {
          onConflict: 'builder_name,time_period',
          ignoreDuplicates: false,
        })
        .select();
      
      if (error) {
        console.error(`❌ Error upserting batch ${batchNum}/${totalBatches}:`, error.message);
        totalErrors += batch.length;
      } else {
        totalSynced += batch.length;
        console.log(`✓ Upserted batch ${batchNum}/${totalBatches} (${batch.length} builders, returned ${data?.length || 0} rows)`);
      }
    } catch (error: any) {
      console.error(`❌ Exception upserting batch ${batchNum}/${totalBatches}:`, error.message);
      totalErrors += batch.length;
    }
  }
  
  const saveTime = Date.now() - saveStartTime;
  const totalTime = Date.now() - startTime;
  console.log(`✅ Builders sync complete: ${totalSynced} synced, ${totalErrors} errors (Total time: ${(totalTime / 1000).toFixed(2)}s, Save time: ${(saveTime / 1000).toFixed(2)}s)`);
  return { synced: totalSynced, errors: totalErrors, totalFetched: allBuilders.length, fetchTime, saveTime, totalTime };
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

  // Verify Supabase connection
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    res.status(500).json({ 
      error: 'Missing Supabase credentials',
      message: 'SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables',
      currentUrl: SUPABASE_URL || 'NOT SET'
    });
    return;
  }
  
  console.log(`🔗 Sync endpoint called - Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`);

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
    const { type, timePeriod } = req.query;
    const syncType = (type as string) || 'all'; // 'users', 'builders', or 'all'
    const period = (timePeriod as string) || 'all';

    console.log(`🚀 Starting leaderboard sync: type=${syncType}, timePeriod=${period} (fetching until zero data)`);

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
          () => syncUsersLeaderboard(period),
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
          () => syncBuildersLeaderboard(period),
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
