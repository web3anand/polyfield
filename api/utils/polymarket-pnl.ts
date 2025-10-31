import axios from 'axios';

const PNL_SUBGRAPH = 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/pnl-subgraph/0.0.14/gn';
const DATA_API = 'https://data-api.polymarket.com';
const COLLATERAL_SCALE = 1000000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry wrapper with exponential backoff
 */
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>, 
  retries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchFn();
    } catch (e: any) {
      if (i === retries - 1) throw e;
      await delay(baseDelay * (i + 1));
    }
  }
  throw new Error('Retry limit exceeded');
}

interface RealizedPnLResult {
  realizedPnl: number;
  closedPositions: number;
  allClosedPositions: Array<{ realizedPnl: number; tokenId: string }>;
}

interface UnrealizedPnLResult {
  unrealizedPnl: number;
  portfolioValue: number;
  openPositions: number;
}

interface UserPositionResponse {
  realizedPnl: string;
}

interface PositionValue {
  value?: number | string;
  cost?: number | string;
}

interface ClosedPosition {
  realizedPnl: number;
  endDate: string;
  title: string;
}

/**
 * Fetches closed positions with timestamps for PnL history chart
 * Uses the /closed-positions endpoint which has endDate timestamps
 */
export async function fetchClosedPositionsHistory(userAddress: string, limit: number = 100): Promise<ClosedPosition[]> {
  console.log(`📊 Fetching ${limit} closed positions with timestamps...`);
  
  try {
    const response = await axios.get(`${DATA_API}/closed-positions`, {
      params: {
        user: userAddress,
        limit,
        offset: 0,
        sortBy: 'REALIZEDPNL', // Sort by PnL to get meaningful data
        sortDirection: 'DESC'
      },
      timeout: 3000
    });
    
    const positions = response.data || [];
    console.log(`   ✓ Fetched ${positions.length} closed positions with timestamps`);
    
    return positions.map((p: any) => ({
      realizedPnl: parseFloat(p.realizedPnl || 0),
      endDate: p.endDate,
      title: p.title
    }));
    
  } catch (error) {
    console.error('Error fetching closed positions history:', error);
    return [];
  }
}

/**
 * Fetches realized PnL from the Polymarket PnL Subgraph with pagination
 * This includes all closed positions with proper pagination safety
 */
export async function fetchRealizedPnl(userAddress: string): Promise<RealizedPnLResult> {
  console.log('📊 Fetching Realized PnL from PNL Subgraph...');
  
  let allPositions: any[] = [];
  let skip = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore && skip < 10000) { // Max skips safety
    try {
      const response = await fetchWithRetry(() => 
        axios.post(PNL_SUBGRAPH, {
          query: `query UserPositions($user: String!, $skip: Int!) {
            userPositions(where: { user: $user }, first: ${pageSize}, skip: $skip, orderBy: realizedPnl, orderDirection: desc) {
              id
              tokenId
              amount
              avgPrice
              realizedPnl
              totalBought
            }
          }`,
          variables: { user: userAddress.toLowerCase(), skip }
        })
      );
      
      const positions = response.data.data?.userPositions || [];
      
      if (positions.length === 0) hasMore = false;
      else {
        allPositions = allPositions.concat(positions);
        skip += pageSize;
        if (positions.length < pageSize) hasMore = false;
      }
      
      await delay(50);
    } catch (error) {
      console.error('Error fetching realized PnL batch:', error);
      break;
    }
  }
  
  // Calculate realized PnL with proper parsing
  let totalRealizedPnL = 0;
  let closedPositionsCount = 0;
  const closedPositionsData: Array<{ realizedPnl: number; tokenId: string }> = [];
  
  allPositions.forEach(pos => {
    const pnl = parseFloat(pos.realizedPnl || '0') / COLLATERAL_SCALE;
    if (Math.abs(pnl) > 0.01) {
      totalRealizedPnL += pnl;
      closedPositionsCount++;
      closedPositionsData.push({
        realizedPnl: pnl,
        tokenId: pos.tokenId
      });
    }
  });
  
  console.log(`   ✓ Total Positions: ${allPositions.length.toLocaleString()}`);
  console.log(`   ✓ Closed Positions: ${closedPositionsCount.toLocaleString()}`);
  console.log(`   ✓ Realized PnL: $${totalRealizedPnL.toLocaleString()}`);
  
  return { 
    realizedPnl: totalRealizedPnL, 
    closedPositions: closedPositionsCount,
    allClosedPositions: closedPositionsData
  };
}

/**
 * Fetches unrealized PnL from open positions with retry logic
 * Calculates the sum of cashPnl (unrealized) from all open positions
 */
export async function fetchUnrealizedPnl(userAddress: string): Promise<UnrealizedPnLResult> {
  console.log('📊 Fetching Open Positions for Unrealized PnL...');
  
  try {
    const response = await fetchWithRetry(() => 
      axios.get(`${DATA_API}/positions`, {
        params: { 
          user: userAddress.toLowerCase(),
          limit: 1000
        },
        timeout: 5000
      })
    );
    
    const positions = response.data || [];
    
    let totalValue = 0;
    let totalCostBasis = 0;
    let unrealizedPnl = 0;
    let openPositions = 0;
    
    positions.forEach((pos: any) => {
      const size = parseFloat(pos.size || '0');
      const initialValue = parseFloat(pos.initialValue || '0');
      const currentValue = parseFloat(pos.currentValue || '0');
      const cashPnl = parseFloat(pos.cashPnl || '0');
      
      if (size > 0.01) { // Only count positions with meaningful size
        totalCostBasis += initialValue;
        totalValue += currentValue;
        unrealizedPnl += cashPnl; // Use API-provided unrealized PnL
        openPositions++;
      }
    });
    
    console.log(`   ✓ Open Positions: ${openPositions}`);
    console.log(`   ✓ Cost Basis: $${totalCostBasis.toLocaleString()}`);
    console.log(`   ✓ Current Value: $${totalValue.toLocaleString()}`);
    console.log(`   ✓ Unrealized PnL: $${unrealizedPnl.toLocaleString()}`);
    
    return { 
      unrealizedPnl, 
      portfolioValue: totalValue, 
      openPositions 
    };
  } catch (error) {
    console.error('Error fetching unrealized PnL:', error);
    return { unrealizedPnl: 0, portfolioValue: 0, openPositions: 0 };
  }
}

/**
 * Fetches complete PnL data for a user with enhanced analytics
 * - Unrealized PnL: Sum of cashPnl from all open positions
 * - Realized PnL: Sum of realizedPnl from closed positions (via subgraph)
 * - Total PnL: Realized + Unrealized
 * - Win rate, biggest wins/losses, redeemable positions
 */
export async function fetchUserPnLData(userAddress: string) {
  console.log(`\n📍 Fetching PnL data for: ${userAddress}\n`);
  
  const startTime = Date.now();
  
  try {
    // Fetch unrealized PnL, realized PnL, and closed positions history in parallel
    const [unrealizedData, realizedData, closedPositionsHistory] = await Promise.all([
      fetchUnrealizedPnl(userAddress),
      fetchRealizedPnl(userAddress),
      fetchClosedPositionsHistory(userAddress, 100)
    ]);
    
    // Use subgraph's accurate realized PnL
    const realizedPnl = realizedData.realizedPnl;
    const unrealizedPnl = unrealizedData.unrealizedPnl;
    const totalPnl = realizedPnl + unrealizedPnl;
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    const result = {
      realizedPnl: parseFloat(realizedPnl.toFixed(2)),
      unrealizedPnl: parseFloat(unrealizedPnl.toFixed(2)),
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      portfolioValue: parseFloat(unrealizedData.portfolioValue.toFixed(2)),
      closedPositions: realizedData.closedPositions,
      openPositions: unrealizedData.openPositions,
      fetchTime: parseFloat(elapsed),
      closedPositionsHistory,
      allClosedPositions: realizedData.allClosedPositions
    };
    
    console.log(`\n✅ PnL Data Fetched in ${elapsed}s:`);
    console.log(`   Realized PnL: $${result.realizedPnl.toLocaleString()} (from ${result.closedPositions} closed positions)`);
    console.log(`   Unrealized PnL: $${result.unrealizedPnl.toLocaleString()} (from ${result.openPositions} open positions)`);
    console.log(`   Total PnL: $${result.totalPnl.toLocaleString()}`);
    console.log(`   Portfolio Value: $${result.portfolioValue.toLocaleString()}\n`);
    
    return result;
  } catch (error) {
    console.error('❌ Error fetching PnL data:', error);
    throw error;
  }
}
