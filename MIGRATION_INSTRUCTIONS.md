# Database Migration Instructions

To apply the new sort order preference feature, you need to update your Supabase database:

## Step 1: Apply the migration

Run the following SQL in your Supabase SQL editor:

```sql
-- Add sort order preference to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN block_sort_order TEXT NOT NULL DEFAULT 'reverse_chrono' 
CHECK (block_sort_order IN ('chrono', 'reverse_chrono'));
```

## Step 2: Verify the migration

After running the migration, verify that the column was added:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_preferences' 
AND column_name = 'block_sort_order';
```

## Features Added

1. **Block Feed Sort Order**: Users can now choose between:
   - **Latest First (reverse_chrono)**: Newest blocks appear at the top (default)
   - **Oldest First (chrono)**: Oldest blocks appear at the top

2. **Auto-focus Chat Input**: When you reload the page, the chat input will automatically be focused so you can start typing immediately.

## How to Use

1. Click the "Profile" button in the document view
2. In the profile modal, you'll see a new "Block Feed Order" section
3. Choose between "Latest First" or "Oldest First"
4. Click "Save Changes"

The block feed will immediately update to reflect your preference. 