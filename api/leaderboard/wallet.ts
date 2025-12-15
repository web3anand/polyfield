import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";

// Helper to search for a user by username and get wallet address (same as dashboard)
async function findUserByUsername(username: string): Promise<{ wallet: string }> {
  try {
    console.log(`Searching for user: ${username}`);

    const response = await axios.get(`${POLYMARKET_GAMMA_API}/public-search`, {
      params: {
        q: username,
        search_profiles: true,
      },
      timeout: 5000,
    });

    // According to official Polymarket API docs, response structure is:
    // { events: [...], tags: [...], profiles: [...], pagination: {...} }
    let profiles: any[] = [];

    if (response.data?.profiles && Array.isArray(response.data.profiles)) {
      // Official API structure: profiles array at root level
      profiles = response.data.profiles;
    } else if (Array.isArray(response.data)) {
      // Fallback: if response is directly an array
      profiles = response.data;
    }

    if (profiles.length > 0) {
      // According to official Polymarket API docs:
      // - name (string) - the primary username field
      // - pseudonym (string) - alternative name
      // - username, display_name, displayName, handle - fallback fields
      // Look for exact username match first, checking 'name' field first (official API primary field)
      let profile = profiles.find(p => {
        const profileName = p.name || p.pseudonym || p.username || p.display_name || p.displayName || p.handle;
        return profileName?.toLowerCase() === username.toLowerCase();
      });
      
      // If no exact match, use the first result
      if (!profile) {
        profile = profiles[0];
      }

      // Extract wallet address - proxyWallet is the official field name
      const wallet = profile.proxyWallet || profile.wallet || profile.address || profile.walletAddress;
      if (wallet) {
        return { wallet };
      }
    }

    throw new Error('No wallet address found for username');
  } catch (error) {
    console.error(`Error searching for user ${username}:`, error);
    throw new Error(`User not found: ${username}`);
  }
}

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
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    console.log(`📊 [VERCEL API] Fetching wallet for username: ${username}`);

    try {
      const userInfo = await findUserByUsername(username);
      const walletAddress = userInfo.wallet;
      
      console.log(`✓ Found wallet for ${username}: ${walletAddress}`);

      res.status(200).json({
        username,
        walletAddress,
      });
    } catch (error: any) {
      console.error(`❌ Error processing ${username}:`, error.message);
      
      // Return error but don't break the leaderboard
      res.status(200).json({
        username,
        walletAddress: null,
        error: error.message,
      });
    }
  } catch (error: any) {
    console.error('Error in wallet endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch wallet data',
      message: error.message 
    });
  }
}

