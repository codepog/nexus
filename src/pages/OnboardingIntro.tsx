import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// Import assets
import fountainSvg from "@/assets/fountain.svg";
import quadSvg from "@/assets/quad.svg";
import huskySrc from "@/assets/husky.png";
import departmentsBadge from "@/assets/departments-badge-new.png";
import sportsBadge from "@/assets/sports-badge-new.png";
import clubsBadge from "@/assets/clubs-badge-cropped-3e799c.png";
import onboardingScreenshot from "@/assets/onboarding-screenshot.png";
import calendarPreview from "@/assets/calendar-preview.png";

const OnboardingIntro = () => {
  // Category cards data
  const categoryCards = [
    {
      id: "departments",
      title: "Departments",
      image: departmentsBadge,
      description: "Choose your current and prospective majors, minors, and schools of interest to have their calendars added to yours!",
    },
    {
      id: "sports",
      title: "Sports",
      image: sportsBadge,
      description: "Choose your sports and IMA class of interest to have their schedules added to your calendar!",
    },
    {
      id: "clubs",
      title: "Clubs",
      image: clubsBadge,
      description: "Choose the clubs you are apart of or want to join to have their schedules added to your calendar!",
    },
  ];

  return (
    <div className="min-h-screen text-foreground relative overflow-x-hidden">
      {/* Logo/Home Link */}
      <motion.div
        className="absolute top-6 left-6 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Link
          to="/"
          className="font-body font-bold text-xl text-white hover:text-white/80 transition-colors"
        >
          Maximal Learning
        </Link>
      </motion.div>

      {/* Hero Section with Background */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-primary">
          <img
            src={fountainSvg}
            alt=""
            className="absolute top-0 left-0 w-full h-auto opacity-60"
          />
          <img
            src={quadSvg}
            alt=""
            className="absolute bottom-0 left-0 w-full h-auto opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/50 to-primary" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 py-16 flex flex-col lg:flex-row items-center gap-8">
          {/* Text Content */}
          <motion.div
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white leading-tight mb-4">
              Welcome Huskies
            </h1>
            <p className="font-body text-xl md:text-2xl text-white/90 max-w-lg mb-8">
              Subscribe to your favorite clubs, sports, and other events.
            </p>

            {/* Continue Button in Hero */}
            <Link
              to="/onboarding/events"
              className="inline-block bg-accent-gold text-card-dark font-button font-bold text-xl px-10 py-4 rounded-lg hover:opacity-90 transition-opacity shadow-lg"
            >
              Continue
            </Link>
          </motion.div>

          {/* Husky Image */}
          <motion.div
            className="flex-1 flex justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <img
              src={huskySrc}
              alt="Wick the Husky"
              className="w-64 md:w-80 lg:w-[500px] h-auto drop-shadow-2xl"
            />
          </motion.div>
        </div>
      </section>

      {/* Category Cards Section */}
      <section className="relative bg-card-dark py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {categoryCards.map((card, index) => (
              <motion.div
                key={card.id}
                className="bg-card-dark border border-border-accent rounded-3xl p-6 text-center flex flex-col"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <h3 className="font-heading text-2xl text-white mb-4">
                  {card.title}
                </h3>
                <div className="flex-1 flex items-center justify-center mb-4">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full max-w-[240px] h-[200px] object-contain"
                  />
                </div>
                <p className="font-body text-white/80 text-sm leading-relaxed">
                  {card.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscribe to Campus Events Section */}
      <section className="relative bg-card-dark py-16">
        <div className="container mx-auto px-6">
          <motion.div
            className="flex flex-col lg:flex-row items-center justify-center gap-8 max-w-6xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Calendar Preview - Left */}
            <div className="flex-1 flex justify-center">
              <img
                src={calendarPreview}
                alt="Calendar Preview"
                className="h-[400px] w-auto rounded-2xl shadow-lg"
              />
            </div>

            {/* Event Selection Screenshot - Right */}
            <div className="flex-1 flex justify-center">
              <img
                src={onboardingScreenshot}
                alt="Subscribe to Campus Events"
                className="h-[400px] w-auto rounded-2xl shadow-lg"
              />
            </div>
          </motion.div>

          {/* Continue Button */}
          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link
              to="/onboarding/events"
              className="inline-block bg-accent-gold text-card-dark font-button font-bold text-xl px-12 py-4 rounded-lg hover:opacity-90 transition-opacity shadow-lg"
            >
              Continue
            </Link>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default OnboardingIntro;
