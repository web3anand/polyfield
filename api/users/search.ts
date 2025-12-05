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

    if (q.length < 2) {
      // Return empty array for queries that are too short
      res.status(200).json([]);
      return;
    }

    console.log(`Search request for query: ${q}`);

    try {
      const response = await axios.get(`${POLYMARKET_GAMMA_API}/public-search`, {
        params: {
          q,
          search_profiles: true,
        },
        timeout: 5000,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      // If external API returns an error status, return empty array
      if (response.status >= 400) {
        console.warn(`Polymarket API returned ${response.status} for query: ${q}`);
        res.status(200).json([]);
        return;
      }

      let profiles: any[] = [];

      if (Array.isArray(response.data)) {
        profiles = response.data;
      } else if (response.data?.profiles && Array.isArray(response.data.profiles)) {
        profiles = response.data.profiles;
      }

      // Extract usernames from profiles
      const usernames = profiles
        .map(profile => profile.name || profile.username || profile.displayName || profile.pseudonym)
        .filter(Boolean)
        .slice(0, 10); // Limit to 10 suggestions

      console.log(`Found ${usernames.length} usernames for query: ${q}`);

      res.status(200).json(usernames);
    } catch (axiosError: any) {
      // Handle axios errors (network failures, timeouts, etc.)
      if (axiosError.response?.status >= 500) {
        console.error(`Polymarket API error (${axiosError.response.status}) for query: ${q}`, axiosError.message);
      } else if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        console.error(`Request timeout for query: ${q}`);
      } else {
        console.error(`Network error for query: ${q}:`, axiosError.message);
      }
      // Return empty array instead of error to gracefully degrade
      res.status(200).json([]);
    }
  } catch (error) {
    console.error('Search API error:', error);
    // Return empty array instead of 500 error
    res.status(200).json([]);
  }
}
