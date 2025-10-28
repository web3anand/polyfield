import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://orxyqgecymsuwuxtjdck.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeHlxZ2VjeW1zdXd1eHRqZGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MzAxNzQsImV4cCI6MjA3NzIwNjE3NH0.pk46vevHaUjX0Ewq8dAfNidNgQjjov3fX7CJU997b8U'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const { data: edges, error } = await supabase
      .from('edges')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const alerts = (edges || []).map(edge => ({
      id: edge.id?.toString() || edge.market_id,
      title: edge.title || edge.market_title,
      outcome: edge.outcome,
      ev: edge.ev,
      marketPrice: edge.market_price,
      trueProb: edge.true_prob,
      liquidity: edge.liquidity,
      timestamp: new Date(edge.timestamp).getTime(),
      status: edge.status || 'active'
    }));

    res.status(200).json(alerts);
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(200).json([]);
  }
}
