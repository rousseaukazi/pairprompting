-- Add user preferences table
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,
  emoji_avatar TEXT NOT NULL DEFAULT '😀',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster lookups
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Insert default preferences for existing users
INSERT INTO user_preferences (user_id, emoji_avatar)
SELECT DISTINCT user_id, '😀'
FROM memberships
ON CONFLICT (user_id) DO NOTHING; 