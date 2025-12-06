-- Leaderboard tables for caching Polymarket leaderboard data
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/orxyqgecymsuwuxtjdck/sql

-- Users leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard_users (
  id SERIAL PRIMARY KEY,
  rank INTEGER NOT NULL,
  username TEXT NOT NULL,
  x_username TEXT,
  volume NUMERIC(20, 2) DEFAULT 0,
  wallet_address TEXT,
  profile_image TEXT,
  pnl NUMERIC(20, 2),
  time_period TEXT DEFAULT 'all',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(username, time_period)
);

-- Builders leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard_builders (
  id SERIAL PRIMARY KEY,
  rank INTEGER NOT NULL,
  builder_name TEXT NOT NULL,
  volume NUMERIC(20, 2) DEFAULT 0,
  markets_created INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  builder_logo TEXT,
  time_period TEXT DEFAULT 'all',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(builder_name, time_period)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_users_rank ON leaderboard_users(rank ASC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_users_username ON leaderboard_users(username);
CREATE INDEX IF NOT EXISTS idx_leaderboard_users_time_period ON leaderboard_users(time_period);
CREATE INDEX IF NOT EXISTS idx_leaderboard_users_volume ON leaderboard_users(volume DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_users_updated_at ON leaderboard_users(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_builders_rank ON leaderboard_builders(rank ASC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_builders_name ON leaderboard_builders(builder_name);
CREATE INDEX IF NOT EXISTS idx_leaderboard_builders_time_period ON leaderboard_builders(time_period);
CREATE INDEX IF NOT EXISTS idx_leaderboard_builders_volume ON leaderboard_builders(volume DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_builders_updated_at ON leaderboard_builders(updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE leaderboard_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_builders ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access (for Vercel frontend)
CREATE POLICY "Allow public read access on leaderboard_users" ON leaderboard_users
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on leaderboard_builders" ON leaderboard_builders
  FOR SELECT USING (true);

-- Create policies to allow service role write access (for sync script)
CREATE POLICY "Allow service role insert on leaderboard_users" ON leaderboard_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role insert on leaderboard_builders" ON leaderboard_builders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role update on leaderboard_users" ON leaderboard_users
  FOR UPDATE USING (true);

CREATE POLICY "Allow service role update on leaderboard_builders" ON leaderboard_builders
  FOR UPDATE USING (true);

CREATE POLICY "Allow service role delete on leaderboard_users" ON leaderboard_users
  FOR DELETE USING (true);

CREATE POLICY "Allow service role delete on leaderboard_builders" ON leaderboard_builders
  FOR DELETE USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_leaderboard_users_updated_at BEFORE UPDATE ON leaderboard_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_builders_updated_at BEFORE UPDATE ON leaderboard_builders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


