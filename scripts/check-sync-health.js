#!/usr/bin/env node
/**
 * Script to check leaderboard sync health
 * Usage: node scripts/check-sync-health.js
 */

import axios from 'axios';

const SYNC_URL = process.env.SYNC_URL || 'http://localhost:3000/api/leaderboard/sync';

async function checkHealth() {
  console.log('🏥 Checking leaderboard sync health...');
  console.log(`   URL: ${SYNC_URL}?health=true`);
  
  try {
    const response = await axios.get(SYNC_URL, {
      params: { health: 'true' },
      timeout: 10000,
    });
    
    const { health } = response.data;
    
    console.log('\n📊 Health Status:');
    console.log(`   Users:`);
    console.log(`     Last Update: ${health.users.lastUpdate ? new Date(health.users.lastUpdate).toLocaleString() : 'Never'}`);
    console.log(`     Status: ${health.users.isFresh ? '✅ Fresh (< 5 min old)' : '⚠️ Stale (> 5 min old)'}`);
    
    console.log(`   Builders:`);
    console.log(`     Last Update: ${health.builders.lastUpdate ? new Date(health.builders.lastUpdate).toLocaleString() : 'Never'}`);
    console.log(`     Status: ${health.builders.isFresh ? '✅ Fresh (< 5 min old)' : '⚠️ Stale (> 5 min old)'}`);
    
    if (health.users.isFresh && health.builders.isFresh) {
      console.log('\n✅ All systems healthy!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Some data is stale. Consider triggering a sync.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Health check failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

checkHealth();

