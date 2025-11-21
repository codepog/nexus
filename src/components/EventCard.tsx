import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface EventCardProps {
  id: string;
  label: string;
  icon: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export const EventCard = ({ id, label, icon, isSelected, onToggle }: EventCardProps) => {
  return (
    <motion.button
      onClick={() => onToggle(id)}
      className={`
        relative group w-full p-6 rounded-xl
        backdrop-blur-md border transition-all
        ${
          isSelected
            ? "bg-white/10 border-primary shadow-glow-md"
            : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
    >
      {/* Glow effect when selected */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-primary/20 blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            className={`text-4xl ${isSelected ? "scale-110" : ""} transition-transform`}
            animate={isSelected ? { rotate: [0, -10, 10, -10, 0] } : {}}
            transition={{ duration: 0.5 }}
          >
            {icon}
          </motion.div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-foreground">{label}</h3>
            <p className="text-sm text-muted-foreground">
              {isSelected ? "Selected" : "Click to select"}
            </p>
          </div>
        </div>

        {/* Checkmark */}
        <motion.div
          className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center
            ${
              isSelected
                ? "bg-primary border-primary"
                : "border-white/30 group-hover:border-white/50"
            }
          `}
          initial={false}
          animate={isSelected ? { scale: [0.8, 1.1, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {isSelected && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.button>
  );
};
