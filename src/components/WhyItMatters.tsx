import { motion } from "framer-motion";
import { GraduationCap, Target, Users, TrendingUp, ShieldCheck, Heart } from "lucide-react";

export const WhyItMatters = () => {
  return (
    <section className="px-4 md:container py-16 md:py-32 relative overflow-hidden group/section">
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 90, 0],
          opacity: [0.03, 0.06, 0.03]
        }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] border border-primary/20 rounded-full pointer-events-none"
      />

      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-[0.6em] text-primary">
              <Heart className="h-4 w-4" /> OUR MISSION · SDG 4
            </div>
            <h2 className="speak-serif text-4xl md:text-7xl tracking-tighter leading-[0.9]">
              Education is the <br />
              <span className="text-primary italic">great equalizer.</span>
            </h2>
            <p className="text-lg md:text-xl font-medium opacity-50 leading-relaxed max-w-xl">
              Communication skills are the #1 predictor of social mobility — yet they're the least taught in schools. SpeakBold changes the math.
            </p>
            
            <div className="space-y-6 pt-4">
              {[
                { 
                  icon: Target, 
                  title: "Closing the opportunity gap", 
                  desc: "We provide the high-level coaching usually reserved for elite private schools to every learner, for free." 
                },
                { 
                  icon: Users, 
                  title: "Inclusive by design", 
                  desc: "Built to work on any device, anywhere. Whether you're in a city or a remote village, you have a coach." 
                },
                { 
                  icon: GraduationCap, 
                  title: "Measurable mastery", 
                  desc: "Every drill is AI-verified. Learners don't just 'practice' — they master specific, documented skills." 
                }
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  whileHover={{ x: 10 }}
                  className="flex gap-6 group cursor-default"
                >
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 group-hover:bg-primary group-hover:text-white">
                    <item.icon className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="speak-serif text-xl font-bold italic group-hover:text-primary transition-colors">{item.title}</h4>
                    <p className="text-sm font-medium opacity-40 leading-relaxed group-hover:opacity-70 transition-opacity">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2 }}
            className="relative"
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.15, 0.25, 0.15]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-primary/20 rounded-[4rem] blur-[100px] pointer-events-none" 
            />
            <div className="relative bg-muted/5 border border-border/60 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-20 shadow-soft overflow-hidden text-center space-y-8 md:space-y-12 backdrop-blur-sm group/card hover:border-primary/40 transition-all duration-700">
               <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-primary">THE SDG 4 CHALLENGE</p>
                  <blockquote className="speak-serif text-3xl md:text-4xl italic leading-tight tracking-tight group-hover:scale-[1.02] transition-transform duration-700">
                    "By 2030, ensure all learners acquire the knowledge and skills needed to promote sustainable development..."
                  </blockquote>
                  <p className="text-xs font-black uppercase tracking-widest opacity-30">— UN SUSTAINABLE DEVELOPMENT GOALS</p>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="p-8 rounded-[2rem] bg-primary/5 border border-primary/20 space-y-2 group/stat"
                  >
                    <p className="speak-serif text-4xl font-bold italic text-primary group-hover/stat:scale-110 transition-transform">100%</p>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">FREE ACCESS</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="p-8 rounded-[2rem] bg-primary/5 border border-primary/20 space-y-2 group/stat"
                  >
                    <p className="speak-serif text-4xl font-bold italic text-primary group-hover/stat:scale-110 transition-transform">24/7</p>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">AI COACHING</p>
                  </motion.div>
               </div>

               <div className="flex items-center gap-6 justify-center pt-8 opacity-20 group-hover/card:opacity-100 transition-opacity">
                  <ShieldCheck className="h-6 w-6 text-primary animate-pulse" />
                  <p className="text-xs font-black uppercase tracking-[0.5em]">SYSTEM VERIFIED FOR GLOBAL IMPACT</p>
               </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
