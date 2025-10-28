import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://orxyqgecymsuwuxtjdck.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeHlxZ2VjeW1zdXd1eHRqZGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MzAxNzQsImV4cCI6MjA3NzIwNjE3NH0.pk46vevHaUjX0Ewq8dAfNidNgQjjov3fX7CJU997b8U'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Get all oracles from database
    const { data: oracles, error } = await supabase
      .from('oracles')
      .select('*');

    if (error) {
      console.error('Supabase error:', error);
      throw error;
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
