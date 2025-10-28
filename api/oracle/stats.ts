import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Return mock stats since oracle bot runs on VPS with local SQLite DB
  const stats = {
    totalMarkets: 0,
    activeMarkets: 0,
    proposedMarkets: 0,
    resolvedMarkets: 0,
    avgResponseTime: "0s",
    lastCheckTime: new Date().toISOString(),
    checkInterval: "10s",
    status: "running_on_vps",
    message: "Oracle bot is running on VPS server 207.246.126.234"
  };

  res.status(200).json(stats);
}
