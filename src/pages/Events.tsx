import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/hooks/useEvents";
import { CalendarPlus, Calendar, Clock, MapPin, Archive, Trash2, ChevronRight, ArrowRight, ShieldCheck, Microscope, RefreshCw } from "lucide-react";
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
  interview: "JOB INTERVIEW",
  presentation: "PRESENTATION",
  conference: "CONFERENCE TALK",
  wedding: "WEDDING SPEECH",
  other: "OTHER EVENT",
};

const EventCard = ({ event, onArchive, onDelete, index = 0 }: any) => {
  const eventDate = new Date(event.event_date);
  const isPast = eventDate <= new Date();
  const daysLeft = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.8 }}
    >
      <Link
        to={`/events/${event.id}`}
        className={cn(
          "block bg-muted/5 border rounded-[3rem] p-10 md:p-12 transition-all duration-700 group relative overflow-hidden shadow-soft",
          isPast ? "border-border/60 opacity-60" : "border-border/60 hover:border-primary/40 hover:bg-primary/[0.02]"
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 relative z-10">
          <div className="flex-1 space-y-10">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 rounded-[1.5rem] bg-background border border-border/60 flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
                {EVENT_ICONS[event.event_type]}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.4em] text-primary">
                  {EVENT_LABELS[event.event_type]}
                </p>
                {event.archived && (
                  <span className="text-[11px] font-black bg-muted/30 px-3 py-1 rounded-full opacity-40 uppercase tracking-widest">
                    ARCHIVED RECORD
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="speak-serif text-3xl md:text-5xl text-foreground leading-none tracking-tighter group-hover:text-primary transition-colors">
                {event.title}
              </h3>
              <div className="flex flex-wrap items-center gap-8 text-xs font-black uppercase tracking-[0.3em] opacity-30">
                <span className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  {eventDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                {event.location && (
                  <span className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    {event.location}
                  </span>
                )}
                {!isPast && daysLeft <= 30 && (
                  <span className={cn(
                    "flex items-center gap-3",
                    daysLeft <= 7 ? "text-primary opacity-100" : "text-foreground opacity-100"
                  )}>
                    <Clock className="h-4 w-4" />
                    {daysLeft === 0 ? "DEPLOYMENT TODAY" : `${daysLeft} DAYS TO DEPLOY`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {!event.archived && !isPast && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onArchive(event.id);
                }}
                className="h-14 w-14 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted transition-all opacity-30 hover:opacity-100"
                title="Archive event"
              >
                <Archive className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                onDelete(event.id);
              }}
              className="h-14 w-14 rounded-full border border-border/60 flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all opacity-30 hover:opacity-100"
              title="Delete event"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <div className="h-16 w-16 rounded-full border border-border/60 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:shadow-glow transition-all duration-700 group-hover:scale-110">
              <ArrowRight className="h-6 w-6 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const Events = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { upcomingEvents, pastEvents, loading, archiveEvent, deleteEvent } = useEvents();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleArchive = async (id: string) => {
    await archiveEvent(id);
    toast({
      title: "Event archived",
      description: "Record has been moved to past events.",
    });
  };

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
    toast({
      title: "Event deleted",
      description: "Record permanently purged from the system.",
    });
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <SiteHeader />
      
      {/* Background Motion */}
      <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-float opacity-30 pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-accent/5 rounded-full blur-[130px] animate-float opacity-20 pointer-events-none" style={{ animationDelay: "-5s" }} />

      <section className="container pt-32 md:pt-48 pb-24">
        <div className="max-w-6xl mx-auto space-y-32">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-16"
          >
            <div className="space-y-8">
              <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                <ShieldCheck className="h-4 w-4" />
                STRATEGIC PLANNING
              </div>
              <h1 className="speak-serif text-5xl md:text-9xl leading-[0.8] tracking-tighter">
                Your <span className="text-primary italic">Events</span>.
              </h1>
              <p className="text-lg md:text-2xl font-medium tracking-tight opacity-40 max-w-xl leading-relaxed">
                Schedule and train for high-stakes moments. Every deployment is a test of your operational readiness.
              </p>
            </div>
            
            <Link to="/events/new" className="button-pill px-12 py-6 bg-primary text-white shadow-glow group">
              <span className="text-xs font-black uppercase tracking-[0.2em]">INITIALIZE NEW EVENT</span>
              <CalendarPlus className="h-5 w-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ml-2" />
            </Link>
          </motion.div>

          <div className="space-y-16">
            <div className="flex justify-center md:justify-start gap-6 border-b border-border/60 pb-12">
              <button
                onClick={() => setActiveTab("upcoming")}
                className={cn(
                  "px-10 py-4 rounded-full text-xs font-black uppercase tracking-[0.3em] transition-all",
                  activeTab === "upcoming"
                    ? "bg-primary text-white shadow-glow"
                    : "bg-muted/5 border border-border/60 text-foreground/30 hover:border-primary/40 hover:text-foreground"
                )}
              >
                Upcoming Protocol ({upcomingEvents.length})
              </button>
              <button
                onClick={() => setActiveTab("past")}
                className={cn(
                  "px-10 py-4 rounded-full text-xs font-black uppercase tracking-[0.3em] transition-all",
                  activeTab === "past"
                    ? "bg-primary text-white shadow-glow"
                    : "bg-muted/5 border border-border/60 text-foreground/30 hover:border-primary/40 hover:text-foreground"
                )}
              >
                Historical Logs ({pastEvents.length})
              </button>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-60 text-center space-y-10"
                >
                  <div className="h-1.5 w-32 bg-muted rounded-full mx-auto overflow-hidden border border-border/60">
                    <motion.div 
                      animate={{ x: ["-100%", "100%"] }} 
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} 
                      className="h-full w-1/2 bg-primary shadow-glow" 
                    />
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.5em] opacity-40 animate-pulse">SYNCHRONIZING EVENT ARCHIVE...</p>
                </motion.div>
              ) : activeTab === "upcoming" ? (
                <motion.div 
                  key="upcoming"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  {upcomingEvents.length === 0 ? (
                    <div className="py-60 text-center space-y-12 border-2 border-dashed border-border/60 rounded-[4rem] relative overflow-hidden">
                      <Calendar className="h-24 w-24 opacity-5 mx-auto" />
                      <div className="space-y-4">
                        <p className="speak-serif text-3xl italic opacity-20">No active deployments detected.</p>
                        <p className="text-xs font-black uppercase tracking-[0.5em] opacity-40">AWAITING SYSTEM INITIALIZATION</p>
                      </div>
                      <Link to="/events/new" className="button-pill px-16 py-6 inline-flex">
                        <span className="text-xs font-black uppercase tracking-[0.2em]">SCHEDULE EVENT</span>
                      </Link>
                    </div>
                  ) : (
                    upcomingEvents.map((event, i) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        index={i}
                      />
                    ))
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="past"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  {pastEvents.length === 0 ? (
                    <div className="py-60 text-center space-y-10 border-2 border-dashed border-border/60 rounded-[4rem]">
                      <Archive className="h-20 w-20 opacity-5 mx-auto" />
                      <p className="speak-serif text-3xl italic opacity-20">The archive is currently empty.</p>
                    </div>
                  ) : (
                    pastEvents.map((event, i) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        index={i}
                      />
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <div className="py-32 flex flex-col items-center gap-8 border-t border-border/60">
          <div className="flex items-center gap-6 text-xs font-black uppercase tracking-[0.8em] opacity-10">
            <Microscope className="h-4 w-4" />
            PROTOCOL SCHEDULER v2.4 OPERATIONAL
          </div>
      </div>

      <MobileNav />
    </main>
  );
};

export default Events;
