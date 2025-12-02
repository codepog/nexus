# User Feed Edge Function

This Supabase Edge Function generates an ICS calendar feed based on user preferences.

## Setup Instructions

1. **Deploy the function to Supabase:**
   ```bash
   # Install Supabase CLI if you haven't
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link to your project
   supabase link --project-ref sjidynrgfnvvgtjbkgii
   
   # Deploy the function
   supabase functions deploy user-feed
   ```

2. **Database Tables:**
   - `feed_preferences` (already exists)
     - `user_token` (text)
     - `topic_id` (text)
   - `events` (your events table)
     - `id` (uuid)
     - `title` (text)
     - `description` (text, optional)
     - `start_time` (timestamptz)
     - `end_time` (timestamptz, optional)
     - `topic_id` (text) - must match the topic_id in feed_preferences (e.g., "bball", "fball", "acad", "arts")

4. **Environment Variables:**
   - The function uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` which are automatically available in Supabase Edge Functions

## How It Works

1. User visits the ICS URL with their token: `https://[PROJECT].supabase.co/functions/v1/user-feed?token=xxx`
2. Function looks up preferences in `feed_preferences` table using the token
3. Fetches all events from `events` table where `topic_id` matches user's preferences
4. Generates ICS format calendar file
5. Returns the calendar file for the user to subscribe to

## Testing

After deployment, test the function:
```bash
curl "https://sjidynrgfnvvgtjbkgii.supabase.co/functions/v1/user-feed?token=YOUR_TOKEN_HERE"
```

Or open the URL directly in a browser - it should download a `.ics` file.

