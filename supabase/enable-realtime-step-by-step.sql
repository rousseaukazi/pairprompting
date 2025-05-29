-- Step-by-step guide to enable real-time for comments
-- Run each section separately to troubleshoot

-- STEP 1: Check what's currently enabled
SELECT 'Currently enabled tables:' as status;
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- STEP 2: Enable comments table (run this even if it shows as already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- STEP 3: Enable blocks table (run this even if it shows as already enabled) 
ALTER PUBLICATION supabase_realtime ADD TABLE blocks;

-- STEP 4: Enable user_preferences table
ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;

-- STEP 5: Verify all tables are now enabled
SELECT 'Final check - these should all show up:' as status;
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('comments', 'blocks', 'user_preferences')
ORDER BY tablename;

-- STEP 6: If you see "already exists" errors, that's normal and good!
-- It means the tables were already enabled for real-time. 