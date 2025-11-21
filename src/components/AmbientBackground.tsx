import { motion } from "framer-motion";

/**
 * Ambient background with floating glow orbs
 */
export const AmbientBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Top-left glow */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
        style={{
          background: "radial-gradient(circle, hsl(var(--glow-primary)) 0%, transparent 70%)",
        }}
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        initial={{ x: -200, y: -200 }}
      />

      {/* Bottom-right glow */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-15"
        style={{
          background: "radial-gradient(circle, hsl(var(--glow-primary)) 0%, transparent 70%)",
          right: -200,
          bottom: -200,
        }}
        animate={{
          x: [0, -80, 0],
          y: [0, 60, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Center ambient light */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-3xl opacity-10"
        style={{
          background: "radial-gradient(circle, hsl(var(--glow-primary)) 0%, transparent 70%)",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};
