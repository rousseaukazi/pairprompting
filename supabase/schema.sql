-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Enable Row Level Security
ALTER TABLE explorations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Policies (these would need to be adjusted based on your auth setup)
-- For now, we'll create permissive policies that rely on your application logic

-- Explorations policies
CREATE POLICY "Users can view explorations they are members of" ON explorations
  FOR SELECT USING (
    id IN (
      SELECT exploration_id FROM memberships WHERE user_id = auth.uid()::text
    )
  );

-- Memberships policies
CREATE POLICY "Users can view memberships for their explorations" ON memberships
  FOR SELECT USING (
    exploration_id IN (
      SELECT exploration_id FROM memberships WHERE user_id = auth.uid()::text
    )
  );

-- Blocks policies
CREATE POLICY "Users can view blocks in their explorations" ON blocks
  FOR SELECT USING (
    exploration_id IN (
      SELECT exploration_id FROM memberships WHERE user_id = auth.uid()::text
    )
  );

-- Comments policies
CREATE POLICY "Users can view comments in their explorations" ON comments
  FOR SELECT USING (
    block_id IN (
      SELECT id FROM blocks WHERE exploration_id IN (
        SELECT exploration_id FROM memberships WHERE user_id = auth.uid()::text
      )
    )
  );

-- Chats policies
CREATE POLICY "Users can view their own chats" ON chats
  FOR SELECT USING (user_id = auth.uid()::text);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid()::text); 