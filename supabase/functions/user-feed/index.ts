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
      startDate = new Date(event.start_time);
      endDate = event.end_time
        ? new Date(event.end_time)
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
      .eq("user_token", token);

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

    if (!preferences || preferences.length === 0) {
      return new Response(
        JSON.stringify({ error: "No preferences found for this token" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract topic IDs
    const topicIds = preferences.map((p) => p.topic_id);
    console.log("Looking for events with topic_ids:", topicIds);

    // Fetch calendar events for these topics from the events table
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .in("topic_id", topicIds);
    
    // Sort events manually to handle NULL start_time values
    const sortedEvents = (events || []).sort((a, b) => {
      if (!a.start_time && !b.start_time) return 0;
      if (!a.start_time) return 1; // NULLs go to end
      if (!b.start_time) return -1;
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
    
    console.log(`Found ${sortedEvents.length} events for ${topicIds.length} topics`);

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

