/**
 * Test script to check if Polymarket's GraphQL subgraph has complete historical data
 * Run with: node api/test-subgraph-complete.js
 */

import axios from 'axios';

const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

// Try different known Polymarket subgraph endpoints
const SUBGRAPHS = [
  {
    name: 'Polymarket PnL Subgraph (Goldsky)',
    url: 'https://api.goldsky.com/api/public/project_clzxeqkixjz2v01x1e7i82mhq/subgraphs/polymarket-pnl-prod/latest/gn'
  },
  {
    name: 'Polymarket Subgraph (The Graph)',
    url: 'https://api.thegraph.com/subgraphs/name/polymarket/polymarket-matic'
  },
  {
    name: 'Polymarket Trades Subgraph',
    url: 'https://api.thegraph.com/subgraphs/name/polymarket/polymarket-trades'
  }
];

async function testSubgraphHistory() {
  console.log('🧪 Testing Polymarket Subgraphs for Complete Historical Data\n');
  console.log('='.repeat(80));
  
  for (const subgraph of SUBGRAPHS) {
    console.log(`\n📊 Testing: ${subgraph.name}`);
    console.log(`   URL: ${subgraph.url}\n`);
    
    // Test 1: Try to fetch user trades with timestamp
    const queries = [
      {
        name: 'userTrades',
        query: `{
          userTrades(
            where: { user: "${TEST_ADDRESS.toLowerCase()}" }
            first: 10
            orderBy: timestamp
            orderDirection: asc
          ) {
            id
            user
            timestamp
            side
            size
            price
            asset
          }
        }`
      },
      {
        name: 'trades',
        query: `{
          trades(
            where: { user: "${TEST_ADDRESS.toLowerCase()}" }
            first: 10
            orderBy: timestamp
            orderDirection: asc
          ) {
            id
            timestamp
            type
            amount
          }
        }`
      },
      {
        name: 'userPositions with trades',
        query: `{
          userPositions(
            where: { user: "${TEST_ADDRESS.toLowerCase()}" }
            first: 5
          ) {
            id
            tokenId
            realizedPnl
            trades(first: 1000, orderBy: timestamp, orderDirection: asc) {
              id
              timestamp
              type
              amount
              price
            }
          }
        }`
      },
      {
        name: 'All trades (no user filter)',
        query: `{
          trades(
            first: 5
            orderBy: timestamp
            orderDirection: asc
          ) {
            id
            timestamp
          }
        }`
      }
    ];
    
    for (const test of queries) {
      try {
        const response = await axios.post(subgraph.url, {
          query: test.query
        }, { timeout: 10000 });
        
        if (response.data.errors) {
          console.log(`   ❌ ${test.name}: ${response.data.errors[0].message}`);
        } else if (response.data.data) {
          const data = response.data.data;
          const key = Object.keys(data)[0];
          const results = data[key];
          
          if (Array.isArray(results) && results.length > 0) {
            console.log(`   ✅ ${test.name}: Found ${results.length} results!`);
            console.log(`      First result:`, JSON.stringify(results[0], null, 2));
            
            // If we found trades with timestamps, this is our answer!
            if (results[0].timestamp) {
              const firstDate = new Date(results[0].timestamp * 1000).toISOString();
              console.log(`      ⭐ First trade date: ${firstDate}`);
              return { subgraph, data: results };
            }
          } else {
            console.log(`   ⚠ ${test.name}: No results`);
          }
        }
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`   ❌ ${test.name}: Subgraph not found (404)`);
        } else {
          console.log(`   ❌ ${test.name}: ${error.message}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 CONCLUSION:');
  console.log('If no subgraph has complete trade history with timestamps,');
  console.log('we need to accept that Polymarket APIs only store recent data.');
  console.log('\nThe best solution is to:');
  console.log('1. Use whatever historical data is available from /trades endpoint');
  console.log('2. For older data, query Polygon blockchain events directly');
  console.log('3. Or accept the limitation and show "Data from [earliest_date]"');
  console.log('='.repeat(80));
}

testSubgraphHistory().catch(console.error);

