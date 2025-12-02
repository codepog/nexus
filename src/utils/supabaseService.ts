import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface EventPreference {
  id: string;
  label: string;
}

const PROJECT_REF = 'sjidynrgfnvvgtjbkgii';

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
  return `https://${PROJECT_REF}.supabase.co/functions/v1/user-feed/${token}.ics`;
};
