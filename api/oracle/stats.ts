import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://orxyqgecymsuwuxtjdck.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeHlxZ2VjeW1zdXd1eHRqZGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MzAxNzQsImV4cCI6MjA3NzIwNjE3NH0.pk46vevHaUjX0Ewq8dAfNidNgQjjov3fX7CJU997b8U'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: oracles, error } = await supabase
      .from('oracles')
      .select('*');

    if (error) throw error;

    const total = oracles?.length || 0;
    const disputed = oracles?.filter(o => o.status === 'DISPUTED').length || 0;
    const consensus = oracles?.filter(o => o.status === 'CONSENSUS').length || 0;
    const alerts24h = oracles?.filter(o => new Date(o.timestamp) >= twentyFourHoursAgo).length || 0;

    res.status(200).json({
      marketsTracked: total,
      totalAlerts: alerts24h,
      consensusDetected: consensus,
      disputed: disputed,
      autoBets: 0,
      winRate: 0,
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
