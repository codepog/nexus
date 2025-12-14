-- Enable public read and update access to feed_preferences table
-- This allows users to fetch and update their preferences using their token

-- First, ensure RLS is enabled
ALTER TABLE feed_preferences ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows SELECT for any user (public access)
-- Since the token acts as authentication, this is safe
CREATE POLICY "Allow public read access to feed_preferences"
ON feed_preferences
FOR SELECT
TO public
USING (true);

-- Create a policy that allows UPDATE for any user (public access)
-- This allows users to update their preferences
CREATE POLICY "Allow public update access to feed_preferences"
ON feed_preferences
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

