import { motion } from "framer-motion";
import { GraduationCap, Target, Users, TrendingUp, ShieldCheck, Heart } from "lucide-react";

export const WhyItMatters = () => {
  return (
    <section className="px-4 md:container py-32 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          
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
            <h2 className="speak-serif text-5xl md:text-7xl tracking-tighter leading-[0.9]">
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
                <div key={i} className="flex gap-6 group">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="speak-serif text-xl font-bold italic">{item.title}</h4>
                    <p className="text-sm font-medium opacity-40 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
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
            <div className="absolute inset-0 bg-primary/20 rounded-[4rem] blur-[100px] animate-pulse" />
            <div className="relative bg-muted/5 border border-border/60 rounded-[4rem] p-12 md:p-20 shadow-soft overflow-hidden text-center space-y-12">
               <div className="grain pointer-events-none" />
               <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-primary">THE SD4 CHALLENGE</p>
                  <blockquote className="speak-serif text-3xl md:text-4xl italic leading-tight tracking-tight">
                    "By 2030, ensure all learners acquire the knowledge and skills needed to promote sustainable development..."
                  </blockquote>
                  <p className="text-xs font-black uppercase tracking-widest opacity-30">— UN SUSTAINABLE DEVELOPMENT GOALS</p>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-8 rounded-[2rem] bg-primary/5 border border-primary/20 space-y-2">
                    <p className="speak-serif text-4xl font-bold italic text-primary">100%</p>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">FREE ACCESS</p>
                  </div>
                  <div className="p-8 rounded-[2rem] bg-primary/5 border border-primary/20 space-y-2">
                    <p className="speak-serif text-4xl font-bold italic text-primary">24/7</p>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">AI COACHING</p>
                  </div>
               </div>

               <div className="flex items-center gap-6 justify-center pt-8 opacity-20 group hover:opacity-100 transition-opacity">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  <p className="text-xs font-black uppercase tracking-[0.5em]">SYSTEM VERIFIED FOR GLOBAL IMPACT</p>
               </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
