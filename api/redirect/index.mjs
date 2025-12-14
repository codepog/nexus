// api/redirect/index.mjs

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extracts the project reference from the Supabase URL
 */
const extractProjectRef = (supabaseUrl) => {
  try {
    const url = new URL(supabaseUrl);
    const hostname = url.hostname;
    const match = hostname.match(/^([^.]+)\.supabase\.co$/);
    if (!match || !match[1]) {
      throw new Error('Invalid Supabase URL format');
    }
    return match[1];
  } catch (error) {
    throw new Error(`Failed to extract project reference from URL: ${error.message}`);
  }
};

/**
 * Constructs the ICS feed URL with the given token
 */
const constructIcsUrl = (token, supabaseUrl) => {
  const projectRef = extractProjectRef(supabaseUrl);
  return `https://${projectRef}.supabase.co/functions/v1/user-feed/${token}.ics`;
};

export default async (req, res) => {
  try {
    console.log('Redirect API called with query:', req.query);
    
    // 1. Get the redirect-url from query parameters
    let redirectUrl = req.query['redirect-url'];
  
    // 2. Get preferences from query parameters
    const topicIds = req.query['topic_ids'] ? 
      (Array.isArray(req.query['topic_ids']) ? req.query['topic_ids'] : req.query['topic_ids'].split(','))
      : [];
    const majorIds = req.query['major_ids'] ? 
      (Array.isArray(req.query['major_ids']) ? req.query['major_ids'] : req.query['major_ids'].split(','))
      : [];
    
    // 3. Check if ICS URL is provided directly (for backward compatibility)
    const providedIcsUrl = req.query['ics_url'] || req.query['ics-url'];
  
    // Basic validation
    if (!redirectUrl) {
      res.status(400).json({ 
        error: 'Missing redirect-url query parameter',
        message: 'Please provide a redirect-url query parameter. Example: /api/redirect?redirect-url=https://example.com&topic_ids=event1,event2'
      });
      return;
    }

    let icsUrl;

    // If ICS URL is provided directly, use it
    if (providedIcsUrl) {
      icsUrl = providedIcsUrl;
    } else {
      // If no preferences are provided, set ics_url to empty string
      if (topicIds.length === 0 && majorIds.length === 0) {
        icsUrl = '';
      } else {
        // Get Supabase credentials from environment variables
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          res.status(500).json({ 
            error: 'Missing Supabase configuration',
            message: 'Supabase URL and anon key must be set in environment variables'
          });
          return;
        }

        // Initialize Supabase client
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Generate a unique UUID for the user token
        const userToken = uuidv4();

        // Save preferences to Supabase (only if topic_ids are provided)
        if (topicIds.length > 0) {
          const { error: insertError } = await supabase
            .from('feed_preferences')
            .insert({
              user_token: userToken,
              topic_id: topicIds,
            });

          if (insertError) {
            console.error('Error saving preferences to Supabase:', insertError);
            res.status(500).json({ 
              error: 'Failed to save preferences',
              message: insertError.message 
            });
            return;
          }
        }

        // Construct the ICS URL
        icsUrl = constructIcsUrl(userToken, supabaseUrl);
      }
    }

    // 4. Decode URL-encoded redirect-url if needed
    try {
      let decoded = decodeURIComponent(redirectUrl);
      if (decoded.includes('%')) {
        decoded = decodeURIComponent(decoded);
      }
      redirectUrl = decoded;
    } catch (decodeError) {
      // If decoding fails, continue with original value
    }

    // 5. Normalize the redirect URL - add protocol if missing
    if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
      redirectUrl = `https://${redirectUrl}`;
    }

    // 6. Validate that it's a proper URL
    try {
      new URL(redirectUrl);
    } catch (urlError) {
      res.status(400).json({ 
        error: 'Invalid redirect-url format',
        message: `The redirect-url must be a valid URL. Received: ${req.query['redirect-url']}`
      });
      return;
    }

    // 7. Construct the final URL with ICS URL appended
    const separator = redirectUrl.includes('?') ? '&' : '?';
    // If icsUrl is empty, still include the parameter but with empty value
    const finalUrl = `${redirectUrl}${separator}ics_url=${icsUrl ? encodeURIComponent(icsUrl) : ''}`;
    
    // 8. Perform the 302 redirect
    res.writeHead(302, {
      'Location': finalUrl
    });
    res.end();

  } catch (error) {
    console.error('Error during redirect:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    
    // Ensure we haven't already sent a response
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
};