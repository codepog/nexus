import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string | null; // Can be null for TBD times
  end_time?: string | null;
  topic_id: string;
  location?: string; // Event location (address, room number, etc.)
  recurrence_frequency?: string; // e.g., "WEEKLY", "DAILY", "MONTHLY"
  recurrence_until?: string; // ISO date string when recurrence ends
  time_tbd?: boolean; // Flag to indicate time is TBD
  event_date?: string; // Date-only field for TBD time events (YYYY-MM-DD format)
}

const extractTokenFromPath = (pathname: string): string | null => {
  // Supports:
  // - /functions/v1/user-feed/{token}
  // - /functions/v1/user-feed/{token}.ics
  // - /user-feed/{token}
  // - /user-feed/{token}.ics
  const match = pathname.match(/\/(?:functions\/v1\/)?user-feed\/([^/]+)/i);
  if (match && match[1]) {
    return match[1].replace(/\.ics$/i, "");
  }
  return null;
};

/**
 * Formats a date to ICS format (YYYYMMDDTHHMMSSZ) for date-time
 */
function formatICSDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Formats a date to ICS format (YYYYMMDD) for all-day events
 */
function formatICSDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Escapes text for ICS format
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Parses an ICS file string and converts it to CalendarEvent array
 */
function parseICS(icsText: string, sourceName: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  
  // Normalize line endings (handle both \r\n and \n)
  const normalizedText = icsText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split by VEVENT blocks - handle both \n and \r\n line endings
  const veventMatches = normalizedText.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g);
  if (!veventMatches || veventMatches.length === 0) {
    console.warn(`No VEVENT blocks found in ICS for ${sourceName}`);
    return events;
  }

  console.log(`Found ${veventMatches.length} VEVENT blocks in ${sourceName}`);

  for (let i = 0; i < veventMatches.length; i++) {
    const veventBlock = veventMatches[i];
    try {
      const event: Partial<CalendarEvent> = {
        topic_id: `major:${sourceName}`,
        time_tbd: false,
      };

      // Extract UID - handle multiline and parameters
      const uidMatch = veventBlock.match(/UID(?:;.*?)?[:\s]+([^\r\n]+)/i);
      if (uidMatch) {
        event.id = uidMatch[1].trim();
      } else {
        // Generate a unique ID if not found
        event.id = `${sourceName}-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      // Extract SUMMARY (title) - handle multiline and parameters
      const summaryMatch = veventBlock.match(/SUMMARY(?:;.*?)?[:\s]+([^\r\n]+)/i);
      if (summaryMatch) {
        event.title = unescapeICSText(summaryMatch[1].trim());
      } else {
        event.title = `Event from ${sourceName}`;
      }

      // Extract DESCRIPTION - handle multiline
      const descMatch = veventBlock.match(/DESCRIPTION(?:;.*?)?[:\s]+([^\r\n]+)/i);
      if (descMatch) {
        event.description = unescapeICSText(descMatch[1].trim());
      }

      // Extract LOCATION
      const locationMatch = veventBlock.match(/LOCATION(?:;.*?)?[:\s]+([^\r\n]+)/i);
      if (locationMatch) {
        event.location = unescapeICSText(locationMatch[1].trim());
      }

      // Extract DTSTART - handle VALUE=DATE parameter and timezone
      const dtstartMatch = veventBlock.match(/DTSTART(?:;VALUE=DATE)?(?:;TZID=[^:]+)?[:\s]+([^\r\n]+)/i);
      if (dtstartMatch) {
        const dtstartStr = dtstartMatch[1].trim();
        const startDate = parseICSDate(dtstartStr);
        if (startDate) {
          // Check if it's a DATE-only format (YYYYMMDD)
          if (dtstartStr.length === 8 && !dtstartStr.includes('T')) {
            event.event_date = formatDateOnly(startDate);
            event.time_tbd = true;
          } else {
            event.start_time = startDate.toISOString();
          }
        } else {
          console.warn(`Failed to parse DTSTART for event ${i} in ${sourceName}: ${dtstartStr}`);
        }
      } else {
        console.warn(`No DTSTART found for event ${i} in ${sourceName}`);
      }

      // Extract DTEND - handle VALUE=DATE parameter and timezone
      const dtendMatch = veventBlock.match(/DTEND(?:;VALUE=DATE)?(?:;TZID=[^:]+)?[:\s]+([^\r\n]+)/i);
      if (dtendMatch) {
        const dtendStr = dtendMatch[1].trim();
        const endDate = parseICSDate(dtendStr);
        if (endDate && !event.time_tbd) {
          event.end_time = endDate.toISOString();
        }
      }

      // Only add event if it has at least a start time or date
      if (event.start_time || event.event_date) {
        events.push(event as CalendarEvent);
      } else {
        console.warn(`Skipping event ${i} in ${sourceName} - no valid start time or date`);
      }
    } catch (error) {
      console.error(`Error parsing VEVENT block ${i} in ${sourceName}:`, error);
      console.error(`Block preview: ${veventBlock.substring(0, 200)}`);
    }
  }

  return events;
}

/**
 * Unescapes ICS text (reverses escapeICSText)
 */
function unescapeICSText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Parses an ICS date string (YYYYMMDDTHHMMSSZ or YYYYMMDD)
 * Handles various formats including with/without timezone
 */
function parseICSDate(dateStr: string): Date | null {
  try {
    // Remove any whitespace
    dateStr = dateStr.trim();
    
    // Handle DATE format (YYYYMMDD)
    if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(dateStr.substring(6, 8));
      const date = new Date(Date.UTC(year, month, day));
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${dateStr}`);
        return null;
      }
      return date;
    }
    
    // Handle DATE-TIME format (YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS)
    // Can be 15 chars (YYYYMMDDTHHMMSS) or 16 chars (YYYYMMDDTHHMMSSZ)
    if (dateStr.length >= 15 && dateStr.includes('T')) {
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      const hours = parseInt(dateStr.substring(9, 11) || "0");
      const minutes = parseInt(dateStr.substring(11, 13) || "0");
      const seconds = parseInt(dateStr.substring(13, 15) || "0");
      
      // Check if it's UTC (ends with Z) or local time
      const isUTC = dateStr.endsWith('Z') || dateStr.length === 16;
      const date = isUTC 
        ? new Date(Date.UTC(year, month, day, hours, minutes, seconds))
        : new Date(year, month, day, hours, minutes, seconds);
      
      if (isNaN(date.getTime())) {
        console.warn(`Invalid datetime: ${dateStr}`);
        return null;
      }
      return date;
    }
    
    console.warn(`Unrecognized date format: ${dateStr} (length: ${dateStr.length})`);
    return null;
  } catch (error) {
    console.error("Error parsing ICS date:", dateStr, error);
    return null;
  }
}

/**
 * Formats a date to YYYY-MM-DD format
 */
function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Generates ICS content from calendar events
 */
function generateICS(events: CalendarEvent[]): string {
  const now = new Date();
  const calendarId = `user-feed-${formatICSDate(now)}`;

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nexus Sync//Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ].join("\r\n");

  for (const event of events) {
    // Normalize empty strings to null for consistent checking
    const startTime = event.start_time && event.start_time.trim() !== '' ? event.start_time : null;
    const endTime = event.end_time && event.end_time.trim() !== '' ? event.end_time : null;
    const eventDate = event.event_date && event.event_date.trim() !== '' ? event.event_date : null;
    
    // Skip events without a start time or date
    if (!startTime && !eventDate) {
      console.warn(`Skipping event ${event.id} (${event.title}): no start_time or event_date`);
      continue; // Skip events with no date/time information
    }

    const isTimeTBD = event.time_tbd || !startTime;
    let startDate: Date;
    let endDate: Date;
    let isAllDay = false;

    if (isTimeTBD && eventDate) {
      // Use event_date for TBD time events (all-day format)
      try {
        // Handle both YYYY-MM-DD and full timestamp formats
        const dateStr = eventDate.includes('T') ? eventDate.split('T')[0] : eventDate;
        startDate = new Date(dateStr + "T00:00:00Z");
        
        if (isNaN(startDate.getTime())) {
          console.warn(`Invalid event_date for event ${event.id}: ${eventDate}`);
          continue;
        }
        
        // For all-day events, DTEND is exclusive (next day)
        endDate = new Date(startDate);
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        isAllDay = true;
      } catch (error) {
        console.error(`Error parsing event_date for event ${event.id}: ${eventDate}`, error);
        continue;
      }
    } else if (startTime) {
      // Normal event with specific time
      try {
        startDate = new Date(startTime);
        
        if (isNaN(startDate.getTime())) {
          console.warn(`Invalid start_time for event ${event.id}: ${startTime}`);
          continue;
        }
        
        if (endTime) {
          endDate = new Date(endTime);
          if (isNaN(endDate.getTime())) {
            console.warn(`Invalid end_time for event ${event.id}: ${endTime}, using default 1 hour`);
            endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
          }
        } else {
          // Default 1 hour if no end time
          endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        }
      } catch (error) {
        console.error(`Error parsing start_time for event ${event.id}: ${startTime}`, error);
        continue;
      }
    } else {
      // Fallback: skip if no valid date/time
      console.warn(`Skipping event ${event.id} (${event.title}): no valid date/time information`);
      continue;
    }

    ics += "\r\nBEGIN:VEVENT";
    ics += `\r\nUID:${event.id}@nexus-sync`;
    ics += `\r\nDTSTAMP:${formatICSDate(now)}`;
    
    // Use DATE format for all-day events, DATE-TIME for timed events
    if (isAllDay) {
      ics += `\r\nDTSTART;VALUE=DATE:${formatICSDateOnly(startDate)}`;
      ics += `\r\nDTEND;VALUE=DATE:${formatICSDateOnly(endDate)}`;
    } else {
      ics += `\r\nDTSTART:${formatICSDate(startDate)}`;
      ics += `\r\nDTEND:${formatICSDate(endDate)}`;
    }
    
    ics += `\r\nSUMMARY:${escapeICSText(event.title)}`;

    // Add TBD note to description if time is TBD
    let description = event.description || "";
    if (isTimeTBD && !description.includes("TBD") && !description.includes("To Be Determined")) {
      description = (description ? description + " " : "") + "[Time TBD]";
    }
    if (description) {
      ics += `\r\nDESCRIPTION:${escapeICSText(description)}`;
    }

    if (event.location) {
      ics += `\r\nLOCATION:${escapeICSText(event.location)}`;
    }

    // Add recurrence rule if specified
    if (event.recurrence_frequency && event.recurrence_until) {
      try {
        // Handle both date-only strings (YYYY-MM-DD) and full timestamps
        let untilDate: Date;
        const untilStr = String(event.recurrence_until).trim();
        
        // If it's just a date (YYYY-MM-DD format), add time
        if (/^\d{4}-\d{2}-\d{2}$/.test(untilStr)) {
          untilDate = new Date(untilStr + "T23:59:59Z");
        } else {
          untilDate = new Date(untilStr);
        }
        
        // Validate the date
        if (isNaN(untilDate.getTime())) {
          console.warn(`Invalid recurrence_until date for event ${event.id}: ${event.recurrence_until}`);
        } else {
          // Set to end of day (23:59:59) for the UNTIL date
          untilDate.setUTCHours(23, 59, 59, 999);
          const untilDateStr = formatICSDate(untilDate);
          
          // Build RRULE based on frequency (handle lowercase input)
          const freq = event.recurrence_frequency.toUpperCase();
          if (["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) {
            ics += `\r\nRRULE:FREQ=${freq};UNTIL=${untilDateStr}`;
          } else {
            console.warn(`Invalid recurrence_frequency for event ${event.id}: ${event.recurrence_frequency}`);
          }
        }
      } catch (error) {
        console.error(`Error processing recurrence for event ${event.id}:`, error);
      }
    }

    ics += "\r\nEND:VEVENT";
  }

  ics += "\r\nEND:VCALENDAR";

  return ics;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get token from query parameters or path (support .ics links)
    const url = new URL(req.url);
    let token = url.searchParams.get("token");
    if (!token) {
      token = extractTokenFromPath(url.pathname);
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing token parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    // Use service role key for internal database access (bypasses RLS)
    // This allows the function to access data without requiring user authentication
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user preferences from feed_preferences table
    const { data: preferences, error: prefError } = await supabase
      .from("feed_preferences")
      .select("topic_id")
      .eq("user_token", token)
      .single(); // Get single row since we now store array in one row

    if (prefError) {
      console.error("Error fetching preferences:", prefError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch preferences" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!preferences || !preferences.topic_id) {
      return new Response(
        JSON.stringify({ error: "No preferences found for this token" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // topic_id is now an array, so we can use it directly
    // Handle both array format and single value (for backwards compatibility)
    const topicIdArray = Array.isArray(preferences.topic_id) 
      ? preferences.topic_id 
      : [preferences.topic_id];

    // Separate regular topic IDs from major selections
    const topicIds: string[] = [];
    const majorNames: string[] = [];
    
    for (const topicId of topicIdArray) {
      if (topicId.startsWith("major:")) {
        // Extract major name (remove "major:" prefix)
        const majorName = topicId.replace(/^major:/, "");
        majorNames.push(majorName);
      } else {
        topicIds.push(topicId);
      }
    }

    console.log("Looking for events with topic_ids:", topicIds);
    console.log("Looking for majors:", majorNames);

    // Fetch calendar events for regular topics from the events table
    let events: CalendarEvent[] = [];
    if (topicIds.length > 0) {
      const { data: dbEvents, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .in("topic_id", topicIds);
      
      if (eventsError) {
        console.error("Error fetching events:", eventsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch calendar events" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      events = (dbEvents || []).filter((event) => {
        // Validate that event has required fields
        if (!event.id) {
          console.warn(`Skipping event with no id:`, event);
          return false;
        }
        if (!event.title) {
          console.warn(`Skipping event ${event.id} with no title`);
          return false;
        }
        if (!event.topic_id) {
          console.warn(`Skipping event ${event.id} with no topic_id`);
          return false;
        }
        // Event must have either start_time or event_date
        const hasStartTime = event.start_time && event.start_time.trim() !== '';
        const hasEventDate = event.event_date && event.event_date.trim() !== '';
        if (!hasStartTime && !hasEventDate) {
          console.warn(`Skipping event ${event.id} (${event.title}): no start_time or event_date`);
          return false;
        }
        return true;
      });
      console.log(`Found ${events.length} valid events for ${topicIds.length} topics (after filtering)`);
    }

    // Fetch and parse ICS files for selected majors
    if (majorNames.length > 0) {
      // Get major URLs from the majors table
      const { data: majorsData, error: majorsError } = await supabase
        .from("majors")
        .select("name, url")
        .in("name", majorNames);

      if (majorsError) {
        console.error("Error fetching majors:", majorsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch major information" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Fetch and parse ICS files for each major
      const majorEventsPromises = (majorsData || []).map(async (major) => {
        try {
          console.log(`Fetching ICS from: ${major.url} for ${major.name}`);
          const icsResponse = await fetch(major.url, {
            headers: {
              'User-Agent': 'Nexus-Sync/1.0',
            },
          });
          
          if (!icsResponse.ok) {
            console.error(`Failed to fetch ICS for ${major.name}: HTTP ${icsResponse.status} ${icsResponse.statusText}`);
            return [];
          }
          
          const icsText = await icsResponse.text();
          console.log(`Fetched ${icsText.length} characters from ${major.name}`);
          
          if (!icsText || icsText.trim().length === 0) {
            console.warn(`Empty ICS file for ${major.name}`);
            return [];
          }
          
          const parsedEvents = parseICS(icsText, major.name);
          console.log(`Parsed ${parsedEvents.length} events from ${major.name}`);
          
          if (parsedEvents.length === 0) {
            console.warn(`No events parsed from ${major.name}. ICS file might be empty or in an unsupported format.`);
            console.warn(`First 500 chars of ICS: ${icsText.substring(0, 500)}`);
          }
          
          return parsedEvents;
        } catch (error) {
          console.error(`Error fetching/parsing ICS for ${major.name}:`, error);
          console.error(`Error details:`, error instanceof Error ? error.message : String(error));
          return [];
        }
      });

      const majorEventsArrays = await Promise.all(majorEventsPromises);
      const majorEvents = majorEventsArrays.flat();
      events = [...events, ...majorEvents];
      console.log(`Added ${majorEvents.length} events from ${majorNames.length} majors`);
    }
    
    // Sort events manually to handle NULL start_time values and event_date
    const sortedEvents = events.sort((a, b) => {
      // Get sortable date for each event (prefer start_time, fallback to event_date)
      const getSortDate = (event: CalendarEvent): Date | null => {
        if (event.start_time && event.start_time.trim() !== '') {
          const date = new Date(event.start_time);
          return isNaN(date.getTime()) ? null : date;
        }
        if (event.event_date && event.event_date.trim() !== '') {
          const dateStr = event.event_date.includes('T') ? event.event_date.split('T')[0] : event.event_date;
          const date = new Date(dateStr + "T00:00:00Z");
          return isNaN(date.getTime()) ? null : date;
        }
        return null;
      };
      
      const dateA = getSortDate(a);
      const dateB = getSortDate(b);
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // NULLs go to end
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    });

    // Generate ICS content
    const icsContent = generateICS(sortedEvents);

    // Return ICS file
    return new Response(icsContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="calendar.ics"',
      },
    });
  } catch (error) {
    console.error("Error in user-feed function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

