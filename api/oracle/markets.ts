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

    if (error) {
      console.error('Supabase error:', error);
      // Return empty array instead of throwing
      return res.status(200).json([]);
    }

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
      slug: m.slug || m.market_id,
      ev: m.ev || 0,
      llmAnalysis: m.llm_analysis || null,
      aiRecommendation: m.ai_recommendation || null,
      aiConfidence: m.ai_confidence || null,
      aiTrueProb: m.ai_true_prob || null,
      aiEdge: m.ai_edge || null,
      aiRisk: m.ai_risk || null
    }));

    res.status(200).json(markets);
  } catch (error) {
    console.error('Oracle markets error:', error);
    res.status(200).json([]);
  }
}
