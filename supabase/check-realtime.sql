-- Check if realtime is enabled for tables
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- If the above query returns empty or doesn't show your tables, run:
-- ALTER PUBLICATION supabase_realtime ADD TABLE blocks;
-- ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- Also check that Realtime is enabled in your Supabase project:
-- 1. Go to Settings -> API in your Supabase dashboard
-- 2. Make sure "Realtime" is enabled

-- Check if there are any RLS policies blocking real-time
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('blocks', 'comments');

-- If RLS is enabled but no policies exist, disable RLS:
-- ALTER TABLE blocks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE comments DISABLE ROW LEVEL SECURITY; 