import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileNav } from "@/components/MobileNav";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarModal } from "@/components/ui/calendar-modal";
import { ClockModal } from "@/components/ui/clock-modal";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/hooks/useEvents";
import { ArrowLeft, Target, ArrowRight, ShieldCheck, Microscope, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const EVENT_TYPES = [
  { value: 'interview', label: 'JOB INTERVIEW', icon: '💼' },
  { value: 'presentation', label: 'PRESENTATION', icon: '📊' },
  { value: 'conference', label: 'CONFERENCE TALK', icon: '🎤' },
  { value: 'wedding', label: 'WEDDING SPEECH', icon: '💍' },
  { value: 'other', label: 'OTHER EVENT', icon: '📅' },
];

const CreateEvent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createEvent } = useEvents();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("09:00");
  const [eventType, setEventType] = useState<'interview' | 'presentation' | 'conference' | 'wedding' | 'other'>('presentation');
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !eventDate) return;

    setLoading(true);
    try {
      const dateTime = new Date(`${eventDate}T${eventTime}`);
      const result = await createEvent({
        title,
        description: description || undefined,
        event_date: dateTime,
        event_type: eventType,
        location: location || undefined,
      });

      if (result) {
        toast({
          title: "Protocol Initialized",
          description: "New objective committed to the system.",
        });
        navigate(`/events/${result.id}?generatePlan=true`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initialize protocol. Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <SiteHeader />
      
      {/* Background Motion */}
      <div className="absolute top-[10%] right-[-5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-float opacity-30 pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-accent/5 rounded-full blur-[130px] animate-float opacity-20 pointer-events-none" style={{ animationDelay: "-4s" }} />

      <section className="container pt-32 md:pt-48 pb-24">
        <div className="max-w-4xl mx-auto space-y-24">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Link to="/events" className="inline-flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] text-primary opacity-40 hover:opacity-100 transition-all mb-12">
              <ArrowLeft className="h-4 w-4" />
              ABORT TO EVENT LIST
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="space-y-10">
            <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
              <ShieldCheck className="h-4 w-4" />
              DEPLOYMENT CONFIGURATION
            </div>
            <h1 className="speak-serif text-6xl md:text-9xl leading-[0.8] text-foreground tracking-tighter">
              New <span className="text-primary italic">Objective</span>.
            </h1>
            <p className="text-lg md:text-2xl font-medium tracking-tight opacity-40 max-w-3xl leading-relaxed">
              Define the parameters of your upcoming engagement to synthesize a specialized training protocol. High-stakes communication starts with clear parameters.
            </p>
          </motion.div>

          <motion.form 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 1 }}
            onSubmit={handleSubmit} 
            className="bg-muted/5 border border-border/60 rounded-[4rem] p-12 md:p-20 space-y-16 relative overflow-hidden shadow-soft"
          >
            <div className="grain pointer-events-none" />
            
            {/* Title */}
            <div className="space-y-6 relative z-10">
              <Label htmlFor="title" className="text-xs font-black uppercase tracking-[0.4em] opacity-40">EVENT CLASSIFICATION</Label>
              <Input
                id="title"
                placeholder="e.g., Q3 Stakeholder Briefing"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-background/50 border-border/60 h-20 rounded-[2rem] px-10 text-2xl speak-serif italic focus:border-primary/50 transition-all duration-700"
              />
            </div>

            {/* Event Type */}
            <div className="space-y-8 relative z-10">
              <Label className="text-xs font-black uppercase tracking-[0.4em] opacity-40">OBJECTIVE CATEGORY</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setEventType(type.value as any)}
                    className={cn(
                      "flex flex-col items-center justify-center p-8 rounded-[2.5rem] border transition-all duration-700 gap-6 group relative overflow-hidden",
                      eventType === type.value
                        ? "border-primary bg-primary/[0.03] shadow-glow shadow-primary/10"
                        : "border-border/60 hover:border-primary/40 bg-muted/5"
                    )}
                  >
                    <span className="text-4xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">{type.icon}</span>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-center opacity-40 group-hover:opacity-100">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid md:grid-cols-2 gap-12 relative z-10">
              <div className="space-y-6">
                <Label className="text-xs font-black uppercase tracking-[0.4em] opacity-40">DEPLOYMENT DATE</Label>
                <div className="h-20 rounded-[2rem] bg-background/50 border border-border/60 px-10 flex items-center transition-all duration-700 hover:border-primary/30">
                  <CalendarModal 
                    value={eventDate} 
                    onChange={setEventDate}
                    minDate={new Date()}
                  />
                </div>
              </div>
              <div className="space-y-6">
                <Label className="text-xs font-black uppercase tracking-[0.4em] opacity-40">WINDOW INITIALIZATION</Label>
                <div className="h-20 rounded-[2rem] bg-background/50 border border-border/60 px-10 flex items-center transition-all duration-700 hover:border-primary/30">
                  <ClockModal 
                    value={eventTime} 
                    onChange={setEventTime}
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-6 relative z-10">
              <Label htmlFor="location" className="text-xs font-black uppercase tracking-[0.4em] opacity-40">GEOGRAPHIC PARAMETERS</Label>
              <Input
                id="location"
                placeholder="e.g., Level 42, Main Auditorium"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-background/50 border-border/60 h-20 rounded-[2rem] px-10 text-xl speak-serif italic focus:border-primary/50 transition-all duration-700"
              />
            </div>

            {/* Description */}
            <div className="space-y-6 relative z-10">
              <Label htmlFor="description" className="text-xs font-black uppercase tracking-[0.4em] opacity-40">MISSION INTEL</Label>
              <Textarea
                id="description"
                placeholder="Detail the stakes, audience, and key vectors of this engagement..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="bg-background/50 border-border/60 rounded-[2.5rem] p-10 text-xl speak-serif italic focus:border-primary/50 transition-all duration-700 resize-none min-h-[200px]"
              />
            </div>

            {/* Submit */}
            <div className="flex flex-col md:flex-row gap-8 pt-12 relative z-10">
              <button 
                type="submit" 
                disabled={loading || !title || !eventDate}
                className="button-pill flex-1 py-7 bg-primary text-white flex items-center justify-center gap-6 group disabled:opacity-30 shadow-glow"
              >
                {loading ? (
                   <span className="text-xs font-black uppercase tracking-[0.3em] animate-pulse">SYNCHRONIZING...</span>
                ) : (
                  <>
                    <span className="text-xs font-black uppercase tracking-[0.3em]">COMMIT OBJECTIVE</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform duration-700" />
                  </>
                )}
              </button>
              <Link to="/events" className="button-pill py-7 px-16 border-border/60 hover:bg-muted/10 flex items-center justify-center transition-all duration-700 group">
                <span className="text-xs font-black uppercase tracking-[0.3em] opacity-20 group-hover:opacity-40">ABORT MISSION</span>
              </Link>
            </div>
          </motion.form>
        </div>
      </section>

      <div className="py-32 flex flex-col items-center gap-8 border-t border-border/60">
          <div className="flex items-center gap-6 text-xs font-black uppercase tracking-[0.8em] opacity-10">
            <Microscope className="h-4 w-4" />
            MISSION CONTROL INTERFACE v2.4 OPERATIONAL
          </div>
      </div>
      <MobileNav />
    </main>
  );
};

export default CreateEvent;
