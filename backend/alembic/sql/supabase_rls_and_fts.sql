-- Supabase PostgreSQL Row-Level Security (RLS) Policies & Full-Text Search (FTS) Indexes
-- Run this in the Supabase SQL Editor after running `alembic upgrade head`.

-- 1. Enable Row-Level Security on every table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_feedback ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies: Users can access only their own rows
CREATE POLICY "Users can view and update own profile"
  ON profiles FOR ALL
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Users can manage own scans"
  ON scans FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view summaries of own scans"
  ON summaries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM scans
      WHERE scans.id = summaries.scan_id
        AND scans.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can view own usage counters"
  ON usage_counters FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own scan feedback"
  ON scan_feedback FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- 3. Full-Text Search (GIN) indexes on scan text and summary text
CREATE INDEX IF NOT EXISTS idx_scans_text_fts
  ON scans USING GIN (to_tsvector('english', COALESCE(text, '')));

CREATE INDEX IF NOT EXISTS idx_summaries_text_fts
  ON summaries USING GIN (to_tsvector('english', COALESCE(text, '')));
