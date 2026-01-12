import { motion } from "framer-motion";

// Import assets
import fountainSvg from "@/assets/fountain.svg";
import quadSvg from "@/assets/quad.svg";
import huskySrc from "@/assets/husky.png";
import appScreenshotSrc from "@/assets/app-screenshot.png";
import phoneMockupSrc from "@/assets/phone-mockup.png";
import googlePlayBadge from "@/assets/google-play-badge.png";
import appStoreBadge from "@/assets/app-store-badge.png";

const Landing = () => {
  return (
    <div className="min-h-screen text-foreground relative overflow-x-hidden bg-primary">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-visible">
        {/* Background */}
        <div className="absolute inset-0 bg-primary overflow-hidden">
          {/* Fountain Background */}
          <img
            src={fountainSvg}
            alt=""
            className="absolute top-0 left-0 w-full h-auto opacity-60"
          />
          {/* Quad Background */}
          <img
            src={quadSvg}
            alt=""
            className="absolute bottom-0 left-0 w-full h-auto opacity-40"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 py-20 flex flex-col lg:flex-row items-center gap-12">
          {/* Text Content */}
          <motion.div
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl text-white leading-tight mb-6">
              Hi Huskies,
              <br />
              I'm Wick.
            </h1>
            <p className="font-body text-xl md:text-2xl text-white/90 mb-8 max-w-xl">
              I'll help you plan your assignments and activities so you stay on track.
            </p>

            {/* App Store Badges */}
            <div className="flex gap-4 justify-center lg:justify-start">
              <a href="#" className="hover:opacity-80 transition-opacity">
                <img src={googlePlayBadge} alt="Get it on Google Play" className="h-14" />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity">
                <img src={appStoreBadge} alt="Download on the App Store" className="h-14" />
              </a>
            </div>
          </motion.div>

          {/* Phone Screenshot */}
          <motion.div
            className="flex-1 flex justify-center lg:justify-end"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <img
              src={phoneMockupSrc}
              alt="Wick App Screenshot"
              className="w-80 md:w-96 lg:w-[600px] h-auto drop-shadow-2xl translate-y-16"
            />
          </motion.div>
        </div>
      </section>

      {/* Dark Purple Container - wraps all content below hero */}
      <div className="mx-4 md:mx-8 lg:mx-12 bg-card-dark rounded-[2rem] relative z-20">
        {/* Feature Cards Section */}
        <section className="relative py-20">
          <div className="container mx-auto px-6">
          {/* Feature Cards Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Get and Stay on Track */}
            <motion.div
              className="bg-card-dark border border-border-accent rounded-3xl p-8 text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="font-heading text-3xl text-white mb-4">
                Get and Stay on Track
              </h3>
              <p className="font-body text-white/80 text-lg">
                Wick helps you learn to plan and organize while reminding you of everything.
                Sync your Canvas, and calendars and never miss an assignment!
              </p>
            </motion.div>

            {/* Find your Activities */}
            <motion.div
              className="bg-card-dark border border-border-accent rounded-3xl p-8 text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h3 className="font-heading text-3xl text-white mb-4">
                Find your Activities and Communities
              </h3>
              <p className="font-body text-white/80 text-lg">
                Subscribe to your interests, sports, clubs, and departments to never miss
                an important event, and find new communities to be apart of!
              </p>
            </motion.div>

            {/* Free Early Access */}
            <motion.div
              className="bg-card-dark border border-border-accent rounded-3xl p-8 text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="font-heading text-3xl text-white mb-4">
                Free Early Access
              </h3>
              <p className="font-body text-white/80 text-lg">
                We're trying to make this the best product ever for students. All we ask
                is you use it a lot, and tell us what you like (or don't like!)
              </p>
            </motion.div>
          </div>
          </div>
        </section>

        {/* App Showcase Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* App Screenshot */}
            <motion.div
              className="flex-1"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <img
                src={appScreenshotSrc}
                alt="Wick App Screenshot"
                className="w-full max-w-2xl mx-auto rounded-3xl shadow-2xl"
              />
            </motion.div>

            {/* Feature Descriptions */}
            <motion.div
              className="flex-1 space-y-12"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div>
                <h3 className="font-heading text-3xl text-white mb-4">
                  Personalize your experience
                </h3>
                <p className="font-body text-white/80 text-lg">
                  Find your clubs, sports, and other interests within Wick to keep track of
                  everything, all in one place. Subscribe to automatically have events in your
                  calendar, so you never miss a meeting or the big game.
                </p>
              </div>

              <div>
                <h3 className="font-heading text-3xl text-white mb-4">
                  You are always in control
                </h3>
                <p className="font-body text-white/80 text-lg">
                  Wick offers personalized guidance and reminders to help you plan what you
                  need to do. You're always in control, don't like a suggestion? Change it!
                  It's like having a 24/7 coach keeping you on top of everything.
                </p>
              </div>

              <div>
                <h3 className="font-heading text-3xl text-white mb-4">
                  Planning your days & weeks
                </h3>
                <p className="font-body text-white/80 text-lg">
                  Wick helps you break down big tasks into manageable steps, set priorities,
                  and keep deadlines in check. No more feeling overwhelmed over what to do
                  and when to do it.
                </p>
              </div>

              <a
                href="https://max.maximallearning.com/auth/signup?uni=uw.edu"
                className="inline-block bg-accent-gold text-card-dark font-button font-bold text-xl px-8 py-4 rounded-lg hover:opacity-90 transition-opacity"
              >
                Get Early Access
              </a>
            </motion.div>
          </div>
          </div>
        </section>

        {/* Wick Helps With Section */}
        <section className="relative py-12 -mb-40">
          <div className="container mx-auto px-6">
          <motion.div
            className="bg-[#462A96] rounded-[50px] p-12 max-w-5xl mx-auto translate-y-40"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex flex-col md:flex-row gap-12 items-start">
              {/* Title */}
              <h2 className="font-heading text-3xl md:text-4xl text-white md:w-48 flex-shrink-0">
                Wick is designed
                <br />
                to help with
              </h2>

              {/* Two columns of items with icons */}
              <div className="flex-1 grid grid-cols-2 gap-x-12 gap-y-8">
                {[
                  { name: "Time Management", icon: "⏳" },
                  { name: "Project Planning", icon: "📋" },
                  { name: "Procrastination", icon: "🎮" },
                  { name: "Executive Functioning", icon: "🧠" },
                  { name: "Prioritization", icon: "🚩" },
                  { name: "Goal Setting", icon: "🎯" },
                  { name: "Collaboration", icon: "🤝" },
                  { name: "Self-Care", icon: "❤️" },
                ].map((item, index) => (
                  <motion.div
                    key={item.name}
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl">
                      {item.icon}
                    </div>
                    <span className="font-body font-bold text-white text-base">
                      {item.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
          </div>
        </section>
      </div>

      {/* CTA Section - on light purple background */}
      <section className="relative py-20 mt-32">
        <div className="container mx-auto px-6 text-center">
          <motion.h2
            className="font-heading text-3xl md:text-4xl text-white mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Get started today and discover what Wick can do for you.
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <a
              href="https://max.maximallearning.com/auth/signup?uni=uw.edu"
              className="inline-block bg-accent-gold text-card-dark font-button font-bold text-xl px-10 py-4 rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Early Access
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <div className="mx-4 md:mx-8 lg:mx-12">
        <footer className="bg-card-dark rounded-t-[2rem] py-12">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              {/* Branding */}
              <div className="space-y-4">
                <h3 className="font-body font-bold text-xl text-white">
                  Maximal Learning
                </h3>
                <p className="font-body text-white/70 max-w-xs">
                  Empowering every student to become a better learner.
                </p>
              </div>

              {/* Navigation */}
              <nav className="flex flex-col gap-4">
                <a href="#" className="font-nav font-bold text-white hover:text-white/80 transition-colors">
                  About Us
                </a>
                <a href="#" className="font-nav font-bold text-white hover:text-white/80 transition-colors">
                  Careers
                </a>
                <a href="#" className="font-nav font-bold text-white hover:text-white/80 transition-colors">
                  Blog
                </a>
                <a href="#" className="font-nav font-bold text-white hover:text-white/80 transition-colors">
                  Pricing
                </a>
              </nav>
            </div>

            <div className="mt-12 pt-8 border-t border-border">
              <p className="font-body text-white/60 text-sm text-right">
                Copyright @Maximal Learning 2024 All Rights Reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
