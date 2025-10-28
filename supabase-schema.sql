-- Create edges table for scanner bot
CREATE TABLE IF NOT EXISTS edges (
  id SERIAL PRIMARY KEY,
  market_id TEXT,
  market_title TEXT,
  title TEXT,
  outcome TEXT,
  ev REAL,
  market_price REAL,
  true_prob REAL,
  liquidity REAL,
  status TEXT DEFAULT 'active',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create oracles table for oracle bot
CREATE TABLE IF NOT EXISTS oracles (
  id SERIAL PRIMARY KEY,
  market_id TEXT,
  title TEXT,
  status TEXT,
  consensus REAL,
  outcome TEXT,
  proposer TEXT,
  disputes INTEGER DEFAULT 0,
  liquidity REAL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_edges_timestamp ON edges(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_edges_status ON edges(status);
CREATE INDEX IF NOT EXISTS idx_oracles_timestamp ON oracles(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_oracles_status ON oracles(status);

-- Enable Row Level Security (RLS)
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracles ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access (for Vercel frontend)
CREATE POLICY "Allow public read access on edges" ON edges
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on oracles" ON oracles
  FOR SELECT USING (true);

-- Create policies to allow service role write access (for VPS bots)
CREATE POLICY "Allow service role insert on edges" ON edges
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role insert on oracles" ON oracles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role update on edges" ON edges
  FOR UPDATE USING (true);

CREATE POLICY "Allow service role update on oracles" ON oracles
  FOR UPDATE USING (true);
