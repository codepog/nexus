import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Zap, Copy, Check, Search } from "lucide-react";
import { AmbientBackground } from "@/components/AmbientBackground";
import { EventCard } from "@/components/EventCard";
import { savePreferencesAndGetToken, constructIcsUrl } from "@/utils/supabaseService";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Event topics data - IDs must match topic_id values in database exactly
const EVENTS = [
  // Clubs
  { id: "Thucydides Society for Military History Meetings", label: "Thucydides Society for Military History Meetings", icon: "📜" },
  { id: "Women in Consulting Club Meetings", label: "Women in Consulting Club Meetings", icon: "💼" },
  { id: "League of Astronomers Club Meetings", label: "League of Astronomers Club Meetings", icon: "🔭" },
  { id: "National Society of Black Engineers Club Meetings", label: "National Society of Black Engineers Club Meetings", icon: "⚙️" },
  { id: "Christians in Seattle Meetings", label: "Christians in Seattle Meetings", icon: "✝️" },
  { id: "Music Listening Club Meetings", label: "Music Listening Club Meetings", icon: "🎵" },
  { id: "Husky Wiffle Club Meeting", label: "Husky Wiffle Club Meeting", icon: "⚾" },
  { id: "Historical Fencing Meetings", label: "Historical Fencing Meetings", icon: "⚔️" },
  { id: "AIESEC Club Meetings", label: "AIESEC Club Meetings", icon: "🌍" },
  { id: "Huskies for Liberty Club Meetings", label: "Huskies for Liberty Club Meetings", icon: "🗽" },
  { id: "Huskies for Opportunities in Prison Education Club Meetings", label: "Huskies for Opportunities in Prison Education Club Meetings", icon: "📚" },
  { id: "Indigenous Students of Latin America Club Meetings", label: "Indigenous Students of Latin America Club Meetings", icon: "🌎" },
  { id: "Corporate Law & Business Association Club Meetings", label: "Corporate Law & Business Association Club Meetings", icon: "⚖️" },
  { id: "Eco-Build Club Meetings", label: "Eco-Build Club Meetings", icon: "🌱" },
  { id: "SEDS Club Meeting", label: "SEDS Club Meeting", icon: "🚀" },
  { id: "UX club meetings", label: "UX club meetings", icon: "🎨" },
  { id: "Spanish Club Meetings", label: "Spanish Club Meetings", icon: "🇪🇸" },
  
  // University Services
  { id: "University District Neighborhood Farmers Market", label: "University District Neighborhood Farmers Market", icon: "🥬" },
  { id: "Study Abroad Info Sessions", label: "Study Abroad Info Sessions", icon: "✈️" },
  { id: "CLUE tutoring", label: "CLUE tutoring", icon: "📖" },
  
  // Sports
  { id: "Basketball", label: "Basketball", icon: "🏀" },
  
  // IMA Classes
  { id: "IMA Electro-Cycle", label: "IMA Electro-Cycle", icon: "🚴" },
  { id: "IMA Krav Maga", label: "IMA Krav Maga", icon: "🥋" },
  { id: "IMA HIIT", label: "IMA HIIT", icon: "💪" },
  { id: "IMA Vinyasa Yoga", label: "IMA Vinyasa Yoga", icon: "🧘" },
  { id: "IMA Strength Through Yoga", label: "IMA Strength Through Yoga", icon: "🧘‍♀️" },
  { id: "IMA Pilates", label: "IMA Pilates", icon: "🤸" },
  { id: "IMA Deep End H2O Cardio", label: "IMA Deep End H2O Cardio", icon: "🏊" },
  { id: "IMA Intro to K-Pop Dance", label: "IMA Intro to K-Pop Dance", icon: "💃" },
  { id: "IMA Sunrise Yoga", label: "IMA Sunrise Yoga", icon: "🌅" },
  { id: "IMA Power Yoga", label: "IMA Power Yoga", icon: "🧘‍♂️" },
  { id: "IMA Fight Fit", label: "IMA Fight Fit", icon: "🥊" },
  { id: "IMA All-Levels Vinyasa", label: "IMA All-Levels Vinyasa", icon: "🧘" },
  { id: "IMA Sunrise Cycle", label: "IMA Sunrise Cycle", icon: "🌄" },
  { id: "IMA HIIT - Lydia", label: "IMA HIIT - Lydia", icon: "💪" },
  { id: "IMA Intermediate Vinyasa Yoga", label: "IMA Intermediate Vinyasa Yoga", icon: "🧘" },
  { id: "IMA Yoga Sculpt", label: "IMA Yoga Sculpt", icon: "💪" },
  { id: "IMA Core Crush", label: "IMA Core Crush", icon: "🔥" },
  { id: "IMA Restorative Yoga", label: "IMA Restorative Yoga", icon: "🕯️" },
  { id: "IMA Dance Fitness & Choreography", label: "IMA Dance Fitness & Choreography", icon: "💃" },
  { id: "IMA Shallow End H2O Cardio", label: "IMA Shallow End H2O Cardio", icon: "🏊‍♀️" },
  { id: "IMA Cycle Conditioning", label: "IMA Cycle Conditioning", icon: "🚴‍♂️" },
  { id: "IMA Sunset Yoga", label: "IMA Sunset Yoga", icon: "🌇" },
];

const Index = () => {
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [icsUrl, setIcsUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Filter events based on search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) {
      return EVENTS;
    }
    const query = searchQuery.toLowerCase();
    return EVENTS.filter((event) =>
      event.label.toLowerCase().includes(query) ||
      event.id.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Check for redirect_uri parameter on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uri = params.get("redirect_uri");
    
    if (uri) {
      setRedirectUri(uri);
      console.log("Redirect URI detected:", uri);
    } else {
      console.log("Debug Mode: No redirect_uri found in URL");
    }
  }, []);

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

  const handleSync = async () => {
    if (selectedEvents.size === 0) {
      toast({
        title: "No events selected",
        description: "Please select at least one event to sync.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call Supabase service
      const token = await savePreferencesAndGetToken(Array.from(selectedEvents));
      
      // Construct ICS URL
      const generatedIcsUrl = constructIcsUrl(token);
      setIcsUrl(generatedIcsUrl);
      
      // Redirect back with ICS URL if redirect_uri is provided
      if (redirectUri) {
        toast({
          title: "Calendar synced! 🎉",
          description: "Redirecting you back...",
        });
        
        const separator = redirectUri.includes("?") ? "&" : "?";
        const finalUrl = `${redirectUri}${separator}ics_url=${encodeURIComponent(generatedIcsUrl)}`;
        
        setTimeout(() => {
          window.location.href = finalUrl;
        }, 1000);
      } else {
        // Debug mode: show the ICS URL in the text field
        toast({
          title: "Calendar synced! 🎉",
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
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AmbientBackground />

      <div className="relative z-10 container max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Partner Integration</span>
          </motion.div>

          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Sync Your Events
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select the university events you want to follow and sync them to your calendar.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search events, clubs, or IMA classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full bg-background/50 border-border"
            />
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-muted-foreground">
              Showing {filteredEvents.length} of {EVENTS.length} events
            </p>
          )}
        </motion.div>

        {/* Event Selection Grid - Scrollable Container */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="max-h-[600px] overflow-y-auto border border-border rounded-lg bg-background/30 backdrop-blur-sm p-4 scrollbar-visible">
            <div className="grid gap-4 pr-2">
              {filteredEvents.length === 0 ? (
                <motion.div
                  className="text-center py-12"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <p className="text-muted-foreground">
                    No events found matching "{searchQuery}"
                  </p>
                </motion.div>
              ) : (
                filteredEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    <EventCard
                      id={event.id}
                      label={event.label}
                      icon={event.icon}
                      isSelected={selectedEvents.has(event.id)}
                      onToggle={toggleEvent}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Sync Button */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <motion.button
            onClick={handleSync}
            disabled={isLoading || selectedEvents.size === 0}
            className={`
              relative group px-8 py-4 rounded-xl font-semibold text-lg
              backdrop-blur-md border-2 transition-all
              ${
                selectedEvents.size > 0 && !isLoading
                  ? "bg-primary text-primary-foreground border-primary shadow-glow-lg hover:shadow-glow-lg hover:scale-105"
                  : "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50"
              }
            `}
            whileHover={selectedEvents.size > 0 && !isLoading ? { scale: 1.05 } : {}}
            whileTap={selectedEvents.size > 0 && !isLoading ? { scale: 0.95 } : {}}
          >
            {/* Shine effect overlay */}
            {selectedEvents.size > 0 && !isLoading && (
              <motion.div
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}

            <span className="relative flex items-center gap-2">
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
                  <Zap className="w-5 h-5" />
                  Sync Calendar
                </>
              )}
            </span>
          </motion.button>

          <p className="mt-4 text-sm text-muted-foreground">
            {selectedEvents.size} event{selectedEvents.size !== 1 ? "s" : ""} selected
          </p>
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

export default Index;
