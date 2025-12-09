-- Migration script to change feed_preferences.topic_id from TEXT to TEXT[]
-- This allows storing multiple topics in a single row: {topic1, topic2, topic3}

-- Step 1: Create a new table with the array format
CREATE TABLE feed_preferences_new (
  id BIGSERIAL PRIMARY KEY,
  user_token TEXT NOT NULL UNIQUE,
  topic_id TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Migrate existing data (group by user_token and aggregate topic_ids into array)
INSERT INTO feed_preferences_new (user_token, topic_id, created_at)
SELECT 
  user_token,
  ARRAY_AGG(topic_id ORDER BY topic_id) as topic_id,
  MIN(created_at) as created_at
FROM feed_preferences
GROUP BY user_token;

-- Step 3: Drop the old table
DROP TABLE feed_preferences;

-- Step 4: Rename the new table to the original name
ALTER TABLE feed_preferences_new RENAME TO feed_preferences;

-- Step 5: Recreate indexes
CREATE INDEX idx_feed_preferences_user_token ON feed_preferences(user_token);
CREATE INDEX idx_feed_preferences_topic_id ON feed_preferences USING GIN(topic_id); -- GIN index for array searches

-- Step 6: Update RLS policies if needed (adjust policy name if different)
-- If you have an existing INSERT policy, you may need to recreate it:
-- DROP POLICY IF EXISTS "Allow public insert" ON feed_preferences;
-- CREATE POLICY "Allow public insert" 
-- ON feed_preferences 
-- FOR INSERT 
-- TO public 
-- WITH CHECK (true);

-- Verify the migration
SELECT user_token, topic_id, array_length(topic_id, 1) as topic_count 
FROM feed_preferences 
LIMIT 10;

