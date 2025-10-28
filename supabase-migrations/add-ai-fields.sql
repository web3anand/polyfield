-- Add AI analysis fields to oracles table
-- Run this in Supabase SQL editor: https://supabase.com/dashboard/project/orxyqgecymsuwuxtjdck/sql

ALTER TABLE oracles ADD COLUMN IF NOT EXISTS ai_recommendation TEXT;
ALTER TABLE oracles ADD COLUMN IF NOT EXISTS ai_confidence INTEGER;
ALTER TABLE oracles ADD COLUMN IF NOT EXISTS ai_true_prob INTEGER;
ALTER TABLE oracles ADD COLUMN IF NOT EXISTS ai_edge INTEGER;
ALTER TABLE oracles ADD COLUMN IF NOT EXISTS ai_risk TEXT;

-- Add index for faster filtering by AI confidence
CREATE INDEX IF NOT EXISTS idx_oracles_ai_confidence ON oracles(ai_confidence DESC) WHERE ai_confidence IS NOT NULL;

-- Comment the new columns
COMMENT ON COLUMN oracles.ai_recommendation IS 'AI bet recommendation: YES or NO';
COMMENT ON COLUMN oracles.ai_confidence IS 'AI confidence score: 1-10';
COMMENT ON COLUMN oracles.ai_true_prob IS 'AI estimated true probability: 0-100';
COMMENT ON COLUMN oracles.ai_edge IS 'AI calculated market edge in percentage points';
COMMENT ON COLUMN oracles.ai_risk IS 'AI risk assessment: LOW, MEDIUM, or HIGH';
