import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Return mock stats matching BotStats interface
  // Actual data is on VPS server 207.246.126.234
  const stats = {
    marketsTracked: 0,
    totalAlerts: 0,
    consensusDetected: 0,
    disputed: 0,
    autoBets: 0,
    winRate: 0,
    edgeTime: "0s",
    status: "running_on_vps",
    message: "Oracle bot is running on VPS server 207.246.126.234"
  };

  res.status(200).json(stats);
}
