# Nexus Sync - Codebase Context

## Project Overview
Nexus Sync is a calendar synchronization service that acts as an intermediary between partner websites and users. Partner sites redirect users here to select their interests, and the app generates a personalized calendar feed URL that gets passed back to the partner site.

## Core Functionality Flow
1. **Entry**: Users arrive with a partner callback URL (canonical: `?redirect-url=https://partner-site.com/callback`, legacy: `redirect_url` / `redirect_uri` / `redirect-uri`)
2. **Selection**: Users browse and select from:
   - Event topics from the `events` table (e.g. Clubs/Sports/Academics), fetched dynamically from Supabase
   - Departments from the `majors` table (fetched dynamically from Supabase)
   - Selected items automatically move to the top of their list for easy visibility
3. **Processing**: Selected preferences are saved to Supabase, generating a unique UUID token
   - All selected topics are stored in a single row with `topic_id` as a PostgreSQL array: `{topic1, topic2, topic3}`
   - Regular events are stored with their `topic_id`
   - Departments are stored with `major:{department_name}` prefix
4. **ICS Generation**: A personalized ICS calendar feed URL is constructed using the token
   - Fetches events from database by `topic_id`
   - Fetches and parses ICS files from selected department URLs
   - Merges all events into a single ICS calendar
5. **Redirect**: Users are redirected back to the partner site via `/api/redirect` with the ICS URL appended

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn-ui components with Tailwind CSS
- **Animations**: Framer Motion
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Routing**: React Router v6
- **API**: Vercel serverless function (Node.js)

## Key Files & Their Roles

### Frontend Entry Points
- `src/main.tsx` - React app entry point
- `src/App.tsx` - Main app component with routing setup
- `src/pages/OnboardingIntro.tsx` - Intro/entry page that preserves redirect params and routes into event selection
- `src/pages/OnboardingEvents.tsx` - **Main user interface** where users select topics/departments and generate an `ics_url`
- `src/pages/TestEvents.tsx` - Testing-only UI variant (kept separate from production flow)

### Core Business Logic
- `src/utils/supabaseService.ts` - Handles:
  - Saving user preferences to `feed_preferences` table (single row per user with array format)
  - Generating UUID tokens for users
  - Fetching departments from the `majors` table
  - Constructing ICS feed URLs: `https://[PROJECT].supabase.co/functions/v1/user-feed/{token}.ics`

### API Endpoint
- `api/redirect/index.mjs` - Vercel serverless function that:
  - Validates redirect URL query parameter (canonical: `redirect-url`; legacy: `redirect_url` / `redirect_uri` / `redirect-uri`)
  - Handles URL encoding/decoding (supports double-encoding)
  - Appends `ics_url` parameter to redirect URI (accepts legacy input name `ics-url`)
  - Performs 302 redirect back to partner site
  - If no topics/majors are provided, still includes `ics_url=` with an empty value

### Backend Function
- `supabase/functions/user-feed/index.ts` - Supabase Edge Function (Deno) that:
  - Extracts token from URL path or query params
  - Looks up user preferences from `feed_preferences` table (single row with array format)
  - Reads `topic_id` as a PostgreSQL array and processes each topic
  - Separates regular events (by `topic_id`) from department selections (prefixed with `major:`)
  - Fetches matching events from `events` table by `topic_id`
  - For selected departments:
    - Looks up department URLs from `majors` table
    - Fetches ICS files from those URLs
    - Parses ICS files and converts to CalendarEvent format
    - Handles various ICS formats (DATE, DATE-TIME, timezones, parameters)
  - Merges database events with parsed department events
  - Generates ICS calendar format with proper formatting
  - Handles all-day events, TBD times, recurrence rules
  - Returns `text/calendar` content type

### UI Components
- `src/components/EventCard.tsx` - Individual selectable event card with animations
- `src/components/AmbientBackground.tsx` - Visual background effects

## Database Schema

### `feed_preferences` Table
- `user_token` (text, UNIQUE) - UUID generated per user session (one row per user)
- `topic_id` (text[]) - PostgreSQL array of topic IDs. Format: `{topic1, topic2, topic3}`
  - Matches event topic IDs (e.g., "Basketball", "IMA HIIT") 
  - Department selections use `major:{department_name}` prefix (e.g., "major:Computer Science")
  - Example: `{"Basketball", "IMA HIIT", "major:Computer Science"}`
- `created_at` (timestamptz) - Timestamp when preferences were created
- **Index**: GIN index on `topic_id` for efficient array searches

### `events` Table
- `id` (uuid) - Event identifier
- `title` (text) - Event name
- `description` (text, optional)
- `start_time` (timestamptz) - Can be null for TBD events
- `end_time` (timestamptz, optional)
- `topic_id` (text) - Topic key stored in `feed_preferences.topic_id` and used to fetch events for the ICS feed
- `location` (text, optional)
- `recurrence_frequency` (text) - "DAILY", "WEEKLY", "MONTHLY", "YEARLY"
- `recurrence_until` (text) - ISO date string
- `time_tbd` (boolean) - Flag for time-to-be-determined events
- `event_date` (text) - Date-only field for TBD events (YYYY-MM-DD)

### `majors` Table
- `name` (text, PRIMARY KEY) - Department name (e.g., "Computer Science", "Engineering")
- `url` (text) - ICS calendar URL for that department's events
- **RLS Policy Required**: `CREATE POLICY "Allow public read access" ON majors FOR SELECT TO public USING (true);`
- **Note**: Despite the table name "majors", it represents departments in the UI

## Event Data
### Topics (Clubs / Sports / Academics)
- Topics shown in the UI are fetched dynamically from the `events` table in Supabase.
- The UI queries by `events.description` (e.g. "Clubs", "Sports", "Academics") and displays unique `topic_id` values.
- Selected topics are stored in `feed_preferences.topic_id` as strings that match `events.topic_id`.

### Dynamic Departments
- Departments are fetched dynamically from the `majors` table in Supabase
- Each department has a `name` and `url` (ICS calendar URL)
- Departments are displayed when users select the "Departments" category tab
- When selected, departments are stored in `feed_preferences` array with `major:{name}` prefix
- The user-feed function fetches ICS files from department URLs and parses them into events

## Category Filtering
Users can filter events by category:
- **All** - Shows all events and departments
- **Clubs** - Shows only club events
- **Sports** - Shows only sports events (including IMA classes)
- **Departments** - Shows only departments from the database (fetched dynamically)

## UI Features
- **Selected items move to top**: When events/departments are selected, they automatically move to the top of their list for easy visibility
- **Visual feedback**: Selected items are highlighted with primary color border and background

## Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## URL Patterns

### User Entry
```
https://nexus-sync.com/?redirect-url=https://partner.com/callback
```

### ICS Feed URL
```
https://[PROJECT_REF].supabase.co/functions/v1/user-feed/{token}.ics
```

### Redirect API Call
```
/api/redirect?redirect-url=https://partner.com/callback&ics_url=https://...
```

### Final Redirect (back to partner)
```
https://partner.com/callback?ics_url=https://[PROJECT].supabase.co/functions/v1/user-feed/{token}.ics
```

## Key Implementation Details

### Token Generation
- Uses `uuid` package (v4) to generate unique tokens
- One token per user session (not per selection)
- Token is stored in `feed_preferences` table as a single row per user
- All selected topics are stored in a PostgreSQL array: `topic_id TEXT[]`
- Department selections are stored with `major:{department_name}` prefix in the array
- Example: `{Basketball, IMA HIIT, major:Computer Science}`

### ICS URL Construction
- Extracts project reference from Supabase URL (e.g., `sjidynrgfnvvgtjbkgii` from `https://sjidynrgfnvvgtjbkgii.supabase.co`)
- Constructs path: `/functions/v1/user-feed/{token}.ics`
- Supports both `.ics` extension and plain token in path

### Redirect Handling
- Supports URL-encoded and double-encoded redirect parameters (canonical: `redirect-url`; legacy: `redirect_url` / `redirect_uri` / `redirect-uri`)
- Automatically adds `https://` protocol if missing
- Validates URL format before redirecting
- Uses appropriate query separator (`?` or `&`) based on existing params

### Debug Mode
- If no `redirect_uri` is provided, app shows ICS URL in a text field instead of redirecting
- Allows manual copying of calendar feed URL

## Error Handling
- Validates Supabase environment variables on initialization
- Shows user-friendly error messages via toast notifications
- Handles missing preferences, invalid tokens, and database errors
- Redirect API returns 400/500 status codes with JSON error messages

## Dependencies Highlights
- `@supabase/supabase-js` - Database client
- `react-router-dom` - Client-side routing
- `framer-motion` - Animations
- `uuid` - Token generation
- `@tanstack/react-query` - Data fetching (though minimal usage)
- `lucide-react` - Icons

## Project Structure
```
nexus-sync/
├── api/
│   └── redirect.js          # Vercel serverless redirect handler
├── src/
│   ├── pages/
│   │   ├── Index.tsx        # Main selection interface
│   │   └── NotFound.tsx
│   ├── components/
│   │   ├── EventCard.tsx
│   │   └── ui/              # shadcn-ui components
│   ├── utils/
│   │   └── supabaseService.ts
│   └── App.tsx
└── supabase/
    └── functions/
        └── user-feed/
            └── index.ts     # ICS calendar generator
```

## ICS Parsing for Majors
The user-feed function includes robust ICS parsing capabilities:
- Handles multiple ICS formats (DATE, DATE-TIME, with/without timezones)
- Parses VEVENT blocks with proper line ending normalization
- Extracts UID, SUMMARY, DESCRIPTION, LOCATION, DTSTART, DTEND
- Handles ICS parameters like `;VALUE=DATE` and `;TZID=...`
- Converts parsed events to CalendarEvent format for merging
- Includes comprehensive error logging for debugging

## Important Notes
- The redirect endpoint is a Vercel serverless function (`api/redirect/index.mjs`)
- The Supabase function is a Deno Edge Function (ES modules)
- Topic IDs stored in `feed_preferences.topic_id` must exactly match `events.topic_id` values
- The app supports both production (with redirect) and debug (no redirect) modes
- ICS generation handles edge cases: all-day events, TBD times, recurrence rules, NULL values
- Departments require RLS policy: `CREATE POLICY "Allow public read access" ON majors FOR SELECT TO public USING (true);`
- Department ICS URLs must be publicly accessible (no authentication required)
- **Database Schema**: `feed_preferences.topic_id` is a PostgreSQL array (`TEXT[]`), not multiple rows
- **Migration**: See `migration_to_array_format.sql` for migrating from old multi-row format to array format
- Selected items automatically sort to the top of their category list for better UX

