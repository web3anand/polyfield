import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Return mock metrics since scanner runs on VPS with local SQLite DB
  const metrics = {
    totalScans: 0,
    edgesFound: 0,
    avgEdgeSize: 0,
    successRate: 0,
    lastScanTime: new Date().toISOString(),
    scanInterval: "60s",
    status: "running_on_vps",
    message: "Scanner is running on VPS server 207.246.126.234"
  };

  res.status(200).json(metrics);
}
