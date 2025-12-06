import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchUserPnLData } from '../utils/polymarket-pnl.js';

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
        totalPnL: pnlData.totalPnL,
        realizedPnL: pnlData.realizedPnL,
        unrealizedPnL: pnlData.unrealizedPnL,
      });
    } catch (error: any) {
      console.error(`❌ Error fetching PnL for ${wallet}:`, error);
      // Return zero PnL instead of error to prevent breaking the leaderboard
      res.status(200).json({
        wallet,
        totalPnL: 0,
        realizedPnL: 0,
        unrealizedPnL: 0,
      });
    }
  } catch (error: any) {
    console.error('Error in PnL endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch PnL data',
      message: error.message 
    });
  }
}

