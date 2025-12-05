import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const POLYMARKET_DATA_API = "https://data-api.polymarket.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    let timePeriod = (req.query.timePeriod as string) || "ALL";

    // ALL returns only aggregated data for one date, so use DAY for historical data
    // But allow explicit timePeriod override
    const apiTimePeriod = timePeriod === "ALL" ? "DAY" : timePeriod.toUpperCase();

    console.log(`📊 [VERCEL API] Fetching builder volume time-series: requested=${timePeriod}, api=${apiTimePeriod}`);

    const response = await axios.get(`${POLYMARKET_DATA_API}/v1/builders/volume`, {
      params: {
        timePeriod: apiTimePeriod,
      },
      timeout: 10000,
    });

    const rawData = response.data || [];
    console.log(`✓ [VERCEL API] Fetched ${rawData.length} raw volume data points`);

    // Return data per builder (not aggregated) so frontend can show different colors
    const volumeData = rawData
      .map((entry: any) => {
        const builder = entry.builder || entry.Builder || 'Unknown';
        const volume = parseFloat(entry.volume || entry.vol || 0) || 0;
        const dt = entry.dt || entry.date || entry.timestamp;
        
        return {
          dt: dt,
          builder: builder,
          volume: volume,
          activeUsers: parseInt(entry.activeUsers || entry.active_users || 0) || 0,
          verified: entry.verified || false,
        };
      })
      .filter((entry: any) => entry.dt && entry.builder && entry.builder !== 'Unknown') // Filter out invalid entries
      .sort((a: { dt: string }, b: { dt: string }) => new Date(a.dt).getTime() - new Date(b.dt).getTime());

    console.log(`✓ [VERCEL API] Sending ${volumeData.length} data points (per builder)`);

    res.status(200).json(volumeData);
  } catch (error: any) {
    console.error("❌ [VERCEL API] Error fetching builder volume time-series:", error);
    
    // Handle different error types gracefully
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
      
      // Return empty array instead of error to prevent frontend crashes
      if (error.response.status >= 500) {
        console.warn("External API error, returning empty array");
        return res.status(200).json([]);
      }
      
      return res.status(error.response.status).json({
        error: error.response.data?.error || "Failed to fetch builder volume time-series",
      });
    }
    
    // Network errors, timeouts, etc. - return empty array
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.warn("Request timeout, returning empty array");
      return res.status(200).json([]);
    }
    
    // Unknown errors - return empty array to prevent frontend crashes
    console.warn("Unknown error, returning empty array");
    return res.status(200).json([]);
  }
}

