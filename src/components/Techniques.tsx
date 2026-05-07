import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const TECHNIQUES = [
  {
    n: "01",
    title: "Breathe low, breathe slow",
    body: "Three diaphragm breaths before you speak. It drops your pitch, steadies your hands, and tells your brain you're safe.",
  },
  {
    n: "02",
    title: "Plant your feet",
    body: "Hip-width apart, weight even. Pacing reads as nerves; stillness reads as authority. Move only with intention.",
  },
  {
    n: "03",
    title: "End on the period",
    body: "Most filler words live where sentences should end. Hit the period, take a breath, then start the next thought.",
  },
  {
    n: "04",
    title: "Look in fours",
    body: "Hold eye contact for one full thought, then move. Four people, four thoughts. The whole room feels seen.",
  },
  {
    n: "05",
    title: "Use the STAR frame",
    body: "Situation, Task, Action, Result. Interview answers stop rambling the moment you give them shape.",
  },
  {
    n: "06",
    title: "Open palms win trust",
    body: "Gestures above the waist with palms visible signal honesty. Pockets and crossed arms close the room.",
  },
];

export const Techniques = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50, damping: 15 } }
  };

  return (
    <section id="techniques" className="border-t border-border/60 bg-secondary text-secondary-foreground" ref={ref}>
      <div className="container py-32 md:py-60">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mb-32"
        >
          <div className="text-xs font-bold uppercase tracking-[0.4em] mb-12 opacity-40">
            PRINCIPLES OF AUTHORITY
          </div>
          <h2 className="speak-serif text-5xl md:text-8xl leading-[0.9]">
            Small techniques. <br />
            <span className="text-primary italic">Outsized</span> presence.
          </h2>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-2 gap-x-20 gap-y-32"
        >
          {TECHNIQUES.map((t, i) => (
            <motion.div
              key={t.n}
              variants={itemVariants}
              className="group"
            >
              <div className="flex items-start gap-10">
                <span className="speak-serif text-3xl md:text-5xl text-primary opacity-40 shrink-0">
                  {t.n}
                </span>
                <div className="space-y-6">
                  <h3 className="speak-serif text-3xl md:text-4xl group-hover:text-primary transition-colors duration-500">
                    {t.title}
                  </h3>
                  <p className="text-lg font-medium tracking-tight opacity-40 leading-relaxed group-hover:opacity-60 transition-opacity">
                    {t.body}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
