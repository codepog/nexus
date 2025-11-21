import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Zap } from "lucide-react";
import { AmbientBackground } from "@/components/AmbientBackground";
import { EventCard } from "@/components/EventCard";
import { savePreferencesAndGetToken, constructIcsUrl } from "@/utils/supabaseService";
import { useToast } from "@/hooks/use-toast";

// Mock event data
const EVENTS = [
  { id: "bball", label: "Men's Basketball", icon: "🏀" },
  { id: "fball", label: "Football", icon: "🏈" },
  { id: "acad", label: "Academic Calendar", icon: "🎓" },
  { id: "arts", label: "Arts & Theater", icon: "🎨" },
];

const Index = () => {
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
      // Call mock Supabase service
      const token = await savePreferencesAndGetToken(Array.from(selectedEvents));
      
      // Construct ICS URL
      const icsUrl = constructIcsUrl(token);
      
      toast({
        title: "Calendar synced! 🎉",
        description: "Redirecting you back...",
      });

      // Redirect back with ICS URL
      if (redirectUri) {
        const separator = redirectUri.includes("?") ? "&" : "?";
        const finalUrl = `${redirectUri}${separator}ics_url=${encodeURIComponent(icsUrl)}`;
        
        setTimeout(() => {
          window.location.href = finalUrl;
        }, 1000);
      } else {
        // Debug mode: show the ICS URL
        console.log("Generated ICS URL:", icsUrl);
        toast({
          title: "Debug Mode",
          description: `ICS URL: ${icsUrl}`,
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error during sync:", error);
      toast({
        title: "Sync failed",
        description: "Something went wrong. Please try again.",
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

          {/* Debug indicator */}
          {!redirectUri && (
            <motion.div
              className="mt-6 inline-block px-4 py-2 rounded-lg bg-muted/50 border border-border"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-sm text-muted-foreground">
                Debug Mode: No redirect_uri found
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Event Selection Grid */}
        <motion.div
          className="grid gap-4 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, staggerChildren: 0.1 }}
        >
          {EVENTS.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <EventCard
                id={event.id}
                label={event.label}
                icon={event.icon}
                isSelected={selectedEvents.has(event.id)}
                onToggle={toggleEvent}
              />
            </motion.div>
          ))}
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
      </div>
    </div>
  );
};

export default Index;
