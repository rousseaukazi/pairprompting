-- Add background_color column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN background_color TEXT DEFAULT 'from-blue-50 to-purple-50';

-- Update existing users to have the default background color
UPDATE user_preferences 
SET background_color = 'from-blue-50 to-purple-50' 
WHERE background_color IS NULL; 