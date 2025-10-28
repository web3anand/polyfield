import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Return empty markets since oracle bot runs on VPS with local SQLite DB
  const markets: any[] = [];

  res.status(200).json(markets);
}
