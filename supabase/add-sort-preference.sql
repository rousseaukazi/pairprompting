-- Add sort order preference to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN block_sort_order TEXT NOT NULL DEFAULT 'reverse_chrono' 
CHECK (block_sort_order IN ('chrono', 'reverse_chrono')); 