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
  allClosedPositions: Array<{ realizedPnl: number; tokenId: string }>
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
 * Note: API has pagination limits, so we fetch multiple pages
 */
export async function fetchClosedPositionsHistory(userAddress: string, limit: number = 5000): Promise<ClosedPosition[]> {
  console.log(`📊 Fetching up to ${limit} closed positions with timestamps (parallel)...`);
  
  try {
    // First, fetch first page to determine how many pages we need
    const pageSize = 100; // API seems to limit to ~100 per page
    const firstPageResponse = await axios.get(`${DATA_API}/closed-positions`, {
      params: {
        user: userAddress,
        limit: pageSize,
        offset: 0
      },
      timeout: 8000
    }).catch(() => ({ data: [] }));
    
    const firstBatch = firstPageResponse.data || [];
    if (firstBatch.length === 0) {
      console.log(`   ✓ No closed positions found`);
      return [];
    }
    
    const allPositions: any[] = [...firstBatch];
    console.log(`   Fetched page 1: ${firstBatch.length} positions (total: ${allPositions.length})`);
    
    // If first page is full, fetch remaining pages in parallel batches
    if (firstBatch.length === pageSize) {
      const maxPages = Math.ceil(limit / pageSize);
      const parallelBatchSize = 20; // Fetch 20 pages at a time in parallel
      let offset = pageSize;
      let pageCount = 1;
      
      while (pageCount < maxPages && allPositions.length < limit) {
        // Create parallel requests for next batch of pages
        const batchPromises = [];
        for (let i = 0; i < parallelBatchSize && pageCount < maxPages && allPositions.length < limit; i++) {
          batchPromises.push(
            axios.get(`${DATA_API}/closed-positions`, {
              params: {
                user: userAddress,
                limit: pageSize,
                offset: offset + (i * pageSize)
              },
              timeout: 8000
            }).catch(() => ({ data: [] }))
          );
        }
        
        const batchResults = await Promise.all(batchPromises);
        let hasMore = false;
        
        for (let i = 0; i < batchResults.length; i++) {
          const batch = batchResults[i].data || [];
          if (Array.isArray(batch) && batch.length > 0) {
            allPositions.push(...batch);
            pageCount++;
            console.log(`   Fetched page ${pageCount}: ${batch.length} positions (total: ${allPositions.length})`);
            
            if (batch.length === pageSize) {
              hasMore = true;
            }
          }
        }
        
        if (!hasMore || allPositions.length >= limit) break;
        offset += parallelBatchSize * pageSize;
      }
    }
    
    console.log(`   ✓ Fetched ${allPositions.length} total closed positions, sorting chronologically...`);
    
    // Sort by endDate chronologically (oldest first)
    const sortedPositions = allPositions
      .filter((p: any) => p.endDate) // Only positions with valid dates
      .sort((a: any, b: any) => {
        const dateA = new Date(a.endDate).getTime();
        const dateB = new Date(b.endDate).getTime();
        return dateA - dateB;
      })
      .map((p: any) => ({
        realizedPnl: parseFloat(p.realizedPnl || 0),
        endDate: p.endDate,
        title: p.title,
        initialValue: parseFloat(p.initialValue || 0),
        currentValue: parseFloat(p.currentValue || p.totalValue || 0),
        outcome: p.outcome || "YES"
      }));
    
    console.log(`   ✓ Sorted ${sortedPositions.length} positions chronologically`);
    
    return sortedPositions;
    
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
      
      // Removed delay for faster fetching
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
export async function fetchUserPnLData(userAddress: string, includeFullHistory?: boolean) {
  console.log(`\n📍 Fetching PnL data for: ${userAddress}\n`);
  
  const startTime = Date.now();
  
  try {
    // Fetch unrealized PnL, realized PnL, and closed positions history in parallel
    const [unrealizedData, realizedData, closedPositionsHistory] = await Promise.all([
      fetchUnrealizedPnl(userAddress),
      fetchRealizedPnl(userAddress),
      fetchClosedPositionsHistory(userAddress, 6000) // Fetch up to 6000 for complete history
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
      allClosedPositions: realizedData.allClosedPositions,
      fullActivityHistory: [] // Empty array for compatibility (trades fetching was removed)
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

/**
 * Generates full historical PnL timeline from closed positions
 * Uses closedPositionsHistory which has accurate realized PnL from API
 * Falls back to trades FIFO calculation only if no closed positions available
 */
export function generateFullPnLHistory(
  activityEvents: any[],
  closedPositions: ClosedPosition[],
  finalTotalPnL: number,
  trades?: Array<{ timestamp: string; type: 'BUY' | 'SELL'; price: number; size: number; marketName?: string }>
): Array<{ timestamp: string; value: number }> {
  
  // PRIORITY 1: Use closed positions data (most accurate - has real PnL from API)
  if (closedPositions && closedPositions.length > 0) {
    console.log(`📊 Generating PnL history from ${closedPositions.length} closed positions (API data)...`);
    
    const sortedPositions = closedPositions
      .filter(p => p.endDate)
      .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime());
    
    if (sortedPositions.length > 0) {
      let cumulativePnL = 0;
      const timeline: Array<{ timestamp: string; value: number }> = [];
      
      // Add starting point (7 days before first closed position)
      const firstTime = new Date(sortedPositions[0].endDate!).getTime();
      const startTime = firstTime - (7 * 24 * 60 * 60 * 1000);
      timeline.push({
        timestamp: new Date(startTime).toISOString(),
        value: 0
      });
      
      // Sample positions if there are too many (for performance)
      const shouldSample = sortedPositions.length > 1000;
      const sampleInterval = shouldSample ? Math.ceil(sortedPositions.length / 500) : 1;
      
      if (shouldSample) {
        console.log(`   📊 Sampling every ${sampleInterval} positions (${sortedPositions.length} total) for performance`);
      }
      
      // Add each position closure with cumulative PnL
      sortedPositions.forEach((pos, idx) => {
        cumulativePnL += pos.realizedPnl || 0;
        
        // Include all points or sample for large datasets
        if (idx % sampleInterval === 0 || idx === sortedPositions.length - 1) {
          timeline.push({
            timestamp: new Date(pos.endDate!).toISOString(),
            value: parseFloat(cumulativePnL.toFixed(2))
          });
        }
      });
      
      console.log(`   📈 Cumulative realized PnL from closed positions: $${cumulativePnL.toFixed(2)}`);
      console.log(`   📈 Final total PnL (includes unrealized): $${finalTotalPnL.toFixed(2)}`);
      console.log(`   📈 Unrealized PnL: $${(finalTotalPnL - cumulativePnL).toFixed(2)}`);
      
      // Handle the gap between last closed position and current total PnL
      const unrealizedPnL = finalTotalPnL - cumulativePnL;
      const now = Date.now();
      const lastClosedTime = new Date(sortedPositions[sortedPositions.length - 1].endDate!).getTime();
      const daysSinceLastClosed = (now - lastClosedTime) / (24 * 60 * 60 * 1000);
      
      // If there's significant unrealized PnL or time gap, add intermediate points
      if (Math.abs(unrealizedPnL) > 100 && daysSinceLastClosed > 0.5) {
        console.log(`   📊 Adding intermediate points for unrealized PnL transition...`);
        
        // Add points showing gradual growth from last closed to now
        const numPoints = Math.min(10, Math.max(3, Math.floor(daysSinceLastClosed)));
        const timeStep = (now - lastClosedTime) / numPoints;
        const pnlStep = unrealizedPnL / numPoints;
        
        for (let i = 1; i <= numPoints; i++) {
          const timestamp = lastClosedTime + (timeStep * i);
          const value = cumulativePnL + (pnlStep * i);
          timeline.push({
            timestamp: new Date(timestamp).toISOString(),
            value: parseFloat(value.toFixed(2))
          });
        }
      } else {
        // Just add the final point with total PnL
        timeline.push({
          timestamp: new Date().toISOString(),
          value: parseFloat(finalTotalPnL.toFixed(2))
        });
      }
      
      console.log(`   ✓ Generated ${timeline.length} data points from closed positions`);
      return timeline;
    }
  }
  
  // PRIORITY 2: Fall back to trades FIFO calculation if no closed positions
  // This is less accurate as we only get limited trades from API
  let tradeEvents = activityEvents && activityEvents.length > 0 
    ? activityEvents.filter(e => e.side && (e.side === 'BUY' || e.side === 'SELL'))
    : [];
  
  // Fallback: Use trades parameter if activityEvents is empty
  if (tradeEvents.length === 0 && trades && trades.length > 0) {
    tradeEvents = trades.map(t => {
      const timestamp = typeof t.timestamp === 'string' 
        ? new Date(t.timestamp).getTime() / 1000 
        : (typeof t.timestamp === 'number' ? (t.timestamp > 1e12 ? t.timestamp / 1000 : t.timestamp) : Date.now() / 1000);
      
      return {
        side: t.type,
        timestamp: timestamp,
        price: t.price,
        size: t.size,
        asset: t.marketName
      };
    });
  }
  
  if (tradeEvents.length > 0) {
    console.log(`📊 Generating PnL history from ${tradeEvents.length} trades (FIFO fallback - less accurate)...`);
    console.log(`   ⚠ Note: Using trades FIFO as fallback. Limited trades data may not reflect full history.`);
    
    // Calculate realized PnL from BUY/SELL matching (FIFO)
    const tradesByAsset = new Map<string, Array<any>>();
  
    tradeEvents.forEach(trade => {
      const asset = trade.asset || trade.tokenId;
      if (!asset) return;
      
      if (!tradesByAsset.has(asset)) {
        tradesByAsset.set(asset, []);
      }
      
      tradesByAsset.get(asset)!.push(trade);
    });
    
    const realizedPnLEvents: Array<{ timestamp: number; pnl: number }> = [];
    
    tradesByAsset.forEach((assetTrades) => {
      assetTrades.sort((a, b) => {
        const tsA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime() / 1000;
        const tsB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime() / 1000;
        return tsA - tsB;
      });
      
      const buyQueue: Array<{ size: number; costBasis: number }> = [];
      
      assetTrades.forEach(trade => {
        const side = (trade.side || '').toUpperCase();
        const size = parseFloat(trade.size || 0);
        const price = parseFloat(trade.price || 0);
        const usdcSize = price * size;
        const timestamp = typeof trade.timestamp === 'number' ? trade.timestamp : new Date(trade.timestamp).getTime() / 1000;
        
        if (side === 'BUY') {
          buyQueue.push({
            size: size,
            costBasis: usdcSize
          });
        } else if (side === 'SELL') {
          let remainingSize = size;
          let totalCost = 0;
          
          while (remainingSize > 0.000001 && buyQueue.length > 0) {
            const oldestBuy = buyQueue[0];
            const avgCostPerToken = oldestBuy.costBasis / oldestBuy.size;
            const matchSize = Math.min(remainingSize, oldestBuy.size);
            
            totalCost += matchSize * avgCostPerToken;
            
            oldestBuy.size -= matchSize;
            oldestBuy.costBasis -= matchSize * avgCostPerToken;
            remainingSize -= matchSize;
            
            if (oldestBuy.size <= 0.000001) {
              buyQueue.shift();
            }
          }
          
          const realizedPnL = usdcSize - totalCost;
          
          if (Math.abs(realizedPnL) > 0.01) {
            realizedPnLEvents.push({
              timestamp: timestamp,
              pnl: realizedPnL
            });
          }
        }
      });
    });
    
    realizedPnLEvents.sort((a, b) => a.timestamp - b.timestamp);
    
    let cumulativePnL = 0;
    const timeline: Array<{ timestamp: string; value: number }> = [];
    
    if (realizedPnLEvents.length > 0) {
      const firstTime = realizedPnLEvents[0].timestamp * 1000;
      const startTime = firstTime - (7 * 24 * 60 * 60 * 1000);
      timeline.push({
        timestamp: new Date(startTime).toISOString(),
        value: 0
      });
    }
    
    const shouldSample = realizedPnLEvents.length > 500;
    const sampleInterval = shouldSample ? Math.ceil(realizedPnLEvents.length / 200) : 1;
    
    realizedPnLEvents.forEach((event, idx) => {
      cumulativePnL += event.pnl;
      
      if (idx % sampleInterval === 0 || idx === realizedPnLEvents.length - 1) {
        timeline.push({
          timestamp: new Date(event.timestamp * 1000).toISOString(),
          value: parseFloat(cumulativePnL.toFixed(2))
        });
      }
    });
    
    // Add final point with accurate total PnL
    timeline.push({
      timestamp: new Date().toISOString(),
      value: parseFloat(finalTotalPnL.toFixed(2))
    });
    
    console.log(`   ✓ Calculated PnL from ${realizedPnLEvents.length} SELL events`);
    console.log(`   ✓ Cumulative from trades: $${cumulativePnL.toFixed(2)}`);
    console.log(`   ✓ Final total PnL (using accurate API value): $${finalTotalPnL.toFixed(2)}`);
    console.log(`   ✓ Generated ${timeline.length} data points`);
    
    return timeline;
  }
  
  // Final fallback: Just show current PnL
  console.log(`   ⚠ No historical data available, showing only current PnL`);
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  return [
    { timestamp: oneDayAgo.toISOString(), value: 0 },
    { timestamp: now.toISOString(), value: parseFloat(finalTotalPnL.toFixed(2)) }
  ];
}