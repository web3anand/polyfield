import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Return mock metrics matching ScannerMetrics interface
  // Actual data is on VPS server 207.246.126.234
  const metrics = {
    alertsThisMonth: 0,
    avgEV: 0,
    hitRate: 0,
    conversion: 0,
    avgLatency: "0s",
    activeScans: 0,
    status: "running_on_vps",
    message: "Scanner is running on VPS server 207.246.126.234"
  };

  res.status(200).json(metrics);
}
