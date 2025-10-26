import axios from 'axios';

const PNL_SUBGRAPH = 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/pnl-subgraph/0.0.14/gn';
const DATA_API = 'https://data-api.polymarket.com';
const COLLATERAL_SCALE = 1000000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface RealizedPnLResult {
  realizedPnl: number;
  closedPositions: number;
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
 * Fetches realized PnL from the Polymarket PnL Subgraph
 * This includes all closed positions
 */
export async function fetchRealizedPnl(userAddress: string): Promise<RealizedPnLResult> {
  console.log('📊 Fetching Realized PnL from PNL Subgraph...');
  
  let skip = 0;
  let total = 0;
  let positions = 0;
  
  while (true) {
    try {
      const response = await axios.post(PNL_SUBGRAPH, {
        query: `query UserPositions($user: String!, $skip: Int!) {
          userPositions(where: { user: $user }, first: 1000, skip: $skip) {
            realizedPnl
          }
        }`,
        variables: { user: userAddress.toLowerCase(), skip }
      });
      
      const batch: UserPositionResponse[] = response.data.data?.userPositions || [];
      if (batch.length === 0) break;
      
      batch.forEach(p => total += parseFloat(p.realizedPnl || '0'));
      positions += batch.length;
      skip += 1000;
      await delay(50);
      
      if (batch.length < 1000) break;
    } catch (error) {
      console.error('Error fetching realized PnL batch:', error);
      break;
    }
  }
  
  const realizedPnl = total / COLLATERAL_SCALE;
  console.log(`   ✓ Closed Positions: ${positions.toLocaleString()}`);
  console.log(`   ✓ Realized PnL: $${realizedPnl.toLocaleString()}`);
  
  return { realizedPnl, closedPositions: positions };
}

/**
 * Fetches unrealized PnL from open positions
 * Calculates the sum of PnL (both positive and negative) from current positions
 */
export async function fetchUnrealizedPnl(userAddress: string): Promise<UnrealizedPnLResult> {
  console.log('📊 Fetching Open Positions for Unrealized PnL...');
  
  try {
    const response = await axios.get(`${DATA_API}/positions`, {
      params: { 
        user: userAddress,
        limit: 1000
      },
      timeout: 5000
    });
    
    const positions = response.data || [];
    
    let totalValue = 0;
    let unrealizedPnl = 0;
    let openPositions = 0;
    
    positions.forEach((pos: any) => {
      const size = parseFloat(String(pos.size || 0));
      if (size > 0) { // Only count positions with size > 0 (open positions)
        const currentValue = parseFloat(String(pos.curPrice || 0)) * size;
        const costBasis = parseFloat(String(pos.avgPrice || 0)) * size;
        const positionPnL = currentValue - costBasis;
        
        totalValue += currentValue;
        unrealizedPnl += positionPnL; // Sum up all PnL (+ and -)
        openPositions++;
      }
    });
    
    console.log(`   ✓ Open Positions: ${openPositions}`);
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
 * Fetches complete PnL data for a user
 * - Unrealized PnL: Sum of (currentPrice - avgPrice) * size for all open positions
 * - Realized PnL: Sum of realizedPnl from closed positions
 * - Total PnL: Realized + Unrealized
 */
export async function fetchUserPnLData(userAddress: string) {
  console.log(`\n📍 Fetching PnL data for: ${userAddress}\n`);
  
  const startTime = Date.now();
  
  try {
    // Fetch unrealized PnL (from open positions) and closed positions history in parallel
    const [unrealizedData, closedPositionsHistory] = await Promise.all([
      fetchUnrealizedPnl(userAddress), // Gets unrealized PnL from open positions
      fetchClosedPositionsHistory(userAddress, 100) // Gets closed positions with timestamps
    ]);
    
    // Unrealized PnL = sum of all open position PnLs
    const unrealizedPnl = unrealizedData.unrealizedPnl;
    
    // Realized PnL = sum of all closed positions' realized PnL
    const realizedPnl = closedPositionsHistory.reduce(
      (sum, pos) => sum + (pos.realizedPnl || 0), 
      0
    );
    
    // Total PnL = Realized + Unrealized
    const totalPnl = realizedPnl + unrealizedPnl;
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    const result = {
      realizedPnl: parseFloat(realizedPnl.toFixed(2)),
      unrealizedPnl: parseFloat(unrealizedPnl.toFixed(2)),
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      portfolioValue: parseFloat(unrealizedData.portfolioValue.toFixed(2)),
      closedPositions: closedPositionsHistory.length,
      openPositions: unrealizedData.openPositions,
      fetchTime: parseFloat(elapsed),
      closedPositionsHistory
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
