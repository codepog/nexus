/**
 * Mock Supabase Service
 * 
 * This module simulates saving user preferences and generating a token.
 * TODO: Replace with real Supabase integration later.
 */

export interface EventPreference {
  id: string;
  label: string;
}

/**
 * Simulates saving event preferences and returns a mock user token
 * @param selectedEventIds - Array of selected event IDs
 * @returns Promise resolving to a user token string
 */
export const savePreferencesAndGetToken = async (
  selectedEventIds: string[]
): Promise<string> => {
  // Simulate API call with 2-second delay
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  // Generate a mock token (in production, this would come from Supabase)
  const mockToken = `mock_token_${Date.now()}_${selectedEventIds.join('_')}`;
  
  console.log('Mock: Saved preferences:', selectedEventIds);
  console.log('Mock: Generated token:', mockToken);
  
  return mockToken;
};

/**
 * Constructs the ICS feed URL with the given token
 * @param token - User token from savePreferencesAndGetToken
 * @returns Full ICS URL
 */
export const constructIcsUrl = (token: string): string => {
  // TODO: Replace PROJECT_REF with actual Supabase project reference
  const PROJECT_REF = 'YOUR_PROJECT_REF';
  return `https://${PROJECT_REF}.supabase.co/functions/v1/user-feed?token=${token}`;
};
