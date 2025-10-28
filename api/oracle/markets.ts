import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://orxyqgecymsuwuxtjdck.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeHlxZ2VjeW1zdXd1eHRqZGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MzAxNzQsImV4cCI6MjA3NzIwNjE3NH0.pk46vevHaUjX0Ewq8dAfNidNgQjjov3fX7CJU997b8U'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    // Only show markets updated in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: oracles, error } = await supabase
      .from('oracles')
      .select('*')
      .gte('timestamp', sevenDaysAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const markets = (oracles || []).map(m => ({
      marketId: m.market_id,
      title: m.title,
      status: m.status || 'MONITORING',
      consensus: m.consensus || 0,
      outcome: m.outcome || 'N/A',
      proposer: m.proposer || 'N/A',
      lastUpdate: new Date(m.timestamp).getTime(),
      alerts: m.disputes?.toString() || '0',
      liquidity: m.liquidity || 0,
      ev: m.ev || 0,
      llmAnalysis: m.llm_analysis || null
    }));

    res.status(200).json(markets);
  } catch (error) {
    console.error('Oracle markets error:', error);
    res.status(200).json([]);
  }
}
