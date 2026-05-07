import { useState } from "react";
import { TrackShell } from "@/components/TrackShell";
import { RecorderPanel } from "@/components/RecorderPanel";
import { RecordingsList } from "@/components/RecordingsList";
import { Camera, Check, AlertTriangle, Target, Zap, ShieldCheck, Microscope, ChevronRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const POSTURE_CHECK = [
  "Feet shoulder-width apart, weight even on both legs.",
  "Knees soft — never locked.",
  "Shoulders down and back, chest open.",
  "Chin level with the floor — not raised, not tucked.",
  "Hands visible, ready to gesture.",
  "Eyes scanning in 3-second holds.",
];

const GESTURES = [
  {
    name: "The Container",
    use: "DEFINING BOUNDARIES",
    how: "Hands shoulder-width apart, palms facing each other, as if holding a box.",
    mistake: "Hands too close together — looks like you're holding something tiny.",
    drill: "Say: 'There are three points I want to make.' Use the container for each point.",
  },
  {
    name: "The Reveal",
    use: "INTRODUCING CONCEPTS",
    how: "One hand opens outward from your chest, palm up, ending shoulder-height.",
    mistake: "Palm faces down — looks like you're pushing something away.",
    drill: "Say: 'And that's when it hit me.' Open your hand on 'hit.'",
  },
  {
    name: "The List",
    use: "SEQUENTIAL PRECISION",
    how: "Touch your thumb to each finger as you say each item. Don't wave the whole hand.",
    mistake: "Whole hand waving — looks like you're conducting an orchestra.",
    drill: "Say: 'I have three priorities: speed, quality, and safety.' Touch fingers on each.",
  },
  {
    name: "The Pause-Down",
    use: "LANDING FINALITY",
    how: "Lower both hands slowly to your sides as you say the line. Then hold still.",
    mistake: "Hands stop halfway — looks like you're giving up, not landing.",
    drill: "Say: 'This is the only number that matters.' Lower hands on 'matters.'",
  },
];

const BodyLanguage = () => {
  const [checked, setChecked] = useState<boolean[]>(POSTURE_CHECK.map(() => false));
  const [activeGesture, setActiveGesture] = useState<number | null>(null);

  return (
    <TrackShell
      eyebrow="MODULE 04 — KINETICS"
      title={<>Stand like the room is <span className="text-primary italic">already yours.</span></>}
      intro="Your body speaks before you do. Master the foundational posture and the four core gestures that project authority."
    >
      {/* Background Decorative Drifting Glow */}
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/5 rounded-full blur-[150px] animate-float opacity-30 pointer-events-none" />

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8 lg:gap-16 relative z-10">
        <div className="space-y-8 md:space-y-16 min-w-0">
          <div className="bg-muted/5 border border-border/60 rounded-2xl md:rounded-[4rem] p-6 md:p-12 lg:p-20 shadow-soft relative overflow-hidden group">
           <div className="grain pointer-events-none" />
           <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.4em] text-primary">
                 <Camera className="h-4 w-4" />
                 ALIGNMENT PROTOCOL
              </div>
              <h2 className="speak-serif text-2xl md:text-4xl lg:text-5xl leading-[1.1] tracking-tighter max-w-lg">The Physics of Authority</h2>
              <p className="text-sm font-medium opacity-40 max-w-sm">Run through each line in front of a mirror or camera. Check off once aligned.</p>
           </div>

           <ul className="space-y-4 relative z-10">
              {POSTURE_CHECK.map((p, i) => (
                <li key={i}>
                  <button
                    onClick={() => {
                      const next = [...checked];
                      next[i] = !next[i];
                      setChecked(next);
                    }}
                    className={cn(
                      "w-full flex items-center gap-6 p-6 rounded-[1.5rem] border transition-all duration-500 text-left group",
                      checked[i] ? "bg-primary/[0.03] border-primary/40" : "bg-background/50 border-border/60 hover:border-primary/20"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 shrink-0",
                      checked[i] ? "bg-primary border-primary text-white" : "border-border/60 text-transparent group-hover:border-primary/30"
                    )}>
                      <Check className="h-4 w-4" />
                    </div>
                    <span className={cn(
                      "text-sm font-medium tracking-tight transition-all duration-500",
                      checked[i] ? "opacity-20 line-through" : "opacity-70 group-hover:opacity-100"
                    )}>{p}</span>
                  </button>
                </li>
              ))}
           </ul>
        </div>
        </div>

        <div className="space-y-12">
           {/* Eye Contact Rule */}
           <div className="p-5 md:p-8 rounded-2xl md:rounded-[3rem] bg-muted/5 border border-border/60 space-y-4 hover:border-primary/30 transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5">
                 <Eye className="h-20 w-20" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.4em] text-primary">STRATEGIC FOCUS</p>
              <h3 className="speak-serif text-3xl italic">The 3-Second Rule</h3>
              <p className="text-sm font-medium opacity-50 leading-relaxed">
                Pick three points in the room: left, centre, right. Hold each for 3–5 seconds. Move only on punctuation. If nervous, focus on the forehead.
              </p>
           </div>

           {/* Gestures Grid */}
           <div className="space-y-8">
              <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] opacity-40">
                 <Zap className="h-3 w-3" />
                 GESTURE REPO
              </div>
              <div className="grid gap-4">
                 {GESTURES.map((g, i) => (
                   <motion.div
                    key={i}
                    layout
                    className={cn(
                      "border rounded-2xl md:rounded-[3rem] overflow-hidden transition-all duration-500",
                      activeGesture === i ? "bg-primary/[0.03] border-primary/40 shadow-glow" : "bg-muted/5 border-border/60 hover:border-primary/20"
                    )}
                   >
                      <button
                        onClick={() => setActiveGesture(activeGesture === i ? null : i)}
                        className="w-full p-8 text-left flex items-center justify-between"
                      >
                         <div className="space-y-2">
                            <p className="text-[11px] font-black uppercase tracking-widest text-primary opacity-60">{g.use}</p>
                            <h3 className="speak-serif text-xl md:text-2xl">{g.name}</h3>
                         </div>
                         <ChevronRight className={cn(
                           "h-6 w-6 transition-transform duration-500",
                           activeGesture === i ? "rotate-90 text-primary" : "opacity-20"
                         )} />
                      </button>
                      <AnimatePresence>
                         {activeGesture === i && (
                           <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-8 pb-8 space-y-6"
                           >
                              <div className="p-4 md:p-6 rounded-xl md:rounded-[2rem] bg-background/50 border border-border/60 space-y-2">
                                 <p className="text-[11px] font-black uppercase tracking-widest opacity-40">EXECUTION</p>
                                 <p className="text-sm font-medium opacity-70 leading-relaxed">{g.how}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-destructive">MISTAKE</p>
                                    <p className="text-xs font-medium opacity-50">{g.mistake}</p>
                                 </div>
                                 <div className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-primary">DRILL</p>
                                    <p className="text-xs font-medium opacity-50">{g.drill}</p>
                                 </div>
                              </div>
                           </motion.div>
                         )}
                      </AnimatePresence>
                   </motion.div>
                 ))}
              </div>
           </div>
        </div>

        {/* Recorder Panel */}
        <div className="lg:col-span-2 min-w-0">
           <div className="p-5 md:p-12 rounded-2xl md:rounded-[4rem] bg-muted/5 border border-border/60 space-y-8 md:space-y-12 relative overflow-hidden shadow-soft">
              <div className="grain pointer-events-none" />
              <div className="space-y-4 text-center max-w-lg mx-auto">
                 <div className="flex justify-center gap-3 text-xs font-black uppercase tracking-[0.5em] text-primary">
                    <Microscope className="h-4 w-4" />
                    KINETIC AUDIT
                 </div>
                 <h2 className="speak-serif text-2xl md:text-5xl">Capture & Review</h2>
                 <p className="text-sm font-medium opacity-40 leading-relaxed">
                   Record a 60-second freestyle session. Watch it back with the sound OFF. Focus purely on your silhouette and hands.
                 </p>
              </div>

              <RecorderPanel 
                label="SILENT PERFORMANCE AUDIT"
                hint="Capture your movement. Sound is optional. Focus on kinetic clarity."
              />

              <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.5em] opacity-20 justify-center">
                 <ShieldCheck className="h-3 w-3" />
                 SECURE VISUAL STREAM
              </div>
           </div>
           <div className="mt-8">
             <RecordingsList />
           </div>
        </div>
      </div>
    </TrackShell>
  );
};

export default BodyLanguage;
