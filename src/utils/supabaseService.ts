import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export interface EventPreference {
  id: string;
  label: string;
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

  // Prepare rows for batch insert
  const rows = selectedEventIds.map((topicId) => ({
    user_token: userToken,
    topic_id: topicId,
  }));

  // Insert all preferences in a single batch operation
  const { data, error } = await supabase
    .from('feed_preferences')
    .insert(rows);

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
