import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Search, X } from "lucide-react";
import { savePreferencesAndGetToken, constructIcsUrl, fetchMajors, fetchEventsByDescription, extractTokenFromIcsUrl, fetchPreferencesByToken, addToEventWaitlist, type Major, type AcademicEvent } from "@/utils/supabaseService";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type EventCategory = "sports" | "clubs" | "majors" | "academics";

interface Event {
  id: string;
  label: string;
  icon: string;
  category: EventCategory;
}

// Event topics data - IDs must match topic_id values in database exactly
// Categories should match the description column in the database
const EVENTS: Event[] = [
  // Clubs
  { id: "Thucydides Society for Military History Meetings", label: "Thucydides Society for Military History Meetings", icon: "📜", category: "clubs" },
  { id: "Women in Consulting Club Meetings", label: "Women in Consulting Club Meetings", icon: "💼", category: "clubs" },
  { id: "League of Astronomers Club Meetings", label: "League of Astronomers Club Meetings", icon: "🔭", category: "clubs" },
  { id: "National Society of Black Engineers Club Meetings", label: "National Society of Black Engineers Club Meetings", icon: "⚙️", category: "clubs" },
  { id: "Christians in Seattle Meetings", label: "Christians in Seattle Meetings", icon: "✝️", category: "clubs" },
  { id: "Music Listening Club Meetings", label: "Music Listening Club Meetings", icon: "🎵", category: "clubs" },
  { id: "Husky Wiffle Club Meeting", label: "Husky Wiffle Club Meeting", icon: "⚾", category: "clubs" },
  { id: "Historical Fencing Meetings", label: "Historical Fencing Meetings", icon: "⚔️", category: "clubs" },
  { id: "AIESEC Club Meetings", label: "AIESEC Club Meetings", icon: "🌍", category: "clubs" },
  { id: "Huskies for Liberty Club Meetings", label: "Huskies for Liberty Club Meetings", icon: "🗽", category: "clubs" },
  { id: "Huskies for Opportunities in Prison Education Club Meetings", label: "Huskies for Opportunities in Prison Education Club Meetings", icon: "📚", category: "clubs" },
  { id: "Indigenous Students of Latin America Club Meetings", label: "Indigenous Students of Latin America Club Meetings", icon: "🌎", category: "clubs" },
  { id: "Corporate Law & Business Association Club Meetings", label: "Corporate Law & Business Association Club Meetings", icon: "⚖️", category: "clubs" },
  { id: "Eco-Build Club Meetings", label: "Eco-Build Club Meetings", icon: "🌱", category: "clubs" },
  { id: "SEDS Club Meeting", label: "SEDS Club Meeting", icon: "🚀", category: "clubs" },
  { id: "UX club meetings", label: "UX club meetings", icon: "🎨", category: "clubs" },
  { id: "Spanish Club Meetings", label: "Spanish Club Meetings", icon: "🇪🇸", category: "clubs" },
  
  // University Services (categorized as clubs)
  { id: "University District Neighborhood Farmers Market", label: "University District Neighborhood Farmers Market", icon: "🥬", category: "clubs" },
  { id: "Study Abroad Info Sessions", label: "Study Abroad Info Sessions", icon: "✈️", category: "clubs" },
  { id: "CLUE tutoring", label: "CLUE tutoring", icon: "📖", category: "clubs" },
  
  // Sports
  { id: "Basketball", label: "Basketball", icon: "🏀", category: "sports" },
  
  // IMA Classes (categorized as sports)
  { id: "IMA Electro-Cycle", label: "IMA Electro-Cycle", icon: "🚴", category: "sports" },
  { id: "IMA Krav Maga", label: "IMA Krav Maga", icon: "🥋", category: "sports" },
  { id: "IMA HIIT", label: "IMA HIIT", icon: "💪", category: "sports" },
  { id: "IMA Vinyasa Yoga", label: "IMA Vinyasa Yoga", icon: "🧘", category: "sports" },
  { id: "IMA Strength Through Yoga", label: "IMA Strength Through Yoga", icon: "🧘‍♀️", category: "sports" },
  { id: "IMA Pilates", label: "IMA Pilates", icon: "🤸", category: "sports" },
  { id: "IMA Deep End H2O Cardio", label: "IMA Deep End H2O Cardio", icon: "🏊", category: "sports" },
  { id: "IMA Intro to K-Pop Dance", label: "IMA Intro to K-Pop Dance", icon: "💃", category: "sports" },
  { id: "IMA Sunrise Yoga", label: "IMA Sunrise Yoga", icon: "🌅", category: "sports" },
  { id: "IMA Power Yoga", label: "IMA Power Yoga", icon: "🧘‍♂️", category: "sports" },
  { id: "IMA Fight Fit", label: "IMA Fight Fit", icon: "🥊", category: "sports" },
  { id: "IMA All-Levels Vinyasa", label: "IMA All-Levels Vinyasa", icon: "🧘", category: "sports" },
  { id: "IMA Sunrise Cycle", label: "IMA Sunrise Cycle", icon: "🌄", category: "sports" },
  { id: "IMA HIIT - Lydia", label: "IMA HIIT - Lydia", icon: "💪", category: "sports" },
  { id: "IMA Intermediate Vinyasa Yoga", label: "IMA Intermediate Vinyasa Yoga", icon: "🧘", category: "sports" },
  { id: "IMA Yoga Sculpt", label: "IMA Yoga Sculpt", icon: "💪", category: "sports" },
  { id: "IMA Core Crush", label: "IMA Core Crush", icon: "🔥", category: "sports" },
  { id: "IMA Restorative Yoga", label: "IMA Restorative Yoga", icon: "🕯️", category: "sports" },
  { id: "IMA Dance Fitness & Choreography", label: "IMA Dance Fitness & Choreography", icon: "💃", category: "sports" },
  { id: "IMA Shallow End H2O Cardio", label: "IMA Shallow End H2O Cardio", icon: "🏊‍♀️", category: "sports" },
  { id: "IMA Cycle Conditioning", label: "IMA Cycle Conditioning", icon: "🚴‍♂️", category: "sports" },
  { id: "IMA Sunset Yoga", label: "IMA Sunset Yoga", icon: "🌇", category: "sports" },
];

const OnboardingEvents = () => {
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [icsUrl, setIcsUrl] = useState<string | null>(null);
  const [existingToken, setExistingToken] = useState<string | null>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | "all">("all");
  const [majors, setMajors] = useState<Major[]>([]);
  const [isLoadingMajors, setIsLoadingMajors] = useState(false);
  const [academics, setAcademics] = useState<AcademicEvent[]>([]);
  const [isLoadingAcademics, setIsLoadingAcademics] = useState(false);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
  const hasFetchedMajors = useRef(false);
  const hasFetchedAcademics = useRef(false);
  const { toast } = useToast();

  // Reset waitlist state when search query changes
  useEffect(() => {
    setWaitlistSubmitted(false);
  }, [searchQuery]);

  const handleWaitlistSubmit = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSubmittingWaitlist(true);
    try {
      const token = await addToEventWaitlist(searchQuery, existingToken);
      // If a new token was created (user didn't have one), save it
      if (!existingToken && token) {
        setExistingToken(token);
      }
      setWaitlistSubmitted(true);
      toast({
        title: "Added to waitlist! 🎉",
        description: `We'll notify you when "${searchQuery}" becomes available.`,
      });
    } catch (error) {
      console.error("Error adding to waitlist:", error);
      toast({
        title: "Couldn't add to waitlist",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingWaitlist(false);
    }
  };

  // Fetch majors when majors or all category is selected (only once)
  useEffect(() => {
    // Fetch majors for "majors" tab OR "all" tab (since all includes departments)
    const needsMajors = selectedCategory === "majors" || selectedCategory === "all";
    
    if (!needsMajors) {
      return;
    }

    // Only fetch if we haven't fetched yet and we're not currently loading
    if (!hasFetchedMajors.current && !isLoadingMajors && majors.length === 0) {
      hasFetchedMajors.current = true;
      setIsLoadingMajors(true);
      fetchMajors()
        .then((data) => {
          console.log("Majors fetched successfully:", data);
          setMajors(data);
          setIsLoadingMajors(false);
          if (data.length === 0) {
            toast({
              title: "No majors found",
              description: "The majors table is empty. Please add majors in Supabase.",
              variant: "default",
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching majors:", error);
          setIsLoadingMajors(false);
          hasFetchedMajors.current = false; // Allow retry on error
          toast({
            title: "Failed to load majors",
            description: error.message || "Could not fetch majors from database. Check console for details.",
            variant: "destructive",
          });
        });
    }
  }, [selectedCategory, isLoadingMajors, majors.length, toast]);

  // Fetch academics when academics or all category is selected
  useEffect(() => {
    const needsAcademics = selectedCategory === "academics" || selectedCategory === "all";
    
    if (!needsAcademics) {
      return;
    }

    if (!hasFetchedAcademics.current && !isLoadingAcademics && academics.length === 0) {
      hasFetchedAcademics.current = true;
      setIsLoadingAcademics(true);
      fetchEventsByDescription("Academics")
        .then((data) => {
          console.log("Academics fetched successfully:", data);
          setAcademics(data);
          setIsLoadingAcademics(false);
        })
        .catch((error) => {
          console.error("Error fetching academics:", error);
          setIsLoadingAcademics(false);
          hasFetchedAcademics.current = false;
          toast({
            title: "Failed to load academics",
            description: error.message || "Could not fetch academic events from database.",
            variant: "destructive",
          });
        });
    }
  }, [selectedCategory, isLoadingAcademics, academics.length, toast]);

  // Filter events based on search query and category, with selected items at top
  const filteredEvents = useMemo(() => {
    let filtered = EVENTS;

    // Filter by category (only for non-majors categories)
    if (selectedCategory !== "all" && selectedCategory !== "majors") {
      filtered = filtered.filter((event) => event.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((event) =>
        event.label.toLowerCase().includes(query) ||
        event.id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory, selectedEvents]);

  // Filter majors based on search query, with selected items at top
  const filteredMajors = useMemo(() => {
    // Show majors when "all" or "majors" is selected
    if (selectedCategory !== "majors" && selectedCategory !== "all") {
      return [];
    }

    let filtered = majors;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((major) =>
        major.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [majors, searchQuery, selectedCategory, selectedEvents]);

  // Filter academics based on search query
  const filteredAcademics = useMemo(() => {
    if (selectedCategory !== "academics" && selectedCategory !== "all") {
      return [];
    }

    let filtered = academics;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((academic) =>
        academic.topic_id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [academics, searchQuery, selectedCategory]);

  // Helper function to get grouping/detail for events
  const getEventGrouping = (event: Event | Major | AcademicEvent, isMajor: boolean, isAcademic: boolean = false): string => {
    if (isMajor) {
      return "Department";
    }
    if (isAcademic) {
      return "Academics";
    }
    const evt = event as Event;
    if (evt.category === "sports") return "Sports";
    if (evt.category === "clubs") return "Clubs";
    return "Other";
  };

  // Combined and alphabetically sorted list for "all" category
  const allItemsSorted = useMemo(() => {
    if (selectedCategory !== "all") {
      return [];
    }

    // Combine majors, academics, and events into a single array with a common structure
    const items: Array<{
      id: string;
      label: string;
      grouping: string;
      isMajor: boolean;
      isAcademic: boolean;
    }> = [];

    // Add majors
    filteredMajors.forEach((major) => {
      items.push({
        id: `major:${major.name}`,
        label: major.name,
        grouping: "Department",
        isMajor: true,
        isAcademic: false,
      });
    });

    // Add academics
    filteredAcademics.forEach((academic) => {
      items.push({
        id: academic.topic_id,
        label: academic.topic_id,
        grouping: "Academics",
        isMajor: false,
        isAcademic: true,
      });
    });

    // Add regular events
    filteredEvents.forEach((event) => {
      items.push({
        id: event.id,
        label: event.label,
        grouping: getEventGrouping(event, false, false),
        isMajor: false,
        isAcademic: false,
      });
    });

    // Sort alphabetically by label
    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredMajors, filteredAcademics, filteredEvents, selectedCategory]);

  // Check for redirect-url, redirect_uri, and ics_url/ics-url parameters on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Check for redirect-url first (new format), then redirect_uri (backward compatibility)
    const uri = params.get("redirect-url") || params.get("redirect_uri");
    // Support both ics-url (hyphen) and ics_url (underscore) for compatibility
    const icsUrlParam = params.get("ics-url") || params.get("ics_url");
    
    console.log("URL Parameters:", { uri, icsUrlParam, allParams: Object.fromEntries(params) });
    
    if (uri) {
      setRedirectUri(uri);
      console.log("Redirect URI detected:", uri);
    } else {
      console.log("Debug Mode: No redirect-url or redirect_uri found in URL");
    }

    // If ics_url is provided, extract token and load existing preferences
    if (icsUrlParam) {
      console.log("ICS URL parameter found:", icsUrlParam);
      setIcsUrl(icsUrlParam);
      const token = extractTokenFromIcsUrl(icsUrlParam);
      
      console.log("Extracted token:", token);
      
      if (token) {
        setExistingToken(token);
        setIsLoadingPreferences(true);
        
        console.log("Fetching preferences for token:", token);
        console.log("Token length:", token.length);
        console.log("Token format check (UUID):", /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(token));
        
        // Fetch existing preferences
        // First, ensure majors are loaded if not already (in case preferences include majors)
        const loadPreferences = async () => {
          try {
            // Fetch majors first if not already loaded (in case preferences include majors)
            if (!hasFetchedMajors.current) {
              hasFetchedMajors.current = true;
              setIsLoadingMajors(true);
              try {
                const majorsData = await fetchMajors();
                console.log("Majors fetched for preferences loading:", majorsData);
                setMajors(majorsData);
                setIsLoadingMajors(false);
              } catch (error) {
                console.error("Error fetching majors:", error);
                setIsLoadingMajors(false);
                // Continue anyway - preferences can still be loaded
              }
            }
            
            const topicIds = await fetchPreferencesByToken(token);
            console.log("Fetched topicIds:", topicIds);
            console.log("topicIds type:", typeof topicIds);
            console.log("topicIds is array?", Array.isArray(topicIds));
            console.log("topicIds length:", topicIds?.length);
            
            if (topicIds && topicIds.length > 0) {
              console.log("Setting selected events to:", Array.from(new Set(topicIds)));
              setSelectedEvents(new Set(topicIds));
              console.log("Loaded existing preferences:", topicIds);
              toast({
                title: "Preferences loaded",
                description: `Found ${topicIds.length} existing event${topicIds.length > 1 ? 's' : ''}. Update your selections below.`,
              });
            } else {
              console.log("No existing preferences found for token - topicIds is:", topicIds);
              console.log("This could mean:");
              console.log("1. No row exists with this token");
              console.log("2. The topic_id column is empty/null");
              console.log("3. The topic_id array is empty");
              toast({
                title: "No preferences found",
                description: "Starting with a fresh selection. Check console for details.",
              });
            }
            setIsLoadingPreferences(false);
          } catch (error) {
            console.error("Error loading preferences:", error);
            setIsLoadingPreferences(false);
            toast({
              title: "Could not load preferences",
              description: error instanceof Error ? error.message : "Starting with a fresh selection.",
              variant: "destructive",
            });
          }
        };
        
        loadPreferences();
      } else {
        console.warn("Could not extract token from ICS URL:", icsUrlParam);
        toast({
          title: "Invalid ICS URL",
          description: "Could not extract token from the provided ICS URL.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const toggleMajor = (majorId: string) => {
    // The majorId already includes the "major:" prefix
    toggleEvent(majorId);
  };

  const handleSync = async () => {
    setIsLoading(true);

    try {
      // If no preferences are selected, still save to Supabase if there's an existing token
      if (selectedEvents.size === 0) {
        console.log("No preferences selected. Redirect URI:", redirectUri);
        
        // If there's an existing token, update Supabase with empty preferences
        if (existingToken) {
          console.log("Updating Supabase with empty preferences for existing token");
          await savePreferencesAndGetToken([], existingToken);
        }
        
        if (redirectUri) {
          toast({
            title: existingToken ? "Preferences cleared! 🎉" : "Redirecting...",
            description: existingToken ? "All preferences removed." : "No preferences selected.",
          });
          
          // Construct the final redirect URL with empty ics_url parameter
          const separator = redirectUri.includes('?') ? '&' : '?';
          const finalRedirectUrl = `${redirectUri}${separator}ics_url=`;
          
          console.log("Redirecting to:", finalRedirectUrl);
          
          setTimeout(() => {
            window.location.href = finalRedirectUrl;
          }, 1000);
          return;
        } else {
          // Debug mode: no redirect URI, so just show informational message
          console.log("No redirect URI found, cannot redirect");
          toast({
            title: existingToken ? "Preferences cleared! 🎉" : "No preferences selected",
            description: existingToken 
              ? "All preferences have been removed from Supabase."
              : "In production with a redirect URL, this would redirect with ics_url= parameter.",
          });
          setIsLoading(false);
          return;
        }
      }

      // Call Supabase service - use existing token if updating, otherwise create new
      const token = await savePreferencesAndGetToken(Array.from(selectedEvents), existingToken);
      
      // If updating existing preferences, keep the same ICS URL
      // Otherwise, construct a new ICS URL
      let finalIcsUrl: string;
      if (existingToken && icsUrl) {
        // Keep the same ICS URL when updating
        finalIcsUrl = icsUrl;
        console.log("Keeping existing ICS URL:", finalIcsUrl);
      } else {
        // Generate new ICS URL for new preferences
        finalIcsUrl = constructIcsUrl(token);
        setIcsUrl(finalIcsUrl);
      }
      
      // Redirect directly to the external URL with ICS URL appended if redirect_uri is provided
      if (redirectUri) {
        toast({
          title: existingToken ? "Preferences updated! 🎉" : "Calendar synced! 🎉",
          description: "Redirecting you back...",
        });
        
        // Construct the final redirect URL with ICS URL appended
        const separator = redirectUri.includes('?') ? '&' : '?';
        const finalRedirectUrl = `${redirectUri}${separator}ics_url=${encodeURIComponent(finalIcsUrl)}`;
        
        setTimeout(() => {
          window.location.href = finalRedirectUrl;
        }, 1000);
      } else {
        // Debug mode: show the ICS URL in the text field
        toast({
          title: existingToken ? "Preferences updated! 🎉" : "Calendar synced! 🎉",
          description: "Your ICS URL is ready below.",
        });
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Error during sync:", error);
      
      // Show more specific error messages
      let errorMessage = "Something went wrong. Please try again.";
      if (error?.message) {
        if (error.message.includes("Missing Supabase environment variables")) {
          errorMessage = "Configuration error: Supabase credentials are missing. Please check your environment variables.";
        } else if (error.message.includes("Failed to save preferences")) {
          errorMessage = `Database error: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Sync failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen text-foreground relative"
      style={{
        background: `
          radial-gradient(ellipse at 0% 0%, rgba(75, 46, 131, 0.6) 0%, transparent 50%),
          radial-gradient(ellipse at 100% 0%, rgba(183, 165, 122, 0.5) 0%, transparent 45%),
          radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 60%),
          radial-gradient(ellipse at 100% 100%, rgba(75, 46, 131, 0.4) 0%, transparent 50%),
          radial-gradient(ellipse at 0% 100%, rgba(183, 165, 122, 0.4) 0%, transparent 45%),
          linear-gradient(135deg, #1a1025 0%, #2d1f3d 25%, #1f1a2e 50%, #2a2035 75%, #1a1025 100%)
        `,
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="container max-w-4xl mx-auto px-6 py-12 relative z-10">
        {/* Progress Bar/Accent at Top */}
        <motion.div
          className="w-24 h-2 bg-primary mx-auto mb-8 rounded-full"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            Subscribe to Campus Events
          </h1>
          <p className="text-base text-foreground/90 max-w-2xl mx-auto">
            Get campus event automatically sourced onto your calendar! Just select the majors, sports, clubs or other on campus activities to subscribe to. You can always change this later in settings.
          </p>
        </motion.div>

        {/* Category Filter Buttons */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex gap-3 justify-center overflow-x-auto scrollbar-hide pb-1">
            <motion.button
              onClick={() => setSelectedCategory("all")}
              className={`
                flex-shrink-0 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap
                ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-[hsl(270_30%_15%)] text-foreground border border-border hover:bg-[hsl(270_30%_18%)]"
                }
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              All
            </motion.button>
            <motion.button
              onClick={() => setSelectedCategory("majors")}
              className={`
                flex-shrink-0 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap
                ${
                  selectedCategory === "majors"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-[hsl(270_30%_15%)] text-foreground border border-border hover:bg-[hsl(270_30%_18%)]"
                }
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Departments
            </motion.button>
            <motion.button
              onClick={() => setSelectedCategory("academics")}
              className={`
                flex-shrink-0 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap
                ${
                  selectedCategory === "academics"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-[hsl(270_30%_15%)] text-foreground border border-border hover:bg-[hsl(270_30%_18%)]"
                }
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Academics
            </motion.button>
            <motion.button
              onClick={() => setSelectedCategory("sports")}
              className={`
                flex-shrink-0 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap
                ${
                  selectedCategory === "sports"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-[hsl(270_30%_15%)] text-foreground border border-border hover:bg-[hsl(270_30%_18%)]"
                }
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sports
            </motion.button>
            <motion.button
              onClick={() => setSelectedCategory("clubs")}
              className={`
                flex-shrink-0 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap
                ${
                  selectedCategory === "clubs"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-[hsl(270_30%_15%)] text-foreground border border-border hover:bg-[hsl(270_30%_18%)]"
                }
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Clubs
            </motion.button>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          className="mb-6 flex justify-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground/60" />
            <Input
              type="text"
              placeholder="Search events to auto-sync in your calendar"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Switch to "All" tab when searching
                if (e.target.value.trim()) {
                  setSelectedCategory("all");
                }
              }}
              className="w-full bg-[hsl(270_30%_15%)] border-border text-center text-foreground placeholder:text-foreground/60 py-3 pl-12 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-foreground/10 rounded-full transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-foreground/60 hover:text-foreground" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Continue Button */}
        <motion.div
          className="mb-6 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <motion.button
            onClick={handleSync}
            disabled={isLoading}
            className={`
              relative group px-8 py-3 rounded-lg font-semibold text-base
              transition-all
              ${
                !isLoading
                  ? "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-105 cursor-pointer"
                  : "bg-[hsl(270_30%_15%)] text-muted-foreground cursor-not-allowed opacity-50"
              }
            `}
            whileHover={!isLoading ? { scale: 1.05 } : {}}
            whileTap={!isLoading ? { scale: 0.95 } : {}}
          >
            <span className="relative flex items-center gap-2 justify-center">
              {isLoading ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Syncing...
                </>
              ) : (
                <>
                  Back to Wick
                </>
              )}
            </span>
          </motion.button>
        </motion.div>

        {/* Selected Events Pills */}
        {selectedEvents.size > 0 && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="bg-background/30 backdrop-blur-sm rounded-lg p-3 border border-border/50">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <motion.button
                  onClick={() => setSelectedEvents(new Set())}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-shrink-0 px-3 py-1.5 text-sm text-foreground/80 hover:text-foreground border border-border rounded-full hover:bg-[hsl(270_30%_15%)] transition-colors whitespace-nowrap"
                >
                  Deselect all
                </motion.button>
                {Array.from(selectedEvents).reverse().map((eventId) => {
                  // Check if it's a major
                  if (eventId.startsWith("major:")) {
                    const majorName = eventId.replace(/^major:/, "");
                    const major = majors.find((m) => m.name === majorName);
                    if (!major) return null;
                    return (
                      <motion.div
                        key={eventId}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/50 rounded-full text-sm whitespace-nowrap"
                      >
                        <span className="text-foreground">{major.name}</span>
                        <button
                          onClick={() => toggleEvent(eventId)}
                          className="hover:bg-primary/30 rounded-full p-0.5 transition-colors"
                          aria-label={`Remove ${major.name}`}
                        >
                          <X className="w-4 h-4 text-foreground" />
                        </button>
                      </motion.div>
                    );
                  }
                  // Check if it's an academic event
                  const academic = academics.find((a) => a.topic_id === eventId);
                  if (academic) {
                    return (
                      <motion.div
                        key={eventId}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/50 rounded-full text-sm whitespace-nowrap"
                      >
                        <span className="text-foreground">{academic.topic_id}</span>
                        <button
                          onClick={() => toggleEvent(eventId)}
                          className="hover:bg-primary/30 rounded-full p-0.5 transition-colors"
                          aria-label={`Remove ${academic.topic_id}`}
                        >
                          <X className="w-4 h-4 text-foreground" />
                        </button>
                      </motion.div>
                    );
                  }
                  // Regular event (clubs/sports)
                  const event = EVENTS.find((e) => e.id === eventId);
                  if (!event) return null;
                  return (
                    <motion.div
                      key={eventId}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/50 rounded-full text-sm whitespace-nowrap"
                    >
                      <span className="text-foreground">{event.label}</span>
                      <button
                        onClick={() => toggleEvent(eventId)}
                        className="hover:bg-primary/30 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${event.label}`}
                      >
                        <X className="w-4 h-4 text-foreground" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Event Selection Table */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="max-h-[350px] overflow-y-auto scrollbar-visible">
            {/* Table Rows */}
            <div className="space-y-2">
              {selectedCategory === "majors" ? (
                // Show only majors
                isLoadingMajors ? (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <p className="text-muted-foreground">Loading majors...</p>
                  </motion.div>
                ) : filteredMajors.length === 0 ? (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {searchQuery ? (
                      waitlistSubmitted ? (
                        <p className="text-primary">✓ You're on the waitlist for "{searchQuery}"</p>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-muted-foreground">
                            Would you like to be put on the waitlist for "{searchQuery}"?
                          </p>
                          <motion.button
                            onClick={handleWaitlistSubmit}
                            disabled={isSubmittingWaitlist}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {isSubmittingWaitlist ? "Adding..." : "Yes, add me to the waitlist"}
                          </motion.button>
                        </div>
                      )
                    ) : (
                      <p className="text-muted-foreground">No majors available</p>
                    )}
                  </motion.div>
                ) : (
                  filteredMajors.map((major, index) => {
                    const majorId = `major:${major.name}`;
                    return (
                      <motion.button
                        key={major.name}
                        onClick={() => toggleMajor(majorId)}
                        className={`
                          w-full grid grid-cols-[1fr_auto] gap-4 px-4 py-4 rounded-lg transition-all text-left
                          ${
                            selectedEvents.has(majorId)
                              ? "bg-primary/20 border-2 border-primary"
                              : "bg-[hsl(270_30%_12%)] border-2 border-transparent hover:bg-[hsl(270_30%_15%)]"
                          }
                        `}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <div className="font-medium text-foreground">{major.name}</div>
                        <div className="text-foreground/70 text-right">Department</div>
                      </motion.button>
                    );
                  })
                )
              ) : selectedCategory === "academics" ? (
                // Show only academics
                isLoadingAcademics ? (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <p className="text-muted-foreground">Loading academics...</p>
                  </motion.div>
                ) : filteredAcademics.length === 0 ? (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {searchQuery ? (
                      waitlistSubmitted ? (
                        <p className="text-primary">✓ You're on the waitlist for "{searchQuery}"</p>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-muted-foreground">
                            Would you like to be put on the waitlist for "{searchQuery}"?
                          </p>
                          <motion.button
                            onClick={handleWaitlistSubmit}
                            disabled={isSubmittingWaitlist}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {isSubmittingWaitlist ? "Adding..." : "Yes, add me to the waitlist"}
                          </motion.button>
                        </div>
                      )
                    ) : (
                      <p className="text-muted-foreground">No academic events available</p>
                    )}
                  </motion.div>
                ) : (
                  filteredAcademics.map((academic, index) => (
                    <motion.button
                      key={academic.id}
                      onClick={() => toggleEvent(academic.topic_id)}
                      className={`
                        w-full grid grid-cols-[1fr_auto] gap-4 px-4 py-4 rounded-lg transition-all text-left
                        ${
                          selectedEvents.has(academic.topic_id)
                            ? "bg-primary/20 border-2 border-primary"
                            : "bg-[hsl(270_30%_12%)] border-2 border-transparent hover:bg-[hsl(270_30%_15%)]"
                        }
                      `}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div className="font-medium text-foreground">{academic.topic_id}</div>
                      <div className="text-foreground/70 text-right">Academics</div>
                    </motion.button>
                  ))
                )
              ) : selectedCategory === "all" ? (
                // Show all items alphabetically sorted
                (isLoadingMajors || isLoadingAcademics) ? (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <p className="text-muted-foreground">Loading...</p>
                  </motion.div>
                ) : allItemsSorted.length === 0 ? (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {searchQuery ? (
                      waitlistSubmitted ? (
                        <p className="text-primary">✓ You're on the waitlist for "{searchQuery}"</p>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-muted-foreground">
                            Would you like to be put on the waitlist for "{searchQuery}"?
                          </p>
                          <motion.button
                            onClick={handleWaitlistSubmit}
                            disabled={isSubmittingWaitlist}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {isSubmittingWaitlist ? "Adding..." : "Yes, add me to the waitlist"}
                          </motion.button>
                        </div>
                      )
                    ) : (
                      <p className="text-muted-foreground">No events available</p>
                    )}
                  </motion.div>
                ) : (
                  allItemsSorted.map((item, index) => (
                    <motion.button
                      key={item.id}
                      onClick={() => item.isMajor ? toggleMajor(item.id) : toggleEvent(item.id)}
                      className={`
                        w-full grid grid-cols-[1fr_auto] gap-4 px-4 py-4 rounded-lg transition-all text-left
                        ${
                          selectedEvents.has(item.id)
                            ? "bg-primary/20 border-2 border-primary"
                            : "bg-[hsl(270_30%_12%)] border-2 border-transparent hover:bg-[hsl(270_30%_15%)]"
                        }
                      `}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div className="font-medium text-foreground">{item.label}</div>
                      <div className="text-foreground/70 text-right">{item.grouping}</div>
                    </motion.button>
                  ))
                )
              ) : (
                // Show regular events only
                filteredEvents.length === 0 ? (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {searchQuery ? (
                      waitlistSubmitted ? (
                        <p className="text-primary">✓ You're on the waitlist for "{searchQuery}"</p>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-muted-foreground">
                            Would you like to be put on the waitlist for "{searchQuery}"?
                          </p>
                          <motion.button
                            onClick={handleWaitlistSubmit}
                            disabled={isSubmittingWaitlist}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {isSubmittingWaitlist ? "Adding..." : "Yes, add me to the waitlist"}
                          </motion.button>
                        </div>
                      )
                    ) : (
                      <p className="text-muted-foreground">No events found</p>
                    )}
                  </motion.div>
                ) : (
                  filteredEvents.map((event, index) => (
                    <motion.button
                      key={event.id}
                      onClick={() => toggleEvent(event.id)}
                      className={`
                        w-full grid grid-cols-[1fr_auto] gap-4 px-4 py-4 rounded-lg transition-all text-left
                        ${
                          selectedEvents.has(event.id)
                            ? "bg-primary/20 border-2 border-primary"
                            : "bg-[hsl(270_30%_12%)] border-2 border-transparent hover:bg-[hsl(270_30%_15%)]"
                        }
                      `}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div className="font-medium text-foreground">{event.label}</div>
                      <div className="text-foreground/70 text-right">{getEventGrouping(event, false)}</div>
                    </motion.button>
                  ))
                )
              )}
            </div>
          </div>
        </motion.div>

        {/* ICS URL Display */}
        {icsUrl && (
          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <label className="block text-sm font-medium text-foreground mb-2">
              Your Calendar Feed URL
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={icsUrl}
                readOnly
                className="flex-1 font-mono text-sm bg-background/50 border-border"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="outline"
                size="default"
                onClick={async () => {
                  await navigator.clipboard.writeText(icsUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Use this URL to subscribe to your calendar feed in any calendar application.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OnboardingEvents;
