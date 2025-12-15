import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://bzlxrggciehkcslchooe.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTM3NzcsImV4cCI6MjA4MDU4OTc3N30.vIcU83OafM_MGPRy-RjheuSQqkQNRw-RcaI2aDXH4gM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Get all oracles from database
    const { data: oracles, error } = await supabase
      .from('oracles')
      .select('*');

    if (error) {
      console.error('Supabase error:', error);
      // Don't throw, return default stats instead
      return res.status(200).json({
        marketsTracked: 0,
        totalAlerts: 0,
        consensusDetected: 0,
        disputed: 0,
        autoBets: 0,
        winRate: 0,
        edgeTime: '0s'
      });
    }

    const total = oracles?.length || 0;
    const disputed = oracles?.filter(o => o.status === 'DISPUTED').length || 0;
    const consensus = oracles?.filter(o => o.status === 'CONSENSUS').length || 0;
    
    // Calculate win rate from resolved markets
    const resolved = oracles?.filter(o => o.status === 'RESOLVED') || [];
    let winRate = 0;
    if (resolved.length > 0) {
      const wins = resolved.filter(m => {
        const predictedOutcome = parseFloat(m.consensus) > 50 ? 'YES' : 'NO';
        return m.outcome === predictedOutcome;
      }).length;
      winRate = Math.round((wins / resolved.length) * 100);
    }

    res.status(200).json({
      marketsTracked: total,
      totalAlerts: 0, // Deprecated
      consensusDetected: consensus,
      disputed: disputed,
      autoBets: 0,
      winRate: winRate,
      edgeTime: '10s'
    });
  } catch (error) {
    console.error('Oracle stats error:', error);
    res.status(200).json({
      marketsTracked: 0,
      totalAlerts: 0,
      consensusDetected: 0,
      disputed: 0,
      autoBets: 0,
      winRate: 0,
      edgeTime: '0s'
    });
  }
}
