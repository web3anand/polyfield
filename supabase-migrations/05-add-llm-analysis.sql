-- Add LLM analysis column to oracles table
ALTER TABLE oracles ADD COLUMN IF NOT EXISTS llm_analysis JSONB;

-- Add index for faster queries on markets with LLM analysis
CREATE INDEX IF NOT EXISTS idx_oracles_llm_analysis ON oracles USING GIN (llm_analysis);

-- Example structure for llm_analysis:
-- {
--   "yesProb": 0.72,
--   "noProb": 0.28,
--   "ev": 15.3,
--   "edge": 12.0,
--   "betSide": "YES",
--   "confidence": 0.85,
--   "rationale": "Historical Trump dominance in similar scenarios...",
--   "sources": ["NewsAPI headline 1", "NewsAPI headline 2"],
--   "analyzedAt": "2025-10-30T12:00:00Z"
-- }
