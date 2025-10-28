import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Return empty alerts since scanner runs on VPS with local SQLite DB
  const alerts: any[] = [];

  res.status(200).json(alerts);
}
