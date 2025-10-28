import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return mock backtest results
  const results = {
    totalOpportunities: 0,
    profitableEdges: 0,
    avgProfit: 0,
    totalProfit: 0,
    message: "Backtest data available on VPS server only"
  };

  res.status(200).json(results);
}
