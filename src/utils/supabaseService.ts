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
 * Saves event preferences to Supabase and returns a user token
 * @param selectedEventIds - Array of selected event IDs (topic_id values)
 * @returns Promise resolving to a user token string (UUID)
 */
export const savePreferencesAndGetToken = async (
  selectedEventIds: string[]
): Promise<string> => {
  if (!selectedEventIds || selectedEventIds.length === 0) {
    throw new Error('No event IDs provided');
  }

  const supabase = getSupabaseClient();
  
  // Generate a unique UUID for the user token
  const userToken = uuidv4();

  // Insert a single row with topic_id as an array
  // PostgreSQL array format: {topic1, topic2, topic3}
  const { data, error } = await supabase
    .from('feed_preferences')
    .insert({
      user_token: userToken,
      topic_id: selectedEventIds, // Supabase will handle array conversion
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
