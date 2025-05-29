-- First, disable RLS on all tables (if they exist)
DO $$ 
BEGIN
  -- Disable RLS on existing tables
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'explorations') THEN
    ALTER TABLE explorations DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view explorations they are members of" ON explorations;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'memberships') THEN
    ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view memberships for their explorations" ON memberships;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'blocks') THEN
    ALTER TABLE blocks DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view blocks in their explorations" ON blocks;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'comments') THEN
    ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view comments in their explorations" ON comments;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chats') THEN
    ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view their own chats" ON chats;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'notifications') THEN
    ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'invites') THEN
    ALTER TABLE invites DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Now drop all tables
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS invites CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS blocks CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS explorations CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Recreate tables WITHOUT RLS
-- Explorations table
CREATE TABLE explorations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Memberships table
CREATE TABLE memberships (
  exploration_id UUID NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  PRIMARY KEY (exploration_id, user_id)
);

-- Blocks table
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exploration_id UUID NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exploration_id UUID NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(exploration_id, user_id)
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  exploration_id UUID NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Invites table
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exploration_id UUID NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_blocks_exploration_id ON blocks(exploration_id);
CREATE INDEX idx_comments_block_id ON comments(block_id);
CREATE INDEX idx_chats_exploration_id ON chats(exploration_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_invites_token ON invites(token);

-- IMPORTANT: We are NOT enabling RLS!
-- We use Clerk for auth and the service role key for database access 