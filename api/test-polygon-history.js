/**
 * Test script to get complete transaction history from Polygonscan (Polygon chain)
 * Run with: node api/test-polygon-history.js
 */

import axios from 'axios';

const TEST_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';
const ETHERSCAN_API = 'https://api.etherscan.io/v2/api';
const API_KEY = 'DSSJNVU7UU8XD2X9WGDD2RGN39BX2EGJR3';
const POLYGON_CHAIN_ID = '137';

async function getPolygonHistory() {
  console.log('🧪 Getting Complete Transaction History from Polygon Chain\n');
  console.log('='.repeat(80));
  console.log(`Wallet: ${TEST_ADDRESS}`);
  console.log(`Chain: Polygon (chainId: ${POLYGON_CHAIN_ID})\n`);
  
  // Step 1: Get ALL transactions on Polygon
  console.log('📊 Fetching ALL transactions on Polygon...\n');
  
  try {
    const response = await axios.get(ETHERSCAN_API, {
      params: {
        chainid: POLYGON_CHAIN_ID,
        module: 'account',
        action: 'txlist',
        address: TEST_ADDRESS,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 10000,
        sort: 'asc',
        apikey: API_KEY
      },
      timeout: 30000
    });
    
    console.log('Response status:', response.data.status);
    console.log('Response message:', response.data.message);
    
    if (response.data.status === '1' && response.data.result) {
      const txs = response.data.result;
      console.log(`\n✅ SUCCESS! Found ${txs.length} transactions on Polygon\n`);
      
      if (txs.length > 0) {
        const firstTx = txs[0];
        const lastTx = txs[txs.length - 1];
        
        const firstDate = new Date(parseInt(firstTx.timeStamp) * 1000);
        const lastDate = new Date(parseInt(lastTx.timeStamp) * 1000);
        
        console.log('📅 ACCOUNT HISTORY ON POLYGON:');
        console.log('='.repeat(80));
        console.log(`\n⭐ FIRST EVER transaction:`);
        console.log(`   Date: ${firstDate.toISOString()}`);
        console.log(`   Block: ${firstTx.blockNumber}`);
        console.log(`   Hash: ${firstTx.hash}`);
        console.log(`   From: ${firstTx.from}`);
        console.log(`   To: ${firstTx.to}`);
        console.log(`   Function: ${firstTx.functionName || 'N/A'}`);
        
        console.log(`\n   Latest transaction:`);
        console.log(`   Date: ${lastDate.toISOString()}`);
        console.log(`   Block: ${lastTx.blockNumber}`);
        
        const daysActive = Math.round((lastDate - firstDate) / (24 * 60 * 60 * 1000));
        const yearsActive = Math.round(daysActive / 365 * 10) / 10;
        console.log(`\n🎯 ACCOUNT AGE: ${daysActive} days (${yearsActive} years)`);
        console.log(`   From ${firstDate.toISOString().split('T')[0]} to ${lastDate.toISOString().split('T')[0]}`);
        
        // Analyze transactions by contract
        const contractInteractions = {};
        txs.forEach(tx => {
          if (tx.to) {
            const contract = tx.to.toLowerCase();
            if (!contractInteractions[contract]) {
              contractInteractions[contract] = {
                count: 0,
                firstDate: new Date(parseInt(tx.timeStamp) * 1000),
                functions: new Set()
              };
            }
            contractInteractions[contract].count++;
            if (tx.functionName) {
              contractInteractions[contract].functions.add(tx.functionName.split('(')[0]);
            }
          }
        });
        
        console.log(`\n📊 TOP CONTRACT INTERACTIONS:`);
        const sortedContracts = Object.entries(contractInteractions)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10);
        
        sortedContracts.forEach(([contract, data], idx) => {
          console.log(`\n${idx + 1}. ${contract}`);
          console.log(`   Interactions: ${data.count}`);
          console.log(`   First: ${data.firstDate.toISOString().split('T')[0]}`);
          console.log(`   Functions: ${Array.from(data.functions).slice(0, 5).join(', ')}`);
        });
        
        // Look for Polymarket-related transactions
        const polymarketKeywords = ['trade', 'fill', 'order', 'polymarket', 'ctf', 'exchange'];
        const polymarketTxs = txs.filter(tx => {
          const functionName = (tx.functionName || '').toLowerCase();
          const to = (tx.to || '').toLowerCase();
          return polymarketKeywords.some(keyword => 
            functionName.includes(keyword) || to.includes(keyword)
          );
        });
        
        if (polymarketTxs.length > 0) {
          console.log(`\n\n🎯 POLYMARKET TRADING HISTORY:`);
          console.log('='.repeat(80));
          const firstPolyTx = polymarketTxs[0];
          const lastPolyTx = polymarketTxs[polymarketTxs.length - 1];
          const firstPolyDate = new Date(parseInt(firstPolyTx.timeStamp) * 1000);
          const lastPolyDate = new Date(parseInt(lastPolyTx.timeStamp) * 1000);
          
          console.log(`\n   Polymarket transactions: ${polymarketTxs.length}`);
          console.log(`   First trade: ${firstPolyDate.toISOString()}`);
          console.log(`   Latest trade: ${lastPolyDate.toISOString()}`);
          
          const tradingDays = Math.round((lastPolyDate - firstPolyDate) / (24 * 60 * 60 * 1000));
          console.log(`   Trading duration: ${tradingDays} days`);
        }
      }
    } else {
      console.log('\n❌ Error or no transactions found');
      console.log('Message:', response.data.message);
      console.log('Result:', response.data.result);
    }
  } catch (error) {
    console.error('\n❌ Error fetching transactions:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 NEXT STEP:');
  console.log('Now that we know the COMPLETE date range from blockchain,');
  console.log('we need to decide:');
  console.log('1. Accept Polymarket API limitation (~42 days of data)');
  console.log('2. Query blockchain events directly for ALL historical trades');
  console.log('3. Use combination: subgraph for totals + API for recent timeline');
  console.log('='.repeat(80));
}

getPolygonHistory().catch(console.error);

