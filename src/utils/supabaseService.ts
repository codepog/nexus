import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export interface EventPreference {
  id: string;
  label: string;
}

export interface Major {
  name: string;
  url: string;
}

/**
 * Initialize Supabase client using environment variables
 */
const getSupabaseClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

/**
 * Fetches all majors from the majors table
 * @returns Promise resolving to an array of majors
 */
export const fetchMajors = async (): Promise<Major[]> => {
  try {
    const supabase = getSupabaseClient();
    
    console.log('Fetching majors from Supabase...');
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    
    // Try different table name variations in case of schema issues
    let { data, error, status, statusText } = await supabase
      .from('majors')
      .select('name, url')
      .order('name');

    // If that fails, try with schema prefix
    if (error && error.code === 'PGRST116') {
      console.log('Trying with public schema prefix...');
      const result = await supabase
        .from('public.majors')
        .select('name, url')
        .order('name');
      data = result.data;
      error = result.error;
      status = result.status;
      statusText = result.statusText;
    }

    console.log('Supabase response:', { data, error, status, statusText });
    console.log('Data type:', typeof data, 'Is array?', Array.isArray(data));
    console.log('Data length:', data?.length);

    if (error) {
      console.error('Error fetching majors from Supabase:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Check if table doesn't exist
      if (error.code === 'PGRST116' || error.message.includes('does not exist') || (error.message.includes('relation') && error.message.includes('does not exist'))) {
        throw new Error('Majors table does not exist. Please create it in Supabase with columns: name (text), url (text)');
      }
      // Check if RLS is blocking access
      if (error.code === '42501' || error.code === 'PGRST301' || error.message.includes('permission denied') || error.message.includes('new row violates row-level security')) {
        throw new Error('Permission denied. Please create a RLS policy: CREATE POLICY "Allow public read access" ON majors FOR SELECT TO public USING (true);');
      }
      throw new Error(`Failed to fetch majors: ${error.message} (Code: ${error.code})`);
    }

    // If we got a successful response but no data, it might be RLS filtering
    if (status === 200 && (!data || data.length === 0)) {
      console.warn('Query succeeded but returned no data. This could mean:');
      console.warn('1. The table is empty');
      console.warn('2. RLS policies are filtering out all rows');
      console.warn('3. Check RLS policies in Supabase Dashboard → Authentication → Policies');
    }

    console.log(`Successfully fetched ${data?.length || 0} majors:`, data);
    return data || [];
  } catch (error: any) {
    console.error('fetchMajors error:', error);
    throw error;
  }
};

/**
 * Extracts the project reference from the Supabase URL
 * @param supabaseUrl - The Supabase project URL
 * @returns The project reference string
 */
const extractProjectRef = (supabaseUrl: string): string => {
  try {
    const url = new URL(supabaseUrl);
    // Extract project ref from URL like: https://xxxxx.supabase.co
    const hostname = url.hostname;
    const match = hostname.match(/^([^.]+)\.supabase\.co$/);
    if (!match || !match[1]) {
      throw new Error('Invalid Supabase URL format');
    }
    return match[1];
  } catch (error) {
    throw new Error(`Failed to extract project reference from URL: ${error}`);
  }
};

/**
 * Extracts the token from an ICS URL
 * @param icsUrl - The ICS calendar URL
 * @returns The user token extracted from the URL, or null if not found
 */
export const extractTokenFromIcsUrl = (icsUrl: string): string | null => {
  try {
    // Decode URL-encoded strings if needed
    let decodedUrl = icsUrl;
    try {
      decodedUrl = decodeURIComponent(icsUrl);
    } catch (e) {
      // If decoding fails, use original
      decodedUrl = icsUrl;
    }
    
    console.log('Extracting token from ICS URL:', decodedUrl);
    
    // Pattern: https://{project}.supabase.co/functions/v1/user-feed/{token}.ics
    // Also handles: /user-feed/{token} or /user-feed/{token}.ics
    // Match /user-feed/ followed by token (UUID format with hyphens), optionally ending with .ics
    const match = decodedUrl.match(/\/user-feed\/([a-f0-9\-]+?)(?:\.ics)?(?:\?|#|$)/i);
    if (match && match[1]) {
      const token = match[1];
      console.log('Extracted token from ICS URL:', token);
      return token;
    }
    console.warn('Could not extract token from ICS URL. Tried pattern:', decodedUrl);
    // Try a more permissive pattern as fallback
    const fallbackMatch = decodedUrl.match(/\/user-feed\/([^/?#]+?)(?:\.ics)?/i);
    if (fallbackMatch && fallbackMatch[1]) {
      const token = fallbackMatch[1];
      console.log('Extracted token using fallback pattern:', token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error extracting token from ICS URL:', error);
    return null;
  }
};

/**
 * Fetches existing preferences for a given token
 * @param token - User token
 * @returns Promise resolving to an array of topic_id strings, or null if not found
 */
export const fetchPreferencesByToken = async (token: string): Promise<string[] | null> => {
  try {
    const supabase = getSupabaseClient();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    console.log('Fetching preferences for token:', token);
    
    // Query directly from feed_preferences table
    // Note: This requires an RLS policy that allows SELECT
    // Run this SQL in Supabase Dashboard if you get permission errors:
    // CREATE POLICY "Allow public read access to feed_preferences" ON feed_preferences FOR SELECT TO public USING (true);
    const { data, error } = await supabase
      .from('feed_preferences')
      .select('topic_id')
      .eq('user_token', token)
      .maybeSingle();

      console.log('Fallback query result:', { data, error });

      if (error) {
      console.error('Error fetching preferences:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // If it's a 406 error, try a different approach
      if (error.code === 'PGRST301' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
        console.log('Got 406 error, trying alternative query method...');
        
        // Try without maybeSingle - just get the array
        const { data: dataArray, error: errorArray } = await supabase
          .from('feed_preferences')
          .select('topic_id')
          .eq('user_token', token)
          .limit(1);
        
        if (errorArray) {
          console.error('Alternative query also failed:', errorArray);
          throw new Error(`Failed to fetch preferences: ${errorArray.message}`);
        }
        
        if (!dataArray || dataArray.length === 0) {
          console.log('No preferences found for token:', token);
          return null;
        }
        
        const result = dataArray[0];
        console.log('Got data from array query:', result);
        console.log('topic_id as string:', String(result?.topic_id));
        
        if (!result || !result.topic_id) {
          console.log('No topic_id found in data');
          return null;
        }
        
        // Parse the string (same logic as above)
        let topicIds: string[] = [];
        if (typeof result.topic_id === 'string') {
          try {
            const parsed = JSON.parse(result.topic_id);
            topicIds = Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            topicIds = result.topic_id.includes(',') 
              ? result.topic_id.split(',').map(s => s.trim()).filter(s => s.length > 0)
              : [result.topic_id.trim()].filter(s => s.length > 0);
          }
        } else if (Array.isArray(result.topic_id)) {
          topicIds = result.topic_id;
        } else {
          topicIds = [String(result.topic_id)];
        }
        
        console.log('Processed topic_ids from fallback:', topicIds);
        return topicIds.length > 0 ? topicIds : null;
      }
      
      throw new Error(`Failed to fetch preferences: ${error.message}`);
    }

    // If data is null, no row was found - but check if there was an error first
    if (!data && !error) {
      console.log('No preferences found for token (maybeSingle returned null, no error):', token);
      // Try one more time with a regular query to be sure
      const { data: verifyData, error: verifyError } = await supabase
        .from('feed_preferences')
        .select('topic_id')
        .eq('user_token', token)
        .limit(1);
      
      console.log('Verification query:', { verifyData, verifyError });
      
      if (verifyError) {
        console.error('Verification query error:', verifyError);
        throw new Error(`Failed to fetch preferences: ${verifyError.message}`);
      }
      
      if (!verifyData || verifyData.length === 0) {
        console.log('Confirmed: No preferences found for token');
        return null;
      }
      
      // Use the verification data
      const result = verifyData[0];
      console.log('Found data via verification query:', result);
      
      if (!result || !result.topic_id) {
        console.log('No topic_id found in verification data');
        return null;
      }
      
      // Parse the string (same logic as below)
      let topicIds: string[] = [];
      if (typeof result.topic_id === 'string') {
        console.log('topic_id as string:', result.topic_id);
        try {
          const parsed = JSON.parse(result.topic_id);
          topicIds = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          topicIds = result.topic_id.includes(',') 
            ? result.topic_id.split(',').map(s => s.trim()).filter(s => s.length > 0)
            : [result.topic_id.trim()].filter(s => s.length > 0);
        }
      } else if (Array.isArray(result.topic_id)) {
        topicIds = result.topic_id;
      } else {
        topicIds = [String(result.topic_id)];
      }
      
      console.log('Final processed topic_ids from verification:', topicIds);
      return topicIds.length > 0 ? topicIds : null;
    }
    
    if (!data) {
      console.log('No preferences found for token:', token);
      return null;
    }

    console.log('Raw data from query:', data);
    console.log('topic_id value:', data?.topic_id);
    console.log('topic_id as string:', String(data?.topic_id));
    console.log('topic_id type:', typeof data?.topic_id);
    console.log('Is array?', Array.isArray(data?.topic_id));

    // Handle the topic_id - it's a string, might be a comma-separated list or JSON array string
    if (!data.topic_id) {
      console.log('No topic_id found in data');
      return null;
    }

    // Print the raw string to console
    console.log('topic_id string value:', data.topic_id);

    // Parse the string - it might be:
    // 1. A comma-separated string: "event1,event2,event3"
    // 2. A JSON array string: '["event1","event2","event3"]'
    // 3. A single value: "event1"
    let topicIds: string[] = [];
    
    if (typeof data.topic_id === 'string') {
      // Try parsing as JSON first (in case it's stored as JSON string)
      try {
        const parsed = JSON.parse(data.topic_id);
        if (Array.isArray(parsed)) {
          topicIds = parsed;
          console.log('Parsed as JSON array:', topicIds);
        } else {
          // Single value in JSON
          topicIds = [parsed];
          console.log('Parsed as single JSON value:', topicIds);
        }
      } catch (e) {
        // Not JSON, try comma-separated
        if (data.topic_id.includes(',')) {
          topicIds = data.topic_id.split(',').map(s => s.trim()).filter(s => s.length > 0);
          console.log('Parsed as comma-separated string:', topicIds);
        } else {
          // Single value
          topicIds = [data.topic_id.trim()].filter(s => s.length > 0);
          console.log('Parsed as single string value:', topicIds);
        }
      }
    } else if (Array.isArray(data.topic_id)) {
      // Already an array
      topicIds = data.topic_id;
      console.log('Already an array:', topicIds);
    } else {
      // Single value
      topicIds = [String(data.topic_id)];
      console.log('Converted to array:', topicIds);
    }

    console.log('Final processed topic_ids:', topicIds);
    
    return topicIds.length > 0 ? topicIds : null;
  } catch (error: any) {
    console.error('fetchPreferencesByToken error:', error);
    throw error;
  }
};

/**
 * Saves or updates event preferences in Supabase and returns a user token
 * @param selectedEventIds - Array of selected event IDs (topic_id values)
 * @param existingToken - Optional existing token to update instead of creating new
 * @returns Promise resolving to a user token string (UUID)
 */
export const savePreferencesAndGetToken = async (
  selectedEventIds: string[],
  existingToken?: string | null
): Promise<string> => {
  // Allow empty arrays - user can have no preferences
  if (!selectedEventIds) {
    selectedEventIds = [];
  }

  const supabase = getSupabaseClient();
  
  // If updating existing preferences, use the existing token
  if (existingToken) {
    console.log('Updating existing preferences with token:', existingToken);
    console.log('New topic_ids to save:', selectedEventIds);
    
    // Check if topic_id is stored as string or array in the database
    // If it's a string column, we might need to convert to string format
    const { data: updateData, error } = await supabase
      .from('feed_preferences')
      .update({
        topic_id: selectedEventIds.length > 0 ? selectedEventIds : null,
      })
      .eq('user_token', existingToken)
      .select();

    if (error) {
      console.error('Error updating preferences to Supabase:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // If it's an RLS error, provide helpful message
      if (error.code === '42501' || error.code === 'PGRST301' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
        throw new Error(`Failed to update preferences: RLS policy is blocking UPDATE. You need to create an UPDATE policy: CREATE POLICY "Allow public update access to feed_preferences" ON feed_preferences FOR UPDATE TO public USING (true);`);
      }
      
      throw new Error(`Failed to update preferences: ${error.message}`);
    }

    console.log('Update result:', updateData);
    console.log('Successfully updated preferences:', selectedEventIds);
    console.log('Using existing user token:', existingToken);
    return existingToken;
  }

  // Otherwise, create new preferences
  const userToken = uuidv4();

  // Insert a single row with topic_id as an array (or null if empty)
  // PostgreSQL array format: {topic1, topic2, topic3}
  const { data, error } = await supabase
    .from('feed_preferences')
    .insert({
      user_token: userToken,
      topic_id: selectedEventIds.length > 0 ? selectedEventIds : null, // Use null for empty preferences
    });

  if (error) {
    console.error('Error saving preferences to Supabase:', error);
    throw new Error(`Failed to save preferences: ${error.message}`);
  }

  console.log('Successfully saved preferences:', selectedEventIds);
  console.log('Generated user token:', userToken);

  return userToken;
};

/**
 * Constructs the ICS feed URL with the given token
 * @param token - User token from savePreferencesAndGetToken
 * @returns Full ICS URL
 */
export const constructIcsUrl = (token: string): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not set');
  }
  
  if (!supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY is not set');
  }

  const projectRef = extractProjectRef(supabaseUrl);
  // Provide prettified .ics URL for calendar clients (token embedded in path)
  return `https://${projectRef}.supabase.co/functions/v1/user-feed/${token}.ics`;
};

/**
 * Adds a topic to the user's waitlist in feed_preferences
 * @param requestedTopic - The topic/event the user is requesting
 * @param userToken - Optional existing user token to link the request
 * @returns Promise resolving to the updated token
 */
export const addToEventWaitlist = async (
  requestedTopic: string,
  userToken?: string | null
): Promise<string> => {
  if (!requestedTopic.trim()) {
    throw new Error('Requested topic cannot be empty');
  }

  const supabase = getSupabaseClient();
  const topic = requestedTopic.trim();

  if (userToken) {
    // User has existing token - fetch current waitlist and append
    const { data: existing, error: fetchError } = await supabase
      .from('feed_preferences')
      .select('waitlist_topics')
      .eq('user_token', userToken)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing waitlist:', fetchError);
      throw new Error(`Failed to fetch waitlist: ${fetchError.message}`);
    }

    // Get current waitlist or empty array
    const currentWaitlist: string[] = existing?.waitlist_topics || [];
    
    // Don't add duplicates
    if (currentWaitlist.includes(topic)) {
      console.log('Topic already in waitlist:', topic);
      return userToken;
    }

    // Append new topic
    const updatedWaitlist = [...currentWaitlist, topic];

    const { error: updateError } = await supabase
      .from('feed_preferences')
      .update({ waitlist_topics: updatedWaitlist })
      .eq('user_token', userToken);

    if (updateError) {
      console.error('Error updating waitlist:', updateError);
      throw new Error(`Failed to update waitlist: ${updateError.message}`);
    }

    console.log('Added to waitlist:', topic, 'for token:', userToken);
    return userToken;
  } else {
    // No token - create new feed_preferences row with just the waitlist topic
    const newToken = uuidv4();

    const { error: insertError } = await supabase
      .from('feed_preferences')
      .insert({
        user_token: newToken,
        topic_id: null,
        waitlist_topics: [topic],
      });

    if (insertError) {
      console.error('Error creating waitlist entry:', insertError);
      throw new Error(`Failed to create waitlist: ${insertError.message}`);
    }

    console.log('Created new waitlist entry:', topic, 'with token:', newToken);
    return newToken;
  }
};
