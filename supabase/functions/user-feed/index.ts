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
 * Extracts timezone (TZID) from a DTSTART or DTEND line
 */
function extractTZID(line: string): string | null {
  const tzidMatch = line.match(/TZID=([^;:]+)/i);
  return tzidMatch ? tzidMatch[1].trim() : null;
}

/**
 * Gets the timezone offset in minutes for a given timezone at a reference date.
 */
function getTimezoneOffsetMinutes(timezone: string, refDate: Date): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(refDate);
    const get = (type: string) => {
      const part = parts.find(p => p.type === type);
      return part ? parseInt(part.value, 10) : 0;
    };

    let hour = get('hour');
    if (hour === 24) hour = 0;

    const tzDate = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      hour,
      get('minute'),
      get('second')
    );

    return (refDate.getTime() - tzDate) / (60 * 1000);
  } catch (e) {
    console.warn(`Failed to get offset for timezone ${timezone}:`, e);
    return 0;
  }
}

/**
 * Parses RRULE string and extracts frequency and until date
 */
function parseRRule(rruleStr: string): { frequency: string | null; until: string | null } {
  const result: { frequency: string | null; until: string | null } = {
    frequency: null,
    until: null
  };

  const freqMatch = rruleStr.match(/FREQ=([A-Z]+)/i);
  if (freqMatch) {
    result.frequency = freqMatch[1].toUpperCase();
  }

  const untilMatch = rruleStr.match(/UNTIL=([0-9TZ]+)/i);
  if (untilMatch) {
    const untilDate = parseICSDate(untilMatch[1]);
    if (untilDate) {
      result.until = untilDate.toISOString();
    }
  }

  if (!result.until && result.frequency) {
    const countMatch = rruleStr.match(/COUNT=(\d+)/i);
    if (countMatch) {
      const count = parseInt(countMatch[1], 10);
      const endDate = new Date();
      switch (result.frequency) {
        case 'DAILY': endDate.setDate(endDate.getDate() + count); break;
        case 'WEEKLY': endDate.setDate(endDate.getDate() + count * 7); break;
        case 'MONTHLY': endDate.setMonth(endDate.getMonth() + count); break;
        case 'YEARLY': endDate.setFullYear(endDate.getFullYear() + count); break;
      }
      result.until = endDate.toISOString();
    }
  }

  return result;
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
        const dtstartLineMatch = veventBlock.match(/DTSTART[^:\r\n]*:([^\r\n]+)/i);
        if (dtstartLineMatch) {
          const fullLine = dtstartLineMatch[0];
          const dtstartStr = dtstartLineMatch[1].trim();
          const tzid = extractTZID(fullLine);
          const isDateOnly = fullLine.includes('VALUE=DATE') || (dtstartStr.length === 8 && !dtstartStr.includes('T'));

          if (isDateOnly) {
            const startDate = parseICSDate(dtstartStr);
            if (startDate) {
              event.event_date = formatDateOnly(startDate);
              event.time_tbd = true;
            }
          } else {
            const startDate = parseICSDate(dtstartStr, tzid || undefined);
            if (startDate) {
              event.start_time = startDate.toISOString();
            } else {
              console.warn(`Failed to parse DTSTART for event ${i} in ${sourceName}: ${dtstartStr}`);
            }
          }
        } else {
          console.warn(`No DTSTART found for event ${i} in ${sourceName}`);
        }

        // Extract DTEND - handle VALUE=DATE parameter and timezone
        const dtendLineMatch = veventBlock.match(/DTEND[^:\r\n]*:([^\r\n]+)/i);
        if (dtendLineMatch && !event.time_tbd) {
          const fullLine = dtendLineMatch[0];
          const dtendStr = dtendLineMatch[1].trim();
          const tzid = extractTZID(fullLine);

          const endDate = parseICSDate(dtendStr, tzid || undefined);
          if (endDate) {
            event.end_time = endDate.toISOString();
          }
        }

        // Extract RRULE for recurring events
        const rruleMatch = veventBlock.match(/RRULE[^:\r\n]*:([^\r\n]+)/i);
        if (rruleMatch) {
          const rruleStr = rruleMatch[1].trim();
          const { frequency, until } = parseRRule(rruleStr);
          if (frequency) {
            event.recurrence_frequency = frequency;
            if (until) {
              event.recurrence_until = until;
            } else {
              const defaultEnd = new Date();
              defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
              event.recurrence_until = defaultEnd.toISOString();
            }
            console.log(`Parsed recurring event: ${event.title} - ${frequency} until ${event.recurrence_until}`);
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

function parseICSDate(dateStr: string, timezone?: string): Date | null {
  try {
    dateStr = dateStr.trim();

    // Handle DATE format (YYYYMMDD)
    if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      const date = new Date(Date.UTC(year, month, day));
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${dateStr}`);
        return null;
      }
      return date;
    }

    // Handle DATE-TIME format
    if (dateStr.length >= 15 && dateStr.includes('T')) {
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      const hours = parseInt(dateStr.substring(9, 11) || "0");
      const minutes = parseInt(dateStr.substring(11, 13) || "0");
      const seconds = parseInt(dateStr.substring(13, 15) || "0");

      // If timezone provided and not UTC, convert from that timezone
      if (timezone && !dateStr.endsWith('Z')) {
        const asUtc = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
        const offsetMinutes = getTimezoneOffsetMinutes(timezone, asUtc);
        return new Date(asUtc.getTime() + offsetMinutes * 60 * 1000);
      }

      return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    }

    console.warn(`Unrecognized date format: ${dateStr}`);
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
 * Parses a database timestamp string, assuming Pacific timezone if no timezone is specified.
 * This fixes the issue where times stored without timezone info are incorrectly treated as UTC.
 */
function parseDbTimestamp(timeStr: string | null | undefined): Date | null {
  if (!timeStr) return null;

  const str = timeStr.trim();

  // If already has Z suffix (UTC) or timezone offset, parse directly
  if (str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str)) {
    return new Date(str);
  }

  // Otherwise assume the time is in Pacific timezone and convert to UTC
  // Parse the date components manually to avoid browser/runtime inconsistencies
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):?(\d{2})?/);
  if (match) {
    const [, year, month, day, hours, minutes, seconds = "0"] = match;

    // Create a date treating the input as UTC first
    const asUtc = new Date(Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    ));

    // Get the Pacific timezone offset at this time and adjust
    const pacificOffset = getTimezoneOffsetMinutes('America/Los_Angeles', asUtc);
    return new Date(asUtc.getTime() + pacificOffset * 60 * 1000);
  }

  // Fallback: try direct parsing (may be unreliable)
  console.warn(`Unexpected timestamp format, falling back to direct parse: ${str}`);
  return new Date(str);
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
    // Skip events without a start time or date
    if (!event.start_time && !event.event_date) {
      continue; // Skip events with no date/time information
    }

    const isTimeTBD = event.time_tbd || !event.start_time;
    let startDate: Date;
    let endDate: Date;
    let isAllDay = false;

    if (isTimeTBD && event.event_date) {
      // Use event_date for TBD time events (all-day format)
      startDate = new Date(event.event_date + "T00:00:00Z");
      // For all-day events, DTEND is exclusive (next day)
      endDate = new Date(startDate);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      isAllDay = true;
    } else if (event.start_time) {
      // Normal event with specific time
      // Use parseDbTimestamp to handle Pacific timezone conversion for database events
      const parsedStart = parseDbTimestamp(event.start_time);
      if (!parsedStart) {
        console.warn(`Failed to parse start_time for event ${event.id}: ${event.start_time}`);
        continue;
      }
      startDate = parsedStart;

      const parsedEnd = parseDbTimestamp(event.end_time);
      endDate = parsedEnd
        ? parsedEnd
        : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour if no end time
    } else {
      // Fallback: skip if no valid date/time
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
            // For WEEKLY frequency, add BYDAY parameter for better calendar app compatibility
            if (freq === "WEEKLY") {
              const days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
              const dayOfWeek = days[startDate.getUTCDay()];
              ics += `\r\nRRULE:FREQ=${freq};BYDAY=${dayOfWeek};UNTIL=${untilDateStr}`;
            } else {
              ics += `\r\nRRULE:FREQ=${freq};UNTIL=${untilDateStr}`;
            }
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
    // Note: topic_id is stored as an array in a single row
    const { data: preferences, error: prefError } = await supabase
      .from("feed_preferences")
      .select("topic_id")
      .eq("user_token", token)
      .single();

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

    if (!preferences) {
      return new Response(
        JSON.stringify({ error: "No preferences found for this token" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // topic_id is stored as an array - handle both array and null cases
    let topicIdArray: string[] = [];
    if (preferences.topic_id) {
      if (Array.isArray(preferences.topic_id)) {
        topicIdArray = preferences.topic_id;
      } else if (typeof preferences.topic_id === 'string') {
        // Handle if stored as JSON string or comma-separated
        try {
          const parsed = JSON.parse(preferences.topic_id);
          topicIdArray = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          topicIdArray = preferences.topic_id.split(',').map(s => s.trim()).filter(s => s);
        }
      } else {
        topicIdArray = [String(preferences.topic_id)];
      }
    }

    console.log("Raw topic_id from DB:", preferences.topic_id);
    console.log("Parsed topicIdArray:", topicIdArray);

    // If no preferences selected, return empty ICS file
    if (topicIdArray.length === 0) {
      console.log("No preferences selected, returning empty ICS");
      const emptyICS = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Nexus Sync//Calendar Feed//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "END:VCALENDAR"
      ].join("\r\n");
      
      return new Response(emptyICS, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": 'attachment; filename="calendar.ics"',
        },
      });
    }

    // Separate regular topic IDs from major selections
    const topicIds: string[] = [];
    const majorNames: string[] = [];
    
    for (const topicId of topicIdArray) {
      if (!topicId || typeof topicId !== 'string') {
        console.warn("Skipping invalid topicId:", topicId);
        continue;
      }
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
      
      events = dbEvents || [];
      console.log(`Found ${events.length} events for ${topicIds.length} topics`);

      // Debug: log first event's time conversion
      if (events.length > 0 && events[0].start_time) {
        const sample = events[0];
        const parsed = parseDbTimestamp(sample.start_time);
        console.log(`Sample event time conversion: "${sample.start_time}" -> ${parsed?.toISOString()} (UTC)`);
      }
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
    
    // Sort events manually to handle NULL start_time values
    const sortedEvents = events.sort((a, b) => {
      if (!a.start_time && !b.start_time) return 0;
      if (!a.start_time) return 1; // NULLs go to end
      if (!b.start_time) return -1;
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
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





