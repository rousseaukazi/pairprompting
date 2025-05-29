-- Enable Realtime for all tables
-- This is required for real-time subscriptions to work

-- Enable realtime for the blocks table
ALTER PUBLICATION supabase_realtime ADD TABLE blocks;

-- Enable realtime for comments table
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- Enable realtime for memberships table (for presence)
ALTER PUBLICATION supabase_realtime ADD TABLE memberships;

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- You can verify realtime is enabled by running:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'; 