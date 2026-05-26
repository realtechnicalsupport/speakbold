import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/hooks/useEvents";
import { useDailyPracticePlan } from "@/hooks/useDailyPracticePlan";
import { usePracticePlan } from "@/hooks/usePracticePlan";
import { AIPlanGenerator, PlanAnswers } from "@/components/AIPlanGenerator";
import { PracticeModal } from "@/components/PracticeModal";
import { ArrowLeft, Clock, MapPin, Trash2, Play, ArchiveRestore, CheckCircle2, Circle, CalendarDays, Sparkles, Target, Zap, ArrowRight, ShieldCheck, Microscope, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const EVENT_ICONS: Record<string, string> = {
  interview: "💼",
  presentation: "📊",
  conference: "🎤",
  wedding: "💍",
  other: "📅",
};

const EVENT_LABELS: Record<string, string> = {
  interview: "Job Interview",
  presentation: "Presentation",
  conference: "Conference Talk",
  wedding: "Wedding Speech",
  other: "Other Event",
};

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { events, deleteEvent, archiveEvent } = useEvents();
  const [event, setEvent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"plan" | "overview">("plan");
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`speakbold:completed-${id}`);
      if (saved) setCompletedDays(new Set(JSON.parse(saved)));
    }
  }, [id]);

  const [urlParams] = useState(new URLSearchParams(window.location.search));
  const [showAIGenerator, setShowAIGenerator] = useState(urlParams.get("generatePlan") === "true");
  const [practiceActivity, setPracticeActivity] = useState<any>(null);

  const { plan: defaultPlan, loading: planLoading, minutesPerDay, daysLeft } = useDailyPracticePlan(id);
  const { plan: aiPlan, generatePlan, loadPlan } = usePracticePlan(id);
  
  const plan = aiPlan || defaultPlan;
  const todayDate = new Date().toISOString().split('T')[0];
  const todayPlan = plan?.days?.find(d => d.date === todayDate);

  useEffect(() => {
    if (id && user) loadPlan();
  }, [id, user, loadPlan]);

  const handleAIGenerate = async (answers: PlanAnswers) => {
    const eventDate = event ? new Date(event.event_date) : new Date();
    const now = new Date();
    const daysUntil = event ? Math.max(1, Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 7;
    await generatePlan(event?.event_type || 'other', answers.focusAreas, daysUntil, answers.useCustomAI ? answers.customDescription : undefined);
    setActiveTab("plan");
    setShowAIGenerator(false);
    toast({ title: "Protocol Synthesized", description: "Your custom AI practice plan is live." });
  };

  useEffect(() => {
    if (!id) return;
    const found = events.find((e) => e.id === id);
    if (found) setEvent(found);
    else if (events.length) navigate("/events", { replace: true });
  }, [id, events, navigate]);

  if (!user) { navigate("/login", { replace: true }); return null; }

  if (!event) {
    return (
      <main className="min-h-screen bg-background pb-20 lg:pb-0">
        <SiteHeader />
        <div className="container py-60 text-center space-y-10">
          <div className="h-1.5 w-32 bg-muted rounded-full mx-auto overflow-hidden border border-border/60">
            <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="h-full w-1/2 bg-primary shadow-glow" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.5em] opacity-40 animate-pulse">RETRIEVING PROTOCOL...</p>
        </div>
        <MobileNav />
      </main>
    );
  }

  const eventDate = new Date(event.event_date);
  const now = new Date();
  const isPast = event.archived || eventDate <= now;
  const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const handleDelete = async () => {
    if (window.confirm("Permanently purge this event record?")) {
      await deleteEvent(event.id);
      toast({ title: "Record Purged" });
      navigate("/events");
    }
  };

  const handleArchive = async () => {
    await archiveEvent(event.id);
    toast({ title: "Record Archived" });
    navigate("/events");
  };

  const toggleDayComplete = (date: string) => {
    const newCompleted = new Set(completedDays);
    if (newCompleted.has(date)) newCompleted.delete(date);
    else newCompleted.add(date);
    setCompletedDays(newCompleted);
    if (id) localStorage.setItem(`speakbold:completed-${id}`, JSON.stringify([...newCompleted]));
  };

  const planDays = aiPlan?.days || defaultPlan || [];
  const completedCount = Array.isArray(planDays) ? planDays.filter((day: any) => completedDays.has(day.date)).length : 0;
  const progressPercent = Array.isArray(planDays) && planDays.length > 0 ? Math.round((completedCount / planDays.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <SiteHeader />
      
      {/* Background Motion */}
      <div className="absolute top-[10%] left-[-5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-float opacity-30 pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-accent/5 rounded-full blur-[130px] animate-float opacity-20 pointer-events-none" style={{ animationDelay: "-2s" }} />

      <section className="container pt-32 md:pt-48 pb-24">
        <div className="max-w-6xl mx-auto space-y-24">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Link to="/events" className="inline-flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] text-primary opacity-40 hover:opacity-100 transition-all mb-12">
              <ArrowLeft className="h-4 w-4" />
              BACK TO DEPLOYMENT LIST
            </Link>
          </motion.div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-16">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="flex-1 space-y-12">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-4xl shadow-glow shadow-primary/10 transition-all duration-700 hover:rotate-6">
                  {EVENT_ICONS[event.event_type]}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-[0.5em] text-primary">
                    {EVENT_LABELS[event.event_type].toUpperCase()} PROTOCOL
                  </p>
                  {event.archived && <span className="text-[11px] font-black bg-muted/30 px-3 py-1 rounded-full opacity-40 uppercase tracking-widest">ARCHIVED RECORD</span>}
                </div>
              </div>
              
              <h1 className="speak-serif text-5xl md:text-9xl leading-[0.8] text-foreground tracking-tighter">
                {event.title}
              </h1>

              <div className="flex flex-wrap items-center gap-10 text-xs font-black uppercase tracking-[0.3em] opacity-30">
                <span className="flex items-center gap-4">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-4">
                  <Clock className="h-4 w-4 text-primary" />
                  {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toUpperCase()}
                </span>
                {event.location && (
                  <span className="flex items-center gap-4">
                    <MapPin className="h-4 w-4 text-primary" />
                    {event.location.toUpperCase()}
                  </span>
                )}
              </div>
            </motion.div>

            <div className="flex items-center gap-4">
              {!event.archived && !isPast && (
                <button onClick={handleArchive} className="h-16 w-16 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted transition-all opacity-40 hover:opacity-100" title="Archive record">
                  <ArchiveRestore className="h-6 w-6" />
                </button>
              )}
              <button onClick={handleDelete} className="h-16 w-16 rounded-full border border-border/60 flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all opacity-40 hover:opacity-100" title="Purge record">
                <Trash2 className="h-6 w-6" />
              </button>
            </div>
          </div>

          {!isPast && !event.archived && (
            <div className="space-y-20">
              {/* Core Momentum Display */}
              <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-muted/5 border border-border/60 rounded-[4rem] p-12 md:p-20 space-y-16 relative overflow-hidden shadow-soft">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 relative z-10">
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] text-primary">
                        <Target className="h-4 w-4" />
                        MISSION READINESS
                      </div>
                      <div className="speak-serif text-5xl md:text-[8rem] leading-none tracking-tighter italic tabular-nums">
                        {daysUntil === 0 ? "LIVE" : daysUntil}
                        <span className="ml-6 text-xl md:text-2xl not-italic font-black opacity-20 uppercase tracking-[0.4em]">{daysUntil === 1 ? "DAY" : "DAYS"} TO GO</span>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                       <span className="speak-serif text-6xl md:text-7xl font-bold tabular-nums italic text-primary">{progressPercent}%</span>
                       <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40">PROTOCOL COMPLETED</p>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/60 relative">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 2, ease: "circOut" }} className="h-full bg-primary shadow-glow shadow-primary/40" />
                  </div>
                </motion.div>

                <div className="bg-primary shadow-glow shadow-primary/10 rounded-[4rem] p-12 md:p-16 text-white space-y-12 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-16 opacity-10 group-hover:opacity-20 transition-all duration-1000">
                      <Zap className="h-48 w-48" />
                   </div>
                   <div className="relative z-10 space-y-8">
                      <p className="text-xs font-black uppercase tracking-[0.6em] opacity-80">DAILY OBJECTIVE</p>
                      {todayPlan ? (
                        <>
                          <h3 className="speak-serif text-4xl md:text-5xl leading-tight italic">"{todayPlan.activities[0].title}"</h3>
                          <div className="flex flex-col gap-8 pt-8 border-t border-white/20">
                             <p className="text-sm font-medium opacity-80 leading-relaxed max-w-xs">{todayPlan.activities[0].content}</p>
                             <button onClick={() => setPracticeActivity(todayPlan.activities[0])} className="bg-white text-primary py-5 px-10 rounded-full flex items-center justify-center gap-4 group/btn shadow-xl transition-all">
                                <span className="text-xs font-black uppercase tracking-[0.2em]">INITIALIZE DRILL</span>
                                <Play className="h-4 w-4 fill-primary group-hover/btn:scale-110 transition-transform" />
                             </button>
                          </div>
                        </>
                      ) : (
                        <div className="py-12 space-y-6">
                           <p className="text-sm opacity-60">No automated steps for today. Create an AI plan to optimize your training path.</p>
                           <button onClick={() => setShowAIGenerator(true)} className="w-full py-5 rounded-full border border-white/40 text-xs font-black uppercase tracking-[0.4em] hover:bg-white/10 transition-all">
                              SYNTHESIZE PATH
                           </button>
                        </div>
                      )}
                   </div>
                </div>
              </div>

              {/* Protocol Details */}
              <div className="space-y-16">
                <div className="flex justify-center md:justify-start gap-8 border-b border-border/60 pb-12">
                  <button onClick={() => setActiveTab("plan")} className={cn("text-xs font-black uppercase tracking-[0.4em] transition-all", activeTab === "plan" ? "text-primary border-b-2 border-primary pb-12 -mb-12" : "opacity-30 hover:opacity-100")}>OPERATIONAL STEPS</button>
                  <button onClick={() => setActiveTab("overview")} className={cn("text-xs font-black uppercase tracking-[0.4em] transition-all", activeTab === "overview" ? "text-primary border-b-2 border-primary pb-12 -mb-12" : "opacity-30 hover:opacity-100")}>INTEL BRIEFING</button>
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === "plan" ? (
                    <motion.div key="plan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                      {planLoading ? (
                        <div className="py-40 text-center text-xs font-black tracking-[0.6em] opacity-10 animate-pulse uppercase">SYNCHRONIZING FEED...</div>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-6">
                          {(planDays as any[]).map((day, i) => {
                            const isCompleted = completedDays.has(day.date);
                            const isToday = day.date === new Date().toISOString().split("T")[0];
                            return (
                              <motion.div key={day.date} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }} className={cn("border rounded-[3rem] transition-all duration-700 group", isCompleted ? "bg-primary/[0.02] border-primary/20" : isToday ? "bg-muted/10 border-primary/40 shadow-glow shadow-primary/5" : "bg-muted/5 border-border/60")}>
                                <button onClick={() => toggleDayComplete(day.date)} className="w-full flex items-center justify-between p-10 text-left">
                                  <div className="flex items-center gap-8">
                                    <div className={cn("flex items-center justify-center h-14 w-14 rounded-[1.5rem] speak-serif text-xl font-bold italic border-2 transition-all duration-700", isCompleted ? "bg-primary border-primary text-white" : "bg-muted/20 border-border/60 text-foreground/20 group-hover:border-primary/40")}>
                                      {day.dayNumber}
                                    </div>
                                    <div className="space-y-1">
                                      <p className="speak-serif text-xl md:text-2xl italic group-hover:text-primary transition-colors">{isToday ? "ACTIVE NOW" : `SESSION ${day.dayNumber}`}</p>
                                      <p className="text-xs font-black uppercase tracking-widest opacity-20">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {day.totalDuration} MINS</p>
                                    </div>
                                  </div>
                                  {isCompleted ? <CheckCircle2 className="h-8 w-8 text-primary shadow-glow" /> : <div className="h-8 w-8 rounded-full border-2 border-border/60 group-hover:border-primary/40 transition-all" />}
                                </button>
                                {isCompleted && day.activities && (
                                  <div className="px-10 pb-10 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                    {day.activities.map((act, idx) => (
                                      <Link key={idx} to={act.track} className="flex items-center justify-between p-6 rounded-[1.5rem] bg-muted/5 border border-border/60 hover:border-primary/40 transition-all group/act">
                                        <div className="flex items-center gap-6">
                                          <div className="text-2xl group-hover/act:scale-110 transition-transform">{act.icon}</div>
                                          <div className="space-y-1">
                                            <p className="text-sm font-black uppercase tracking-tight">{act.title}</p>
                                            <p className="text-[11px] font-black opacity-30 uppercase tracking-widest">{act.duration} MIN SESSION</p>
                                          </div>
                                        </div>
                                        <ArrowRight className="h-5 w-5 opacity-20 group-hover/act:opacity-100 group-hover/act:translate-x-1 transition-all" />
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid md:grid-cols-[1.5fr_1fr] gap-12">
                      <div className="bg-muted/5 border border-border/60 rounded-[4rem] p-12 md:p-20 space-y-10 relative overflow-hidden">
                        <p className="text-xs font-black uppercase tracking-[0.5em] text-primary">OPERATIONAL BRIEF</p>
                        <p className="speak-serif text-4xl md:text-5xl leading-tight italic opacity-80">"{event.description || 'No strategic overview provided for this event.'}"</p>
                      </div>
                      <div className="p-12 rounded-[4rem] border border-border/60 space-y-8 flex flex-col justify-center">
                         <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] opacity-40">
                            <Microscope className="h-5 w-5" />
                            INTEL SPECS
                         </div>
                         <p className="text-sm font-medium opacity-40 leading-relaxed">
                            Full audit of deployment context. Sync occurs 24 hours prior to live initialization. Adherence to daily drills is mandatory for peak authority metrics.
                         </p>
                         <button onClick={() => navigate(`/events/new?edit=${event.id}`)} className="text-xs font-black uppercase tracking-[0.4em] text-primary hover:opacity-70 transition-opacity flex items-center gap-3">
                            MODIFY PROTOCOL <RefreshCw className="h-3 w-3" />
                         </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {isPast && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="py-60 text-center space-y-12 border-2 border-dashed border-border/60 rounded-[4rem] relative overflow-hidden">
              <ArchiveRestore className="h-24 w-24 mx-auto opacity-5" />
              <div className="space-y-4">
                <p className="speak-serif text-3xl italic opacity-20">Deployment cycle completed.</p>
                <p className="text-xs font-black uppercase tracking-[0.5em] opacity-40">OPERATIONAL WINDOW CLOSED</p>
              </div>
              <Link to="/events/new" className="button-pill px-16 py-6 inline-flex">
                <span className="text-xs font-black uppercase tracking-[0.2em]">INITIATE NEW DEPLOYMENT</span>
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      <div className="py-32 flex flex-col items-center gap-8 border-t border-border/60">
          <div className="flex items-center gap-6 text-xs font-black uppercase tracking-[0.8em] opacity-10">
            <ShieldCheck className="h-4 w-4" />
            PROTOCOL MANAGEMENT v2.4 SECURED
          </div>
      </div>

      <AIPlanGenerator isOpen={showAIGenerator} onClose={() => setShowAIGenerator(false)} onGenerate={handleAIGenerate} daysUntilEvent={daysUntil} eventType={event?.event_type || "other"} />
      {practiceActivity && <PracticeModal activity={practiceActivity} eventId={id || ""} onClose={() => setPracticeActivity(null)} onComplete={() => toggleDayComplete(todayPlan?.date || "")} />}
      <MobileNav />
    </main>
  );
};

export default EventDetail;
