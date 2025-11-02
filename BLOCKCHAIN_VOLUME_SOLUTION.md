# Complete On-Chain Volume Calculation Solution

## Overview

This solution uses **Etherscan API V2** with `chainid=137` (Polygon) to fetch complete on-chain transaction data and calculate trading volume.

## API Endpoints Used

Based on [Etherscan API V2 documentation](https://docs.etherscan.io/api-reference/endpoint/txlist):

1. **Get Native Balance** - `action=balance`
   - Gets MATIC balance for the wallet
   - Endpoint: `GET /v2/api?chainid=137&module=account&action=balance&address={wallet}`

2. **Get Normal Transactions** - `action=txlist`
   - Gets all normal transactions
   - Endpoint: `GET /v2/api?chainid=137&module=account&action=txlist&address={wallet}&startblock=0&endblock=99999999&page={page}&offset=10000&sort=desc`

3. **Get ERC20 Token Transfers** - `action=tokentx`
   - Gets all USDC token transfers (Polymarket uses USDC)
   - USDC Contract: `0x2791bca1f2de4661ed88a30c99a7a9449aa84174`
   - Endpoint: `GET /v2/api?chainid=137&module=account&action=tokentx&contractaddress={USDC}&address={wallet}&startblock=0&endblock=99999999&page={page}&offset=10000&sort=desc`

4. **Get Internal Transactions** - `action=txlistinternal`
   - Gets all internal transactions (contract calls)
   - Endpoint: `GET /v2/api?chainid=137&module=account&action=txlistinternal&address={wallet}&startblock=0&endblock=99999999&page={page}&offset=10000&sort=desc`

## Implementation

### Step 1: Setup API Key

Get free API key from: https://polygonscan.com/apis

Set environment variable:
```bash
POLYGONSCAN_API_KEY=your_api_key_here
```

### Step 2: Paginate Through All Data

All endpoints support pagination with:
- `page`: Page number (starts at 1)
- `offset`: Records per page (max 10000)

Example pagination function:
```javascript
async function paginateEtherscanAPI(params, maxPages = 50) {
  const allResults = [];
  let page = 1;
  
  while (page <= maxPages) {
    const response = await axios.get(ETHERSCAN_API_V2, {
      params: { ...params, page, offset: 10000 }
    });
    
    const results = response.data?.result || [];
    if (results.length === 0) break;
    
    allResults.push(...results);
    if (results.length < 10000) break;
    
    page++;
    await delay(200); // Rate limit
  }
  
  return allResults;
}
```

### Step 3: Calculate Volume

#### Option A: From USDC Transfers (Most Accurate)
```javascript
const usdcVolume = usdcTransfers.reduce((sum, tx) => {
  const decimals = parseInt(tx.tokenDecimal || 6);
  const value = parseFloat(tx.value || 0) / Math.pow(10, decimals);
  return sum + Math.abs(value); // Absolute value for all transfers
}, 0);
```

#### Option B: From Normal Transactions (MATIC value)
```javascript
const maticVolume = normalTxns.reduce((sum, tx) => {
  const value = parseFloat(tx.value || 0) / 1e18; // Convert from wei
  return sum + Math.abs(value);
}, 0);

const volumeUSD = maticVolume * maticPrice; // Convert to USD
```

#### Option C: Combined Approach
```javascript
const totalVolume = usdcVolume + (normalTxVolume * maticPrice);
```

## Test File

`test-volume-onchain-complete.js` implements:
- ✅ Native balance fetching
- ✅ Complete pagination for all 4 endpoint types
- ✅ Multiple volume calculation methods
- ✅ Comparison with API data

## Usage

```bash
# Set API key
export POLYGONSCAN_API_KEY=your_key_here

# Run test
node test-volume-onchain-complete.js
```

## Expected Benefits

1. **Complete Data**: Gets ALL transactions from blockchain (no API limits)
2. **Historical Data**: Can fetch from any block (full history)
3. **Accurate Volume**: Direct USDC transfer data = exact volume
4. **No Missing Trades**: Blockchain has 100% of all transactions

## Next Steps

1. **Get API Key**: Register at https://polygonscan.com/apis
2. **Run Test**: Execute `test-volume-onchain-complete.js` with API key
3. **Verify Results**: Check if blockchain volume matches $1,777.04
4. **Implement**: If it matches, update main code to use blockchain data


