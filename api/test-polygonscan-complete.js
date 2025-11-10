/**
 * Test script to get COMPLETE transaction history from Polygonscan
 * Run with: node api/test-polygonscan-complete.js
 */

import axios from 'axios';

const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';
const POLYGONSCAN_API = 'https://api.polygonscan.com/api';
const POLYGONSCAN_KEY = 'DSSJNVU7UU8XD2X9WGDD2RGN39BX2EGJR3';

// Polymarket contracts
const POLYMARKET_CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045'; // CTF Exchange
const POLYMARKET_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'; // Exchange

async function getCompleteHistory() {
  console.log('🧪 Getting COMPLETE Transaction History from Polygonscan\n');
  console.log('='.repeat(80));
  console.log(`Wallet: ${TEST_ADDRESS}\n`);
  
  // Step 1: Get ALL normal transactions
  console.log('📊 Step 1: Fetching ALL normal transactions...\n');
  
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
      console.log(`✅ Found ${txs.length} total transactions`);
      
      if (txs.length > 0) {
        const firstTx = txs[0];
        const lastTx = txs[txs.length - 1];
        
        const firstDate = new Date(parseInt(firstTx.timeStamp) * 1000);
        const lastDate = new Date(parseInt(lastTx.timeStamp) * 1000);
        
        console.log(`\n📅 Account History:`);
        console.log(`   FIRST EVER transaction: ${firstDate.toISOString()}`);
        console.log(`   Block: ${firstTx.blockNumber}`);
        console.log(`   Hash: ${firstTx.hash}`);
        console.log(`   To: ${firstTx.to}`);
        
        console.log(`\n   Latest transaction: ${lastDate.toISOString()}`);
        console.log(`   Block: ${lastTx.blockNumber}`);
        
        const daysActive = Math.round((lastDate - firstDate) / (24 * 60 * 60 * 1000));
        const yearsActive = Math.round(daysActive / 365 * 10) / 10;
        console.log(`\n   ⭐ Account age: ${daysActive} days (${yearsActive} years)`);
        
        // Find first Polymarket transaction
        const polymarketTxs = txs.filter(tx => {
          const to = tx.to?.toLowerCase();
          return to === POLYMARKET_CTF.toLowerCase() || 
                 to === POLYMARKET_EXCHANGE.toLowerCase() ||
                 tx.functionName?.includes('trade') ||
                 tx.functionName?.includes('Trade');
        });
        
        console.log(`\n   Polymarket-related transactions: ${polymarketTxs.length}`);
        
        if (polymarketTxs.length > 0) {
          const firstPolyTx = polymarketTxs[0];
          const firstPolyDate = new Date(parseInt(firstPolyTx.timeStamp) * 1000);
          console.log(`\n   🎯 FIRST Polymarket trade: ${firstPolyDate.toISOString()}`);
          console.log(`   Block: ${firstPolyTx.blockNumber}`);
          console.log(`   Function: ${firstPolyTx.functionName}`);
          console.log(`   Hash: ${firstPolyTx.hash}`);
          
          const lastPolyTx = polymarketTxs[polymarketTxs.length - 1];
          const lastPolyDate = new Date(parseInt(lastPolyTx.timeStamp) * 1000);
          console.log(`\n   Latest Polymarket trade: ${lastPolyDate.toISOString()}`);
          
          const tradingDays = Math.round((lastPolyDate - firstPolyDate) / (24 * 60 * 60 * 1000));
          console.log(`   Trading duration: ${tradingDays} days`);
        }
      }
    } else {
      console.log('❌ Error:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Error fetching transactions:', error.message);
  }
  
  // Step 2: Get ERC-1155 token transfers (Polymarket position tokens)
  console.log('\n\n📊 Step 2: Fetching ERC-1155 token transfers (Polymarket positions)...\n');
  
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
      console.log(`✅ Found ${transfers.length} ERC-1155 token transfers`);
      
      if (transfers.length > 0) {
        const firstTransfer = transfers[0];
        const lastTransfer = transfers[transfers.length - 1];
        
        const firstDate = new Date(parseInt(firstTransfer.timeStamp) * 1000);
        const lastDate = new Date(parseInt(lastTransfer.timeStamp) * 1000);
        
        console.log(`\n   First position transfer: ${firstDate.toISOString()}`);
        console.log(`   Token ID: ${firstTransfer.tokenID}`);
        console.log(`   Hash: ${firstTransfer.hash}`);
        
        console.log(`\n   Last position transfer: ${lastDate.toISOString()}`);
        
        const daysActive = Math.round((lastDate - firstDate) / (24 * 60 * 60 * 1000));
        console.log(`   Position trading duration: ${daysActive} days`);
      }
    } else {
      console.log('⚠ No ERC-1155 transfers found or error:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 NEXT STEPS:');
  console.log('Now we know the COMPLETE date range from blockchain.');
  console.log('\nSince Polymarket /trades API only has ~42 days of data,');
  console.log('we need to query blockchain events directly to get ALL trades.');
  console.log('\nOptions:');
  console.log('1. Use Polygonscan API to get event logs for TradeEvent/FillOrder');
  console.log('2. Use ethers.js to query Polymarket contract events from start block');
  console.log('3. Accept API limitation and show: "Showing last 42 days of data"');
  console.log('='.repeat(80));
}

getCompleteHistory().catch(console.error);

