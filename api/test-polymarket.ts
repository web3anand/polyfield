import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('Testing Polymarket API connection...');
    
    const response = await axios.get(`${POLYMARKET_GAMMA_API}/public-search`, {
      params: {
        q: 'imdaybot',
        search_profiles: true,
      },
      timeout: 10000,
    });

    console.log('Polymarket API response status:', response.status);
    console.log('Polymarket API response data:', JSON.stringify(response.data, null, 2));

    res.status(200).json({
      status: 'success',
      message: 'Polymarket API connection successful',
      polymarketStatus: response.status,
      dataLength: Array.isArray(response.data) ? response.data.length : 
                  (response.data?.profiles ? response.data.profiles.length : 0),
      sampleData: Array.isArray(response.data) ? response.data[0] : 
                  (response.data?.profiles ? response.data.profiles[0] : response.data),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Polymarket API test error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Polymarket API connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
