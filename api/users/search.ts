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

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter q is required' });
      return;
    }

    console.log(`Search request for query: ${q}`);

    const response = await axios.get(`${POLYMARKET_GAMMA_API}/public-search`, {
      params: {
        q,
        search_profiles: true,
      },
      timeout: 5000,
    });

    let profiles: any[] = [];

    if (Array.isArray(response.data)) {
      profiles = response.data;
    } else if (response.data?.profiles && Array.isArray(response.data.profiles)) {
      profiles = response.data.profiles;
    }

    // Extract usernames from profiles
    const usernames = profiles
      .map(profile => profile.username || profile.display_name)
      .filter(Boolean)
      .slice(0, 10); // Limit to 10 suggestions

    console.log(`Found ${usernames.length} usernames for query: ${q}`);

    res.status(200).json(usernames);
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
