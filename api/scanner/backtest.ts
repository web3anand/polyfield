import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://orxyqgecymsuwuxtjdck.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeHlxZ2VjeW1zdXd1eHRqZGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MzAxNzQsImV4cCI6MjA3NzIwNjE3NH0.pk46vevHaUjX0Ewq8dAfNidNgQjjov3fX7CJU997b8U'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: edges, error } = await supabase
      .from('edges')
      .select('*');

    if (error) throw error;

    const total = edges?.length || 0;
    const profitable = edges?.filter(e => e.status === 'converted').length || 0;
    const avgProfit = profitable > 0 
      ? edges.filter(e => e.status === 'converted').reduce((sum, e) => sum + (e.ev || 0), 0) / profitable 
      : 0;

    res.status(200).json({
      totalOpportunities: total,
      profitableEdges: profitable,
      avgProfit: avgProfit,
      totalProfit: profitable * avgProfit,
      hitRate: total > 0 ? (profitable / total * 100) : 0,
      hits: profitable,
      total: total
    });
  } catch (error) {
    console.error('Backtest error:', error);
    res.status(200).json({
      totalOpportunities: 0,
      profitableEdges: 0,
      avgProfit: 0,
      totalProfit: 0
    });
  }
}
