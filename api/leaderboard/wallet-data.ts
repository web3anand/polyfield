import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchUserPnLData } from '../utils/polymarket-pnl.js';
import axios from 'axios';

const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";

// Helper to search for a user by username and get wallet address
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

    let profiles: any[] = [];

    if (response.data?.profiles && Array.isArray(response.data.profiles)) {
      profiles = response.data.profiles;
    } else if (Array.isArray(response.data)) {
      profiles = response.data;
    }

    if (profiles.length > 0) {
      let profile = profiles.find(p => {
        const profileName = p.name || p.pseudonym || p.username || p.display_name || p.displayName || p.handle;
        return profileName?.toLowerCase() === username.toLowerCase();
      });
      
      if (!profile) {
        profile = profiles[0];
      }

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

  // Route based on query parameter or URL path
  const endpoint = req.query.endpoint as string || '';
  const urlPath = req.url?.split('?')[0] || '';
  const isPnL = endpoint === 'pnl' || urlPath.includes('/pnl');
  const isWallet = endpoint === 'wallet' || urlPath.includes('/wallet') || (!isPnL && !endpoint);

  try {
    if (isPnL) {
      // PnL endpoint
      const { wallet } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        res.status(400).json({ error: 'Wallet address is required' });
        return;
      }

      console.log(`📊 [VERCEL API] Fetching PnL for wallet: ${wallet}`);

      try {
        const pnlData = await fetchUserPnLData(wallet, false);
        
        res.status(200).json({
          wallet,
          totalPnL: pnlData.totalPnl,
          realizedPnL: pnlData.realizedPnL,
          unrealizedPnL: pnlData.unrealizedPnL,
        });
      } catch (error: any) {
        console.error(`❌ Error fetching PnL for ${wallet}:`, error);
        res.status(200).json({
          wallet,
          totalPnL: 0,
          realizedPnL: 0,
          unrealizedPnL: 0,
        });
      }
    } else if (isWallet) {
      // Wallet endpoint
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
        
        res.status(200).json({
          username,
          walletAddress: null,
          error: error.message,
        });
      }
    } else {
      res.status(400).json({ error: 'Invalid endpoint. Use ?endpoint=pnl or ?endpoint=wallet' });
    }
  } catch (error: any) {
    console.error('Error in wallet-data endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      message: error.message 
    });
  }
}

