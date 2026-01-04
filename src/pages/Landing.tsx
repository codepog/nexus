import { motion } from "framer-motion";
import { 
  Hourglass, 
  ListTodo, 
  Gamepad2, 
  SlidersHorizontal, 
  Flag, 
  Trophy, 
  Handshake, 
  Heart,
  Linkedin,
  MessageCircle,
  Twitter,
  Infinity
} from "lucide-react";

// Import assets
import mainPageScreenshotSrc from "@/assets/main_page_screenshot.png";
import eventsPageScreenshotSrc from "@/assets/events_page_screenshot.png";
import chatbotScreenshotSrc from "@/assets/chatbot_screenshot.png";
import phoneMockupSrc from "@/assets/phone-mockup.png";
import googlePlayBadge from "@/assets/google-play-badge.png";
import appStoreBadge from "@/assets/app-store-badge.png";

const Landing = () => {
  return (
    <div className="min-h-screen text-foreground relative overflow-x-hidden bg-primary">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-visible">
        {/* Background */}
        <div className="absolute inset-0 bg-primary" />

        {/* Hero Content */}
        <div className="relative z-10 w-full px-4 md:px-8 lg:px-12 py-12 md:py-20">
        <div className="mx-auto max-w-6xl flex flex-col lg:flex-row items-center gap-8 md:gap-12">
          {/* Text Content */}
          <motion.div
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-heading text-4xl md:text-6xl lg:text-8xl text-white leading-tight mb-4 md:mb-6">
              Hi Huskies,
              <br />
              I'm Wick.
            </h1>
            <p className="font-body text-lg md:text-xl lg:text-2xl text-white/90 mb-6 md:mb-8 max-w-xl mx-auto lg:mx-0">
              I'll help you plan your assignments and activities so you stay on track.
            </p>

            {/* Get Early Access Button */}
            <a
              href="https://max.maximallearning.com/auth/signup?uni=uw.edu"
              className="inline-block bg-accent-gold text-card-dark font-button font-bold text-lg md:text-xl px-6 md:px-8 py-3 md:py-4 rounded-lg hover:opacity-90 transition-opacity mb-6 md:mb-8"
            >
              Get Early Access
            </a>

            {/* App Store Badges */}
            <div className="flex flex-wrap gap-3 md:gap-4 justify-center lg:justify-start">
              <a href="#" className="hover:opacity-80 transition-opacity">
                <img src={googlePlayBadge} alt="Get it on Google Play" className="h-10 md:h-14" />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity">
                <img src={appStoreBadge} alt="Download on the App Store" className="h-10 md:h-14" />
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
              className="w-64 md:w-80 lg:w-[500px] h-auto drop-shadow-2xl translate-y-8 md:translate-y-16"
            />
          </motion.div>
        </div>
        </div>
      </section>

      {/* Dark Purple Container - wraps all content below hero */}
      <div className="px-4 md:px-8 lg:px-12">
      <div className="mx-auto bg-card-dark rounded-[2rem] relative z-20 pb-40 md:pb-48 max-w-6xl">
        {/* Feature Cards Section */}
        <section className="relative py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Get and Stay on Track */}
            <motion.div
              className="text-center px-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-5xl mb-6 block">✅</span>
              <h3 className="font-heading text-2xl md:text-3xl text-white mb-4">
                Get and Stay on Track
              </h3>
              <p className="font-body text-white/80 text-lg">
                Wick helps you learn to plan and organize while reminding you of everything.
                Sync your Canvas, and calendars and never miss an assignment!
              </p>
            </motion.div>

            {/* Find your Activities */}
            <motion.div
              className="text-center px-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="text-5xl mb-6 block">📅</span>
              <h3 className="font-heading text-2xl md:text-3xl text-white mb-4">
                Find your Activities and Communities
              </h3>
              <p className="font-body text-white/80 text-lg">
                Subscribe to your interests, sports, clubs, and departments to never miss
                an important event, and find new communities to be apart of!
              </p>
            </motion.div>

            {/* Free Early Access */}
            <motion.div
              className="text-center px-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <span className="text-5xl mb-6 block">💸</span>
              <h3 className="font-heading text-2xl md:text-3xl text-white mb-4">
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

        {/* App Screenshot - Full Width */}
        <div className="px-4 md:px-6">
          <motion.img
            src={mainPageScreenshotSrc}
            alt="Wick App Screenshot"
            className="w-full rounded-2xl md:rounded-3xl"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          />
        </div>

        {/* Feature Descriptions Section with Screenshots */}
        <section className="relative py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            {/* Desktop: Two columns (images left, text right) */}
            {/* Mobile: Text first, then images below */}
            <div className="flex flex-col-reverse lg:flex-row gap-8 md:gap-12 items-start">
              {/* Screenshots - Shows second on mobile (due to flex-col-reverse), left on desktop */}
              <motion.div 
                className="flex-1 w-full lg:w-auto"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                {/* Mobile: Stacked vertically smaller, Desktop: Overlapping */}
                <div className="flex flex-col gap-4 lg:relative lg:min-h-[500px]">
                  {/* Events Page Screenshot */}
                  <img
                    src={eventsPageScreenshotSrc}
                    alt="Events Page Screenshot"
                    className="w-[80%] mx-auto lg:mx-0 lg:absolute lg:top-0 lg:right-0 lg:w-[65%] rounded-xl md:rounded-2xl shadow-2xl lg:z-10"
                  />
                  {/* Chatbot Screenshot */}
                  <img
                    src={chatbotScreenshotSrc}
                    alt="Chatbot Screenshot"
                    className="w-[70%] mx-auto lg:mx-0 lg:absolute lg:top-[180px] lg:left-0 lg:w-[55%] rounded-xl md:rounded-2xl shadow-2xl lg:z-20"
                  />
                </div>
              </motion.div>

              {/* Text Descriptions - Shows first on mobile, right on desktop */}
              <motion.div 
                className="flex-1 space-y-8 md:space-y-10"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div>
                  <h3 className="font-heading text-2xl md:text-3xl text-white mb-3 md:mb-4">
                    Personalize your experience
                  </h3>
                  <p className="font-body text-white/80 text-base md:text-lg">
                    Find your clubs, sports, and other interests within Wick to keep track of
                    everything, all in one place. Subscribe to automatically have events in your
                    calendar, so you never miss a meeting or the big game.
                  </p>
                </div>

                <div>
                  <h3 className="font-heading text-2xl md:text-3xl text-white mb-3 md:mb-4">
                    You are always in control
                  </h3>
                  <p className="font-body text-white/80 text-base md:text-lg">
                    Wick offers personalized guidance and reminders to help you plan what you
                    need to do. You're always in control, don't like a suggestion? Change it!
                    It's like having a 24/7 coach keeping you on top of everything.
                  </p>
                </div>

                <div>
                  <h3 className="font-heading text-2xl md:text-3xl text-white mb-3 md:mb-4">
                    Planning your days & weeks
                  </h3>
                  <p className="font-body text-white/80 text-base md:text-lg">
                    Wick helps you break down big tasks into manageable steps, set priorities,
                    and keep deadlines in check. No more feeling overwhelmed over what to do
                    and when to do it.
                  </p>
                </div>

                <a
                  href="https://max.maximallearning.com/auth/signup?uni=uw.edu"
                  className="inline-block bg-accent-gold text-card-dark font-button font-bold text-lg md:text-xl px-6 md:px-8 py-3 md:py-4 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Get Early Access
                </a>
              </motion.div>
            </div>
          </div>
        </section>

      </div>
      </div>

      {/* Wick Helps With Section - positioned to overlap containers */}
      <div className="px-6 md:px-8 lg:px-12 relative z-30 -mt-32 md:-mt-48 mb-8">
      <div className="mx-4 md:mx-auto max-w-4xl">
        <motion.div
          className="bg-[#462A96] rounded-2xl md:rounded-[50px] p-5 md:p-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-start">
            {/* Title */}
            <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl text-white md:w-48 flex-shrink-0">
              Wick is designed
              <br />
              to help with
            </h2>

            {/* Grid of items with icons */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-x-12 md:gap-y-8 w-full">
              {[
                { name: "Time Management", icon: Hourglass },
                { name: "Project Planning", icon: ListTodo },
                { name: "Procrastination", icon: Gamepad2 },
                { name: "Executive Functioning", icon: SlidersHorizontal },
                { name: "Prioritization", icon: Flag },
                { name: "Goal Setting", icon: Trophy },
                { name: "Collaboration", icon: Handshake },
                { name: "Self-Care", icon: Heart },
              ].map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <motion.div
                    key={item.name}
                    className="flex items-center gap-3 md:gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-4 h-4 md:w-5 md:h-5 text-[#462A96]" strokeWidth={2} />
                    </div>
                    <span className="font-body font-bold text-white text-sm md:text-base">
                      {item.name}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
      </div>

      {/* CTA Section - on light purple background */}
      <section className="relative py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <motion.h2
            className="font-heading text-2xl md:text-3xl lg:text-4xl text-white mb-6 md:mb-8 max-w-2xl mx-auto"
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
              className="inline-block bg-accent-gold text-card-dark font-button font-bold text-lg md:text-xl px-8 md:px-10 py-3 md:py-4 rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Early Access
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <div className="px-4 md:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <footer className="bg-card-dark rounded-t-[2rem] py-8 md:py-12 px-6 md:px-12">
          {/* Main Footer Content */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 md:gap-12">
            {/* Branding Column */}
            <div className="space-y-4">
              <h3 className="font-body font-bold text-lg text-white underline underline-offset-4">
                Maximal Learning
              </h3>
              <p className="font-body text-white/70 text-sm max-w-[200px]">
                Empowering every student to become a better learner.
              </p>
              {/* Social Icons */}
              <div className="flex gap-4 pt-2">
                <a href="#" className="text-white hover:text-white/80 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="text-white hover:text-white/80 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </a>
                <a href="#" className="text-white hover:text-white/80 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-white hover:text-white/80 transition-colors">
                  <Infinity className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Navigation Column */}
            <nav className="flex flex-col gap-2 text-left">
              <a href="#" className="font-body text-white hover:text-white/80 transition-colors text-sm">
                About Us
              </a>
              <a href="#" className="font-body text-white hover:text-white/80 transition-colors text-sm">
                Careers
              </a>
              <a href="#" className="font-body text-white hover:text-white/80 transition-colors text-sm">
                Blog
              </a>
              <a href="#" className="font-body text-white hover:text-white/80 transition-colors text-sm">
                Pricing
              </a>
            </nav>

            {/* Copyright - Right aligned on desktop */}
            <div className="md:ml-auto">
              <p className="font-body text-white/60 text-sm">
                Copyright @Maximal Learning 2024 All Rights Reserved.
              </p>
            </div>
          </div>
        </footer>
        
        {/* Dark Bottom Bar */}
        <div className="bg-[#1a1a2e] h-8 rounded-b-lg" />
      </div>
      </div>
    </div>
  );
};

export default Landing;
