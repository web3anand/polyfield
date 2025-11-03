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
 * Fetches full activity history with pagination for detailed PnL timeline
 * Returns all activity events with timestamps to show actual fluctuations
 */
export async function fetchFullActivityHistory(userAddress: string, maxPages: number = 20): Promise<any[]> {
  console.log(`📊 Fetching full activity history with pagination...`);
  
  let allActivity: any[] = [];
  let offset = 0;
  const limit = 500; // Max per page
  let page = 1;
  
  while (page <= maxPages) {
    try {
      // Dynamic offset calculation to respect API limit: page * offset <= 10000
      let offsetPerPage = limit;
      if (page > 10) {
        offsetPerPage = Math.floor(10000 / page);
      }
      
      const response = await fetchWithRetry(() =>
        axios.get(`${DATA_API}/activity`, {
          params: {
            user: userAddress.toLowerCase(),
            limit: offsetPerPage,
            offset: offset,
          },
          timeout: 5000
        })
      );
      
      const activity = response.data || [];
      
      if (activity.length === 0) {
        break; // No more data
      }
      
      allActivity = allActivity.concat(activity);
      console.log(`   ✓ Page ${page}: Fetched ${activity.length} events (total: ${allActivity.length})`);
      
      // Check if we got less than the limit (last page)
      if (activity.length < offsetPerPage) {
        break;
      }
      
      offset += activity.length;
      page++;
      
      // Small delay between requests
      await delay(300);
      
    } catch (error: any) {
      console.error(`Error fetching activity page ${page}:`, error.message);
      break;
    }
  }
  
  console.log(`   ✓ Total activity events fetched: ${allActivity.length}`);
  return allActivity;
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
 * Generates full historical PnL timeline from activity events and closed positions
 * Combines both data sources to show actual fluctuations over time
 * Prioritizes closed positions for accuracy, uses activity events for granularity
 */
export function generateFullPnLHistory(
  activityEvents: any[],
  closedPositions: ClosedPosition[],
  finalTotalPnL: number
): Array<{ timestamp: string; value: number }> {
  console.log(`📊 Generating full PnL history from ${activityEvents.length} activity events and ${closedPositions.length} closed positions...`);
  
  // Primary approach: Use closed positions as anchor points (most accurate)
  // Then supplement with activity events to show intermediate fluctuations
  
  // Step 1: Build accurate realized PnL timeline from closed positions (sorted chronologically)
  const sortedClosedPositions = [...closedPositions]
    .filter(p => p.endDate)
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  
  let realizedPnLSum = 0;
  const positionHistory: Array<{ timestamp: string; value: number; source: 'position' }> = [];
  
  sortedClosedPositions.forEach(pos => {
    realizedPnLSum += pos.realizedPnl;
    positionHistory.push({
      timestamp: new Date(pos.endDate).toISOString(),
      value: parseFloat(realizedPnLSum.toFixed(2)),
      source: 'position'
    });
  });
  
  // Step 2: Process activity events to add intermediate points for granularity
  // Filter for events that might show PnL changes (REDEEM events show realized PnL)
  const relevantEvents = activityEvents
    .filter(event => {
      const type = event.type?.toUpperCase();
      // Include REDEEM (position closure), and TRADE events for activity visibility
      return type === 'REDEEM' || type === 'TRADE';
    })
    .map(event => {
      // Parse timestamp (handle both seconds and milliseconds)
      let timestamp: string;
      if (event.timestamp) {
        const ts = typeof event.timestamp === 'string' 
          ? new Date(event.timestamp).getTime() 
          : (event.timestamp > 1e12 ? event.timestamp : event.timestamp * 1000);
        timestamp = new Date(ts).toISOString();
      } else {
        return null;
      }
      
      return { 
        timestamp, 
        type: event.type?.toUpperCase(),
        // REDEEM events have amount representing realized PnL
        amount: event.type?.toUpperCase() === 'REDEEM' ? parseFloat(event.amount || 0) : 0
      };
    })
    .filter((e): e is { timestamp: string; type: string; amount: number } => e !== null)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  // Step 3: Merge both sources intelligently
  // Use closed positions as anchor points (they're more accurate)
  // Add activity events between position closures to show fluctuations
  const combinedHistory: Array<{ timestamp: string; value: number }> = [];
  
  // Create a map of position closures for quick lookup
  const positionMap = new Map<string, number>();
  positionHistory.forEach(p => {
    positionMap.set(p.timestamp, p.value);
  });
  
  // Combine events and positions, prioritizing positions when timestamps are close (within 1 second)
  const allPoints: Array<{ timestamp: string; value: number; priority: number }> = [];
  
  // Add position points (priority 1 - highest)
  positionHistory.forEach(p => {
    allPoints.push({ ...p, priority: 1 });
  });
  
  // Add activity events (priority 2 - lower, but still included)
  // For REDEEM events, try to match with positions (they should align)
  // For TRADE events, interpolate based on nearest position closure
  let lastKnownPnL = 0;
  let lastPositionIndex = 0;
  
  for (const event of relevantEvents) {
    const eventTime = new Date(event.timestamp).getTime();
    
    // Check if there's a position closure at a similar time (within 1 second)
    const matchingPosition = positionHistory.find(p => {
      const posTime = new Date(p.timestamp).getTime();
      return Math.abs(eventTime - posTime) < 1000; // Within 1 second
    });
    
    if (matchingPosition) {
      // Use the position value (more accurate), skip this event
      continue;
    }
    
    // Find the last position closure before this event
    while (lastPositionIndex < positionHistory.length - 1) {
      const nextPos = positionHistory[lastPositionIndex + 1];
      if (new Date(nextPos.timestamp).getTime() > eventTime) {
        break;
      }
      lastPositionIndex++;
      lastKnownPnL = nextPos.value;
    }
    
    // For REDEEM events, add the PnL increment
    // For TRADE events, we keep the same PnL (no realized change yet)
    let eventPnL = lastKnownPnL;
    if (event.type === 'REDEEM' && event.amount) {
      eventPnL += event.amount;
    }
    
    allPoints.push({
      timestamp: event.timestamp,
      value: parseFloat(eventPnL.toFixed(2)),
      priority: 2
    });
  }
  
  // Sort by timestamp, and if timestamps are equal, prioritize position data
  allPoints.sort((a, b) => {
    const timeDiff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    if (Math.abs(timeDiff) < 1000) { // Within 1 second
      return a.priority - b.priority; // Lower priority number = higher priority
    }
    return timeDiff;
  });
  
  // Remove duplicates (same timestamp, prefer position data)
  const seen = new Set<string>();
  for (const point of allPoints) {
    const key = point.timestamp.substring(0, 19); // Round to nearest second
    if (!seen.has(key)) {
      seen.add(key);
      combinedHistory.push({
        timestamp: point.timestamp,
        value: point.value
      });
    }
  }
  
  // Ensure we have at least the first and last point
  if (combinedHistory.length === 0) {
    // No data - create minimal history
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    combinedHistory.push(
      { timestamp: oneDayAgo.toISOString(), value: 0 },
      { timestamp: now.toISOString(), value: parseFloat(finalTotalPnL.toFixed(2)) }
    );
  } else {
    // Add/update final point with accurate total PnL
    const lastPoint = combinedHistory[combinedHistory.length - 1];
    const lastTime = new Date(lastPoint.timestamp).getTime();
    const now = Date.now();
    
    if (now - lastTime > 1000) { // More than 1 second ago
      // Update last point or add new one
      if (now - lastTime < 3600000) { // Less than 1 hour, update existing
        lastPoint.value = parseFloat(finalTotalPnL.toFixed(2));
        lastPoint.timestamp = new Date().toISOString();
      } else {
        // Add new current point
        combinedHistory.push({
          timestamp: new Date().toISOString(),
          value: parseFloat(finalTotalPnL.toFixed(2))
        });
      }
    } else {
      // Update existing point
      lastPoint.value = parseFloat(finalTotalPnL.toFixed(2));
    }
  }
  
  // Final sort to ensure chronological order
  combinedHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  console.log(`   ✓ Generated ${combinedHistory.length} data points showing actual fluctuations`);
  if (combinedHistory.length > 0) {
    console.log(`   ✓ Timeline: ${combinedHistory[0].timestamp} to ${combinedHistory[combinedHistory.length - 1].timestamp}`);
    console.log(`   ✓ Data points: ${positionHistory.length} from positions, ${combinedHistory.length - positionHistory.length} from activity`);
  }
  
  return combinedHistory;
}

/**
 * Fetches complete PnL data for a user with enhanced analytics
 * - Unrealized PnL: Sum of cashPnl from all open positions
 * - Realized PnL: Sum of realizedPnl from closed positions (via subgraph)
 * - Total PnL: Realized + Unrealized
 * - Full activity history for detailed PnL timeline
 */
export async function fetchUserPnLData(userAddress: string, includeFullHistory: boolean = true) {
  console.log(`\n📍 Fetching PnL data for: ${userAddress}\n`);
  
  const startTime = Date.now();
  
  try {
    // Fetch core data in parallel
    const [unrealizedData, realizedData, closedPositionsHistory] = await Promise.all([
      fetchUnrealizedPnl(userAddress),
      fetchRealizedPnl(userAddress),
      fetchClosedPositionsHistory(userAddress, 500) // Get more closed positions
    ]);
    
    // Fetch full activity history for detailed timeline (optional, can be slow)
    let fullActivityHistory: any[] = [];
    if (includeFullHistory) {
      console.log('📊 Fetching full activity history for detailed PnL timeline...');
      fullActivityHistory = await fetchFullActivityHistory(userAddress, 20); // Up to 20 pages
    }
    
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
      fullActivityHistory // Include for timeline generation
    };
    
    console.log(`\n✅ PnL Data Fetched in ${elapsed}s:`);
    console.log(`   Realized PnL: $${result.realizedPnl.toLocaleString()} (from ${result.closedPositions} closed positions)`);
    console.log(`   Unrealized PnL: $${result.unrealizedPnl.toLocaleString()} (from ${result.openPositions} open positions)`);
    console.log(`   Total PnL: $${result.totalPnl.toLocaleString()}`);
    console.log(`   Portfolio Value: $${result.portfolioValue.toLocaleString()}`);
    console.log(`   Activity Events: ${fullActivityHistory.length}\n`);
    
    return result;
  } catch (error) {
    console.error('❌ Error fetching PnL data:', error);
    throw error;
  }
}
