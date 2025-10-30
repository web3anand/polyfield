-- COMPLETE DATABASE RESET WITH PROPER RLS CONFIGURATION
-- Run this in Supabase SQL editor: https://supabase.com/dashboard/project/orxyqgecymsuwuxtjdck/sql
-- WARNING: This will DELETE ALL DATA in edges and oracles tables

-- ============================================
-- DROP EXISTING TABLES (COMPLETE RESET)
-- ============================================

DROP TABLE IF EXISTS edges CASCADE;
DROP TABLE IF EXISTS oracles CASCADE;

-- ============================================
-- CREATE EDGES TABLE
-- ============================================

CREATE TABLE edges (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edge_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  status TEXT,
  volume NUMERIC,
  liquidity NUMERIC,
  probability NUMERIC,
  edge_score NUMERIC,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREATE ORACLES TABLE
-- ============================================

CREATE TABLE oracles (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  market_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  status TEXT,
  consensus NUMERIC,
  outcome TEXT,
  proposer TEXT,
  disputes INTEGER DEFAULT 0,
  liquidity NUMERIC,
  slug TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- AI fields (currently unused, ready for future)
  ai_recommendation TEXT,
  ai_confidence INTEGER,
  ai_true_prob INTEGER,
  ai_edge INTEGER,
  ai_risk TEXT
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Edges indexes
CREATE INDEX idx_edges_edge_id ON edges(edge_id);
CREATE INDEX idx_edges_timestamp ON edges(timestamp DESC);
CREATE INDEX idx_edges_status ON edges(status);
CREATE INDEX idx_edges_edge_score ON edges(edge_score DESC) WHERE edge_score IS NOT NULL;

-- Oracles indexes
CREATE INDEX idx_oracles_market_id ON oracles(market_id);
CREATE INDEX idx_oracles_timestamp ON oracles(timestamp DESC);
CREATE INDEX idx_oracles_status ON oracles(status);
CREATE INDEX idx_oracles_consensus ON oracles(consensus DESC) WHERE consensus IS NOT NULL;
CREATE INDEX idx_oracles_liquidity ON oracles(liquidity DESC) WHERE liquidity IS NOT NULL;
CREATE INDEX idx_oracles_slug ON oracles(slug);
CREATE INDEX idx_oracles_ai_confidence ON oracles(ai_confidence DESC) WHERE ai_confidence IS NOT NULL;

-- ============================================
-- ENABLE ROW LEVEL SECURITY (PROPER CONFIGURATION)
-- ============================================

ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Public read-only access for frontend
CREATE POLICY "edges_public_read" ON edges
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "oracles_public_read" ON oracles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Bot write access (INSERT/UPDATE/DELETE for anon role - backend bots use anon key)
CREATE POLICY "edges_bot_write" ON edges
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "edges_bot_update" ON edges
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "edges_bot_delete" ON edges
  FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "oracles_bot_write" ON oracles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "oracles_bot_update" ON oracles
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "oracles_bot_delete" ON oracles
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================
-- ADD COLUMN COMMENTS (DOCUMENTATION)
-- ============================================

-- Edges table comments
COMMENT ON TABLE edges IS 'Trading edge opportunities identified by scanner bot';
COMMENT ON COLUMN edges.edge_id IS 'Unique identifier for the edge opportunity';
COMMENT ON COLUMN edges.title IS 'Market title or description';
COMMENT ON COLUMN edges.edge_score IS 'Calculated edge/advantage score';

-- Oracles table comments
COMMENT ON TABLE oracles IS 'UMA oracle market data and consensus tracking';
COMMENT ON COLUMN oracles.market_id IS 'Polymarket market ID';
COMMENT ON COLUMN oracles.title IS 'Market question/title';
COMMENT ON COLUMN oracles.status IS 'Market status: CONSENSUS, DISPUTED, UNCERTAIN, etc.';
COMMENT ON COLUMN oracles.consensus IS 'Consensus percentage (0-100)';
COMMENT ON COLUMN oracles.outcome IS 'Predicted outcome: YES or NO';
COMMENT ON COLUMN oracles.proposer IS 'Address of oracle proposer';
COMMENT ON COLUMN oracles.disputes IS 'Number of disputes on this oracle';
COMMENT ON COLUMN oracles.liquidity IS 'Market liquidity in USD';
COMMENT ON COLUMN oracles.slug IS 'Market slug for Polymarket URL: polymarket.com/event/{slug}';
COMMENT ON COLUMN oracles.ai_recommendation IS 'AI bet recommendation: YES or NO (currently unused)';
COMMENT ON COLUMN oracles.ai_confidence IS 'AI confidence score: 1-10 (currently unused)';
COMMENT ON COLUMN oracles.ai_true_prob IS 'AI estimated true probability: 0-100 (currently unused)';
COMMENT ON COLUMN oracles.ai_edge IS 'AI calculated market edge in percentage points (currently unused)';
COMMENT ON COLUMN oracles.ai_risk IS 'AI risk assessment: LOW, MEDIUM, or HIGH (currently unused)';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE edges_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE oracles_id_seq TO anon, authenticated;

-- Grant table permissions
GRANT ALL ON edges TO anon, authenticated;
GRANT ALL ON oracles TO anon, authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database reset complete!';
  RAISE NOTICE '✅ Tables created: edges, oracles';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '✅ RLS ENABLED with proper policies';
  RAISE NOTICE '✅ Public read access + bot write access configured';
  RAISE NOTICE '✅ Ready for oracle bot to start saving markets';
END $$;
