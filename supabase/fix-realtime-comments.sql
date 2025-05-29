-- Fix real-time for comments
-- Run this in your Supabase SQL editor to ensure comments work in real-time

-- 1. Check if realtime is enabled for comments table
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'comments';

-- 2. If comments is not in the results above, enable it:
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- 3. Also ensure blocks and user_preferences are enabled
ALTER PUBLICATION supabase_realtime ADD TABLE blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;

-- 4. Refresh the publication to make sure changes take effect
ALTER PUBLICATION supabase_realtime REFRESH PUBLICATION;

-- 5. Check that all our tables are now enabled
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' 
AND tablename IN ('comments', 'blocks', 'user_preferences');

-- This should return all three tables if setup is correct 