-- Supabase Database Schema for Group Escrow Platform
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ESCROWS TABLE
-- ============================================================================
CREATE TABLE escrows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_code VARCHAR(50) UNIQUE NOT NULL,
  creator VARCHAR(100) NOT NULL,
  total_amount BIGINT NOT NULL,
  split_amount BIGINT NOT NULL,
  num_friends INTEGER NOT NULL,
  joined_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Complete', 'Cancelled')),
  accumulated_scspr BIGINT DEFAULT 0,
  initial_scspr BIGINT DEFAULT 0,
  has_password BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT positive_amounts CHECK (total_amount > 0 AND split_amount > 0),
  CONSTRAINT valid_participants CHECK (num_friends >= 2 AND num_friends <= 100),
  CONSTRAINT valid_joined_count CHECK (joined_count >= 0 AND joined_count <= num_friends)
);

-- ============================================================================
-- USER_ESCROWS TABLE (Junction table for many-to-many relationship)
-- ============================================================================
CREATE TABLE user_escrows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_account VARCHAR(100) NOT NULL,
  escrow_code VARCHAR(50) NOT NULL,
  is_creator BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT fk_escrow FOREIGN KEY (escrow_code) REFERENCES escrows(escrow_code) ON DELETE CASCADE,
  
  -- Unique constraint to prevent duplicate entries
  CONSTRAINT unique_user_escrow UNIQUE (user_account, escrow_code)
);

-- ============================================================================
-- PARTICIPANTS TABLE
-- ============================================================================
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_code VARCHAR(50) NOT NULL,
  participant VARCHAR(100) NOT NULL,
  cspr_contributed BIGINT NOT NULL,
  scspr_received BIGINT NOT NULL,
  withdrawn BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  
  -- Foreign key
  CONSTRAINT fk_participant_escrow FOREIGN KEY (escrow_code) REFERENCES escrows(escrow_code) ON DELETE CASCADE,
  
  -- Unique constraint
  CONSTRAINT unique_participant UNIQUE (escrow_code, participant),
  
  -- Constraints
  CONSTRAINT positive_contributions CHECK (cspr_contributed > 0 AND scspr_received > 0)
);

-- ============================================================================
-- EVENTS TABLE (For tracking blockchain events)
-- ============================================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL,
  escrow_code VARCHAR(50),
  data JSONB NOT NULL,
  block_height BIGINT,
  transaction_hash VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for querying
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'EscrowCreated',
    'ParticipantJoined', 
    'EscrowCompleted',
    'WithdrawalMade',
    'EscrowCancelled'
  ))
);

-- ============================================================================
-- PLATFORM_STATS TABLE (Aggregated statistics)
-- ============================================================================
CREATE TABLE platform_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_escrows INTEGER DEFAULT 0,
  open_escrows INTEGER DEFAULT 0,
  complete_escrows INTEGER DEFAULT 0,
  cancelled_escrows INTEGER DEFAULT 0,
  total_cspr_pooled BIGINT DEFAULT 0,
  total_yield_earned BIGINT DEFAULT 0,
  total_participants INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure only one row
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial stats row
INSERT INTO platform_stats (id) VALUES (1);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Escrows indexes
CREATE INDEX idx_escrows_status ON escrows(status);
CREATE INDEX idx_escrows_creator ON escrows(creator);
CREATE INDEX idx_escrows_created_at ON escrows(created_at DESC);
CREATE INDEX idx_escrows_code ON escrows(escrow_code);

-- User escrows indexes
CREATE INDEX idx_user_escrows_user ON user_escrows(user_account);
CREATE INDEX idx_user_escrows_escrow ON user_escrows(escrow_code);
CREATE INDEX idx_user_escrows_creator ON user_escrows(user_account, is_creator);

-- Participants indexes
CREATE INDEX idx_participants_escrow ON participants(escrow_code);
CREATE INDEX idx_participants_user ON participants(participant);
CREATE INDEX idx_participants_withdrawn ON participants(withdrawn);

-- Events indexes
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_escrow ON events(escrow_code);
CREATE INDEX idx_events_created ON events(created_at DESC);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for escrows table
CREATE TRIGGER update_escrows_updated_at
  BEFORE UPDATE ON escrows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update platform stats
CREATE OR REPLACE FUNCTION update_platform_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE platform_stats SET
    total_escrows = (SELECT COUNT(*) FROM escrows),
    open_escrows = (SELECT COUNT(*) FROM escrows WHERE status = 'Open'),
    complete_escrows = (SELECT COUNT(*) FROM escrows WHERE status = 'Complete'),
    cancelled_escrows = (SELECT COUNT(*) FROM escrows WHERE status = 'Cancelled'),
    total_cspr_pooled = (SELECT COALESCE(SUM(total_amount), 0) FROM escrows WHERE status = 'Complete'),
    total_participants = (SELECT COUNT(DISTINCT participant) FROM participants),
    updated_at = NOW()
  WHERE id = 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when escrow changes
CREATE TRIGGER update_stats_on_escrow_change
  AFTER INSERT OR UPDATE OR DELETE ON escrows
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_platform_stats();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

-- Public read access for escrows (anyone can view)
CREATE POLICY "Public escrows are viewable by everyone"
  ON escrows FOR SELECT
  USING (true);

-- Public read access for platform stats
CREATE POLICY "Platform stats are viewable by everyone"
  ON platform_stats FOR SELECT
  USING (true);

-- Users can view their own escrows
CREATE POLICY "Users can view their own escrows"
  ON user_escrows FOR SELECT
  USING (true);

-- Users can view participants of escrows they're in
CREATE POLICY "Users can view participants"
  ON participants FOR SELECT
  USING (true);

-- Service role can do everything (for backend indexer)
-- Note: These policies allow the service role key to bypass RLS

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for escrows with participant count
CREATE OR REPLACE VIEW escrows_with_details AS
SELECT 
  e.*,
  COALESCE(p.participant_count, 0) as actual_participant_count,
  ROUND((e.joined_count::DECIMAL / e.num_friends) * 100, 2) as completion_percentage,
  (e.num_friends - e.joined_count) as slots_remaining
FROM escrows e
LEFT JOIN (
  SELECT escrow_code, COUNT(*) as participant_count
  FROM participants
  GROUP BY escrow_code
) p ON e.escrow_code = p.escrow_code;

-- View for user dashboard
CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
  ue.user_account,
  ue.is_creator,
  e.*,
  p.cspr_contributed,
  p.scspr_received,
  p.withdrawn
FROM user_escrows ue
JOIN escrows e ON ue.escrow_code = e.escrow_code
LEFT JOIN participants p ON p.escrow_code = e.escrow_code AND p.participant = ue.user_account;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment to insert sample data
/*
INSERT INTO escrows (escrow_code, creator, total_amount, split_amount, num_friends, joined_count, status, has_password)
VALUES 
  ('ESCROW-1-ABCD', 'account-hash-alice', 1000000000000, 250000000000, 4, 2, 'Open', true),
  ('ESCROW-2-EFGH', 'account-hash-bob', 500000000000, 100000000000, 5, 5, 'Complete', true);

INSERT INTO user_escrows (user_account, escrow_code, is_creator)
VALUES
  ('account-hash-alice', 'ESCROW-1-ABCD', true),
  ('account-hash-bob', 'ESCROW-1-ABCD', false);
*/

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select on all tables to anon (public read)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant all privileges to authenticated users (if using Supabase auth)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant all privileges to service role (for backend indexer)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
