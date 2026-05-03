import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/hooks/useEvents";
import { useDailyPracticePlan } from "@/hooks/useDailyPracticePlan";
import { usePracticePlan } from "@/hooks/usePracticePlan";
import { AIPlanGenerator, PlanAnswers } from "@/components/AIPlanGenerator";
import { PracticeModal } from "@/components/PracticeModal";
import { ArrowLeft, Clock, MapPin, Pencil, Trash2, Play, ArchiveRestore, CheckCircle2, Circle, CalendarDays, ChevronRight, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

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
  const { events, updateEvent, deleteEvent, archiveEvent } = useEvents();
  const [event, setEvent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"plan" | "overview">("plan");
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  
  // Load completed days for this specific event
  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`speakbold:completed-${id}`);
      if (saved) {
        setCompletedDays(new Set(JSON.parse(saved)));
      }
    }
  }, [id]);
  const [urlParams] = useState(new URLSearchParams(window.location.search));
  const [showAIGenerator, setShowAIGenerator] = useState(urlParams.get("generatePlan") === "true");
  const [customPlan, setCustomPlan] = useState<any[] | null>(null);
  const [practiceActivity, setPracticeActivity] = useState<any>(null);

  const { plan: defaultPlan, loading: planLoading, minutesPerDay, daysLeft, eventType } = useDailyPracticePlan(id);
  const { plan: aiPlan, loading: aiPlanLoading, generatePlan, loadPlan } = usePracticePlan(id);
  
  // Use AI plan if available, otherwise fall back to default plan
  const plan = customPlan || aiPlan || defaultPlan;
  
  // Find today's practice
  const todayDate = new Date().toISOString().split('T')[0];
  const todayPlan = plan?.days?.find(d => d.date === todayDate);

  // Load AI plan on mount
  useEffect(() => {
    console.log("AI Plan - id:", id, "user:", user?.id);
    if (id && user) {
      console.log("Calling loadPlan...");
      loadPlan();
    }
  }, [id, user, loadPlan]);

  const handleAIGenerate = async (answers: PlanAnswers) => {
    // Calculate days until event
    const eventDate = event ? new Date(event.event_date) : new Date();
    const now = new Date();
    const daysUntil = event ? Math.max(1, Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 7;

    // Use AI to generate custom prompts if user provided description
    const customDesc = answers.useCustomAI ? answers.customDescription : undefined;
    await generatePlan(event?.event_type || 'other', answers.focusAreas, daysUntil, customDesc);
    
    setActiveTab("plan");
    setShowAIGenerator(false);
    toast({
      title: "AI Plan Generated!",
      description: customDesc 
        ? "Your custom AI plan is ready with prompts specific to your scenario."
        : `Your ${daysUntil}-day plan is ready with ${answers.timePerDay} min/day focus.`,
    });
  };

  useEffect(() => {
    if (!id) return;
    const found = events.find((e) => e.id === id);
    if (found) {
      setEvent(found);
    } else if (!events.length) {
      return;
    } else {
      navigate("/events", { replace: true });
    }
  }, [id, events, navigate]);

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-background pb-20 lg:pb-0">
        <SiteHeader />
        <div className="container py-12 text-center text-muted-foreground">
          Loading event...
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
    if (window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      await deleteEvent(event.id);
      toast({ title: "Event deleted", description: "The event has been permanently deleted." });
      navigate("/events");
    }
  };

  const handleArchive = async () => {
    await archiveEvent(event.id);
    toast({ title: "Event archived", description: "The event has been moved to past events." });
    navigate("/events");
  };

  const toggleDayComplete = (date: string) => {
    const newCompleted = new Set(completedDays);
    if (newCompleted.has(date)) {
      newCompleted.delete(date);
    } else {
      newCompleted.add(date);
    }
    setCompletedDays(newCompleted);
    if (id) {
      localStorage.setItem(`speakbold:completed-${id}`, JSON.stringify([...newCompleted]));
    }
  };

  const planDays = aiPlan?.days || defaultPlan || [];
  const completedCount = Array.isArray(planDays) ? planDays.filter((day: any) => completedDays.has(day.date)).length : 0;
  const progressPercent = Array.isArray(planDays) && planDays.length > 0 ? Math.round((completedCount / planDays.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-background pb-20 lg:pb-0">
      <SiteHeader />
      <section className="container max-w-2xl py-8 md:py-12">
        {/* Back button */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/events">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Link>
          </Button>
        </div>

        {/* Event header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{EVENT_ICONS[event.event_type]}</span>
              <Badge variant="outline" className="text-xs">
                {EVENT_LABELS[event.event_type]}
              </Badge>
              {event.archived && (
                <Badge variant="secondary" className="text-xs">Archived</Badge>
              )}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold leading-tight mb-4">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {eventDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })} at {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!event.archived && !isPast && (
              <Button variant="outline" size="sm" onClick={handleArchive}>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Archive
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {!isPast && !event.archived && (
          <>
            {/* Progress bar */}
            <div className="bg-card-gradient border border-border rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <span className="font-medium">{daysUntil === 0 ? "Today!" : `${daysUntil} day${daysUntil === 1 ? '' : 's'} away`}</span>
                </div>
                <span className="text-sm text-muted-foreground">{completedCount}/{planDays.length} days completed</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-warm transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
<p className="text-xs text-muted-foreground mt-2">
                {minutesPerDay} min/day • {progressPercent}% complete
              </p>
            </div>

            {/* Today's Practice - Show actual prompt content */}
            {todayPlan && todayPlan.activities[0] ? (
              <div className="bg-card-gradient border border-primary/20 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Today's Practice</span>
                  {completedDays.has(todayPlan.date) && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                  )}
                </div>
                <div className="bg-muted/50 rounded-xl p-3 mb-3">
                  <p className="text-sm font-medium">{todayPlan.activities[0].title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{todayPlan.activities[0].content}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{todayPlan.activities[0].track}</span>
                    <span>•</span>
                    <span>{todayPlan.activities[0].duration} min</span>
                  </div>
                  <div className="flex gap-2">
                    {!completedDays.has(todayPlan.date) && (
                      <Button size="sm" variant="outline" onClick={() => toggleDayComplete(todayPlan.date)}>
                        Mark Complete
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setPracticeActivity(todayPlan.activities[0])}>
                      <Play className="h-3 w-3 mr-1" />
                      Practice
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card-gradient border border-dashed border-border rounded-2xl p-6 mb-6 text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
                <p className="font-medium mb-3">Get your AI practice plan</p>
                <Button onClick={() => setShowAIGenerator(true)}>
                  Generate My Plan
                </Button>
              </div>
)}

            {activeTab === "plan" ? (
              planLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading plan...</div>
              ) : planDays.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-3xl">
                  <p className="text-muted-foreground">Event is today or in the past.</p>
                </div>
              ) : !aiPlan ? (
                <div className="space-y-4">
                  {(planDays as any[]).map((day) => {
                    const isCompleted = completedDays.has(day.date);
                    const isToday = day.date === new Date().toISOString().split("T")[0];
                    
                    return (
                      <div
                        key={day.date}
                        className={cn(
                          "border rounded-2xl overflow-hidden transition-all",
                          isCompleted ? "border-green-500/30 bg-green-500/5" :
                          isToday ? "border-primary/30 bg-primary/5" : "border-border bg-card-gradient"
                        )}
                      >
                        {/* Day header */}
                        <button
                          onClick={() => toggleDayComplete(day.date)}
                          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-warm text-primary-foreground text-sm font-bold">
                              {day.dayNumber}
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-sm">
                                Day {day.dayNumber}: {isToday ? "Today" : isCompleted ? "Completed" : `${day.totalDuration} min practice`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>

                        {/* Activities */}
                        {isCompleted && (
                          <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-3">
                            {day.activities.map((activity, i) => (
                              <Link
                                key={i}
                                to={activity.track}
                                className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                              >
                                <span className="text-lg">{activity.icon}</span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium group-hover:text-primary transition-colors">
                                    {activity.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                                </div>
                                <span className="text-xs text-muted-foreground font-mono">{activity.duration}m</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Your AI plan is ready! Check "Today's Practice" above to start.</p>
                </div>
              )
            ) : (
              <div className="space-y-6">
                {event.description && (
                  <div className="bg-card-gradient border border-border rounded-2xl p-6">
                    <h3 className="font-display text-lg font-semibold mb-3">About This Event</h3>
                    <p className="text-foreground/90 leading-relaxed">{event.description}</p>
                  </div>
                )}
                <div className="bg-muted/30 rounded-2xl p-6">
                  <h3 className="font-display text-lg font-semibold mb-3">Daily Reminders</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You'll receive a daily reminder {Math.min(7, daysUntil)} days before your event. 
                    Check your plan above and click on activities to start practicing.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Past event message */}
        {isPast && (
          <div className="text-center py-16 border border-dashed rounded-3xl">
            <p className="text-muted-foreground mb-4">This event has passed.</p>
            <Button variant="hero" asChild>
              <Link to="/events/new">Schedule New Event</Link>
            </Button>
          </div>
        )}
      </section>

      <AIPlanGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onGenerate={handleAIGenerate}
        daysUntilEvent={daysUntil}
        eventType={event?.event_type || "other"}
      />

      {practiceActivity && (
        <PracticeModal
          activity={practiceActivity}
          eventId={id || ""}
          onClose={() => setPracticeActivity(null)}
          onComplete={() => toggleDayComplete(todayPlan?.date || "")}
        />
      )}

      <MobileNav />
    </main>
  );
};

export default EventDetail;
