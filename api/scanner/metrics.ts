import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://orxyqgecymsuwuxtjdck.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeHlxZ2VjeW1zdXd1eHRqZGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MzAxNzQsImV4cCI6MjA3NzIwNjE3NH0.pk46vevHaUjX0Ewq8dAfNidNgQjjov3fX7CJU997b8U'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: edges, error } = await supabase
      .from('edges')
      .select('*');

    if (error) throw error;

    const total = edges?.length || 0;
    const converted = edges?.filter(e => e.status === 'converted').length || 0;
    const thisMonth = edges?.filter(e => new Date(e.timestamp) >= thirtyDaysAgo).length || 0;
    const avgEV = total > 0 ? edges.reduce((sum, e) => sum + (e.ev || 0), 0) / total : 0;

    res.status(200).json({
      alertsThisMonth: thisMonth,
      avgEV: avgEV,
      hitRate: total > 0 ? (converted / total * 100) : 0,
      conversion: total > 0 ? (converted / total * 100) : 0,
      avgLatency: '0.3s',
      activeScans: 1
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(200).json({
      alertsThisMonth: 0,
      avgEV: 0,
      hitRate: 0,
      conversion: 0,
      avgLatency: '0s',
      activeScans: 0
    });
  }
}
