# Troubleshooting Guide - Database Connection Issues

## Common Issues and Solutions

### 1. Missing Environment Variables

**Problem**: The app can't connect to Supabase because environment variables are missing.

**Solution**: Create a `.env` file in the root directory with:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**How to get these values**:
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "Project URL" (this is your `VITE_SUPABASE_URL`)
4. Copy the "anon public" key (this is your `VITE_SUPABASE_ANON_KEY`)

**Important**: After creating/updating the `.env` file, restart your dev server!

### 2. Row Level Security (RLS) Policies

**Problem**: The `feed_preferences` table exists but inserts are blocked by RLS.

**Solution**: Create an RLS policy to allow inserts:

```sql
-- Allow anyone to insert into feed_preferences
CREATE POLICY "Allow public insert" 
ON feed_preferences 
FOR INSERT 
TO public 
WITH CHECK (true);
```

**How to apply**:
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL command above
3. Try the sync again

### 3. Missing Table

**Problem**: The `feed_preferences` table doesn't exist.

**Solution**: Create the table with this SQL:

```sql
CREATE TABLE feed_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_token TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index for faster lookups
CREATE INDEX idx_feed_preferences_user_token ON feed_preferences(user_token);
CREATE INDEX idx_feed_preferences_topic_id ON feed_preferences(topic_id);
```

### 4. Check Browser Console

Open your browser's developer console (F12) and look for:
- Error messages about missing environment variables
- Database connection errors
- RLS policy violations
- Network errors

The improved error handling will now show more specific error messages in both the console and toast notifications.

## Testing the Connection

1. Open the browser console (F12)
2. Click the "Continue" button
3. Check the console logs - you should see:
   - "handleSync called"
   - "Calling savePreferencesAndGetToken..."
   - "Getting Supabase client..."
   - Either success messages or detailed error information

## Next Steps

If you're still having issues:
1. Check the browser console for specific error messages
2. Verify your environment variables are set correctly
3. Check that the `feed_preferences` table exists in Supabase
4. Verify RLS policies allow INSERT operations
5. Check the Supabase logs in the dashboard for any server-side errors



