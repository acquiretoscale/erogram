'use client';

import { motion } from 'framer-motion';

export default function FAQSection() {
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  };

  return (
    <motion.div
      variants={fadeInUp}
      className="mt-20 sm:mt-40 max-w-4xl mx-auto px-4"
    >
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 sm:mb-16 text-[#f5f5f5]">
        Frequently Asked <span className="gradient-text">Questions</span>
      </h2>
      <div className="space-y-6">
        {[
          {
            question: "What is Erogram?",
            answer: "Erogram is the ultimate directory for discovering NSFW Telegram groups and communities. We curate and verify adult-oriented groups to help you find like-minded people and communities that match your interests."
          },
          {
            question: "Are all groups safe and moderated?",
            answer: "Yes, we take safety seriously. All groups listed on Erogram are verified and moderated to ensure they meet our community standards. We regularly review groups to maintain a safe environment for all users."
          },
          {
            question: "How do I join a Telegram group?",
            answer: "Simply click on any group card and follow the Telegram link. You'll be redirected to Telegram where you can join the group instantly. Make sure you have the Telegram app installed for the best experience."
          },
          {
            question: "Is Erogram free to use?",
            answer: "Yes, Erogram is completely free to use. We don't charge for browsing groups, joining communities, or accessing our content. Our service is supported through partnerships and donations."
          },
          {
            question: "How often are new groups added?",
            answer: "We add fresh groups daily from our community submissions. Our team reviews and approves new groups regularly to ensure quality and relevance. Check back often for the latest additions!"
          },
          {
            question: "Can I submit my own group?",
            answer: "Yes! You can submit your own group using the 'Add' button in the navigation bar. Fill out the form with your group details, and our team will review and approve it. Once approved, your group will be visible to all users on our platform."
          }
        ].map((faq, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="glass rounded-2xl p-6 hover-glow"
          >
            <h3 className="text-lg sm:text-xl font-bold mb-3 text-[#f5f5f5]">
              {faq.question}
            </h3>
            <p className="text-[#999] text-sm sm:text-base leading-relaxed">
              {faq.answer}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}