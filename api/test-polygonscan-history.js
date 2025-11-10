/**
 * Test script to check Polygonscan for the account's complete history
 * Run with: node api/test-polygonscan-history.js
 */

import axios from 'axios';

const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';
const POLYGONSCAN_API = 'https://api.polygonscan.com/api';
const POLYGONSCAN_KEY = process.env.POLYGONSCAN_API_KEY || 'YourApiKeyToken'; // Free key from polygonscan.com

// Polymarket CTF Exchange contract on Polygon
const POLYMARKET_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';

async function checkPolygonscanHistory() {
  console.log('🧪 Checking Polygonscan for Complete Trading History\n');
  console.log('='.repeat(80));
  console.log(`Wallet: ${TEST_ADDRESS}\n`);
  
  // Get normal transactions
  console.log('📊 Step 1: Fetching normal transactions...\n');
  
  try {
    const response = await axios.get(POLYGONSCAN_API, {
      params: {
        module: 'account',
        action: 'txlist',
        address: TEST_ADDRESS,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 10000,
        sort: 'asc',
        apikey: POLYGONSCAN_KEY
      },
      timeout: 30000
    });
    
    if (response.data.status === '1' && response.data.result) {
      const txs = response.data.result;
      console.log(`✓ Found ${txs.length} transactions`);
      
      if (txs.length > 0) {
        const firstTx = txs[0];
        const lastTx = txs[txs.length - 1];
        
        const firstDate = new Date(parseInt(firstTx.timeStamp) * 1000);
        const lastDate = new Date(parseInt(lastTx.timeStamp) * 1000);
        
        console.log(`\n📅 Transaction Timeline:`);
        console.log(`   First transaction: ${firstDate.toISOString()}`);
        console.log(`   Block: ${firstTx.blockNumber}`);
        console.log(`   Hash: ${firstTx.hash}`);
        
        console.log(`\n   Last transaction: ${lastDate.toISOString()}`);
        console.log(`   Block: ${lastTx.blockNumber}`);
        
        const daysActive = Math.round((lastDate - firstDate) / (24 * 60 * 60 * 1000));
        console.log(`\n   Account age: ${daysActive} days (${Math.round(daysActive / 365 * 10) / 10} years)`);
        
        // Find Polymarket-related transactions
        const polymarketTxs = txs.filter(tx => 
          tx.to?.toLowerCase() === POLYMARKET_EXCHANGE.toLowerCase() ||
          tx.from?.toLowerCase() === POLYMARKET_EXCHANGE.toLowerCase()
        );
        
        console.log(`\n   Polymarket Exchange transactions: ${polymarketTxs.length}`);
        
        if (polymarketTxs.length > 0) {
          const firstPolyTx = polymarketTxs[0];
          const firstPolyDate = new Date(parseInt(firstPolyTx.timeStamp) * 1000);
          console.log(`   First Polymarket trade: ${firstPolyDate.toISOString()}`);
        }
      }
    } else {
      console.log('❌ Error:', response.data.message);
      console.log('   Note: You may need a Polygonscan API key for full access');
      console.log('   Get one free at: https://polygonscan.com/apis');
    }
  } catch (error) {
    console.error('❌ Error fetching from Polygonscan:', error.message);
  }
  
  // Get internal transactions
  console.log('\n\n📊 Step 2: Checking internal transactions...\n');
  
  try {
    const response = await axios.get(POLYGONSCAN_API, {
      params: {
        module: 'account',
        action: 'txlistinternal',
        address: TEST_ADDRESS,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 10000,
        sort: 'asc',
        apikey: POLYGONSCAN_KEY
      },
      timeout: 30000
    });
    
    if (response.data.status === '1' && response.data.result) {
      const txs = response.data.result;
      console.log(`✓ Found ${txs.length} internal transactions`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Get ERC-1155 token transfers (Polymarket uses ERC-1155)
  console.log('\n\n📊 Step 3: Fetching ERC-1155 token transfers (Polymarket positions)...\n');
  
  try {
    const response = await axios.get(POLYGONSCAN_API, {
      params: {
        module: 'account',
        action: 'token1155tx',
        address: TEST_ADDRESS,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 10000,
        sort: 'asc',
        apikey: POLYGONSCAN_KEY
      },
      timeout: 30000
    });
    
    if (response.data.status === '1' && response.data.result) {
      const transfers = response.data.result;
      console.log(`✓ Found ${transfers.length} ERC-1155 token transfers`);
      
      if (transfers.length > 0) {
        const firstTransfer = transfers[0];
        const lastTransfer = transfers[transfers.length - 1];
        
        const firstDate = new Date(parseInt(firstTransfer.timeStamp) * 1000);
        const lastDate = new Date(parseInt(lastTransfer.timeStamp) * 1000);
        
        console.log(`\n   First token transfer: ${firstDate.toISOString()}`);
        console.log(`   Last token transfer: ${lastDate.toISOString()}`);
        
        const daysActive = Math.round((lastDate - firstDate) / (24 * 60 * 60 * 1000));
        console.log(`   Trading duration: ${daysActive} days`);
      }
    } else {
      console.log('⚠ No ERC-1155 transfers found or API key needed');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 SOLUTION:');
  console.log('If Polymarket APIs only have recent data (~42 days), we need to:');
  console.log('1. Query blockchain events directly via Polygonscan API or Alchemy');
  console.log('2. Use the GraphQL subgraph if it has complete historical data');
  console.log('3. Fetch events using ethers.js/web3.js directly from Polygon RPC');
  console.log('4. Check if Polymarket has a historical data export feature');
  console.log('='.repeat(80));
}

checkPolygonscanHistory().catch(console.error);

