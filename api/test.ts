import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log('Test API called with method:', req.method);
  console.log('Query params:', req.query);
  console.log('Headers:', req.headers);

  res.status(200).json({ 
    status: 'success',
    message: 'Test API is working',
    method: req.method,
    query: req.query,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent']
  });
}
