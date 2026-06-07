import { useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathway, ALL_LESSONS } from "@/hooks/usePathway";
import { useMyXp } from "@/hooks/useLeaderboard";
import { SiteHeader } from "@/components/SiteHeader";
import { motion } from "framer-motion";
import { Trophy, CheckCircle, Star, Calendar, Download, Printer, Award, Globe, Mic, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { GrowthReport } from "@/components/GrowthReport";

const ShieldCheck = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ProgressReport = () => {
  const { user } = useAuth();
  const { state, units, progressPercent, completedCount, totalLessons } = usePathway();
  const { xp } = useMyXp();
  const reportRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const unitMastery = units.map(u => {
      const unitLessons = u.lessons.map(l => l.id);
      const completed = state.completedLessons.filter(id => unitLessons.includes(id)).length;
      return {
        name: u.name,
        completed,
        total: u.lessons.length,
        percent: Math.round((completed / u.lessons.length) * 100)
      };
    });

    const highScores = Object.entries(state.testScores).map(([id, score]) => {
      const lesson = ALL_LESSONS.find(l => l.id === id);
      return { title: lesson?.title || "Test", score };
    });

    return { unitMastery, highScores };
  }, [units, state]);

  const handlePrint = () => {
    window.print();
  };

  if (!user) return null;

  const displayName = (user?.user_metadata as any)?.display_name ?? user?.email?.split("@")[0] ?? "Speaker";
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <main className="min-h-screen bg-background relative overflow-x-hidden print:bg-white">
      <div className="print:hidden">
        <SiteHeader />
      </div>

      <section className="container pt-32 md:pt-48 pb-24 relative z-10 max-w-4xl mx-auto">
        {/* Actions */}
        <div className="flex justify-between items-center mb-12 print:hidden">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1"
          >
            <p className="text-xs font-black uppercase tracking-[0.4em] text-primary">LEARNER CREDENTIALS</p>
            <h1 className="speak-serif text-4xl font-bold tracking-tighter">Your Progress <span className="text-primary italic">Report</span>.</h1>
          </motion.div>
          
          <div className="flex gap-4">
            <button 
              onClick={handlePrint}
              className="button-pill px-8 py-4 border border-border/60 hover:border-primary/40 transition-all flex items-center gap-3 group"
            >
              <Printer className="h-4 w-4 opacity-40 group-hover:opacity-100" />
              <span className="text-xs font-black uppercase tracking-widest">Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Certificate / Report Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          ref={reportRef}
          className="relative bg-muted/5 border border-border/60 rounded-[4rem] p-12 md:p-20 shadow-soft overflow-hidden print:shadow-none print:border-2 print:border-black print:rounded-none print:m-0 print:p-12"
        >
          
          {/* Watermark/Decor */}
          <div className="absolute top-[-10%] right-[-10%] opacity-[0.03] pointer-events-none print:hidden">
            <Award className="h-96 w-96" />
          </div>

          <div className="relative z-10 space-y-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-12 border-b border-border/60 pb-12 print:border-black">
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary print:text-black">
                  <Globe className="h-4 w-4" />
                  UN SDG 4 · QUALITY EDUCATION
                </div>
                <h2 className="speak-serif text-6xl md:text-8xl tracking-tighter leading-none print:text-black">
                  Speak<span className="text-primary italic print:text-black">Bold</span>.
                </h2>
                <p className="text-sm font-black uppercase tracking-[0.3em] opacity-40 print:text-black print:opacity-100">
                  OFFICIAL SKILLS TRANSCRIPT
                </p>
              </div>
              
              <div className="text-right space-y-2">
                <p className="text-xs font-black uppercase tracking-widest opacity-20 print:text-black">DATE ISSUED</p>
                <p className="text-xl font-bold tracking-tight print:text-black">{today}</p>
              </div>
            </div>

            {/* User Info */}
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest opacity-20 print:text-black">LEARNER NAME</p>
              <h3 className="speak-serif text-5xl md:text-7xl italic tracking-tighter text-primary print:text-black">{displayName}</h3>
            </div>

            {/* High Level Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: "TOTAL XP", value: xp.toLocaleString(), icon: Star },
                { label: "MASTERY", value: `${progressPercent}%`, icon: Trophy },
                { label: "LESSONS", value: `${completedCount}/${totalLessons}`, icon: CheckCircle },
                { label: "STATUS", value: progressPercent >= 100 ? "GRADUATE" : "ACTIVE", icon: Award },
              ].map((s, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-30 print:text-black">
                    <s.icon className="h-3 w-3" />
                    {s.label}
                  </div>
                  <p className="speak-serif text-3xl font-bold italic print:text-black">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Improvement delta — proof of learning (the demo money-shot). */}
            <div className="space-y-8">
               <p className="text-xs font-black uppercase tracking-[0.4em] opacity-30 border-b border-border/60 pb-4 print:text-black print:border-black">MEASURED IMPROVEMENT</p>
               <GrowthReport />
            </div>

            {/* Detailed Mastery */}
            <div className="space-y-8">
               <p className="text-xs font-black uppercase tracking-[0.4em] opacity-30 border-b border-border/60 pb-4 print:text-black print:border-black">UNIT PERFORMANCE BREAKDOWN</p>
               <div className="grid md:grid-cols-2 gap-12">
                 {stats.unitMastery.map((unit, i) => (
                   <div key={i} className="space-y-4">
                     <div className="flex justify-between items-end">
                       <h4 className="speak-serif text-2xl font-bold italic print:text-black">{unit.name}</h4>
                       <span className="text-xs font-black opacity-30 print:text-black">{unit.completed} / {unit.total} UNITS</span>
                     </div>
                     <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/60 print:border-black">
                        <div 
                          className="h-full bg-primary transition-all duration-1000 print:bg-black" 
                          style={{ width: `${unit.percent}%` }}
                        />
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            {/* AI Test Scores */}
            {stats.highScores.length > 0 && (
              <div className="space-y-8">
                <p className="text-xs font-black uppercase tracking-[0.4em] opacity-30 border-b border-border/60 pb-4 print:text-black print:border-black">AI-VERIFIED TEST SCORES</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {stats.highScores.map((h, i) => (
                    <div key={i} className="p-8 rounded-[2rem] border border-border/60 bg-muted/5 print:border-black print:bg-white">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-2 print:text-black">{h.title}</p>
                      <p className="speak-serif text-4xl font-bold italic text-primary print:text-black">{h.score}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-16 border-t border-border/60 flex flex-col md:flex-row justify-between items-center gap-12 print:border-black">
              <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.4em] opacity-20 print:text-black">
                <ShieldCheck className="h-4 w-4" />
                VERIFIED BY SPEAKBOLD AI COACHING ENGINE
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-10 print:text-black">CREDENTIAL ID</p>
                <p className="text-[10px] font-mono opacity-20 print:text-black">{user.id.slice(0, 8).toUpperCase()}-{Date.now().toString(36).toUpperCase()}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Closing Note */}
        <div className="mt-12 text-center space-y-6 print:hidden">
          <p className="text-sm font-medium opacity-40 italic">
            "Communication is the primary driver of social mobility."
          </p>
          <div className="h-10 w-[1px] bg-gradient-to-b from-primary/20 to-transparent mx-auto" />
        </div>
      </section>
    </main>
  );
};


export default ProgressReport;
