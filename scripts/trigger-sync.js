#!/usr/bin/env node
/**
 * Script to manually trigger leaderboard sync
 * Usage: node scripts/trigger-sync.js [users|builders|all]
 */

import axios from 'axios';

const SYNC_URL = process.env.SYNC_URL || 'http://localhost:3000/api/leaderboard/sync';
const syncType = process.argv[2] || 'all';

async function triggerSync() {
  console.log(`🚀 Triggering leaderboard sync: ${syncType}`);
  console.log(`   URL: ${SYNC_URL}`);
  
  try {
    const response = await axios.get(SYNC_URL, {
      params: {
        type: syncType,
        timePeriod: 'all',
        maxPages: 30,
      },
      timeout: 300000, // 5 minutes timeout
    });
    
    console.log('\n✅ Sync completed successfully!');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.health) {
      console.log('\n📊 Health Status:');
      console.log(`   Users: ${response.data.health.users.isFresh ? '✅ Fresh' : '⚠️ Stale'}`);
      console.log(`   Builders: ${response.data.health.builders.isFresh ? '✅ Fresh' : '⚠️ Stale'}`);
    }
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

triggerSync();

