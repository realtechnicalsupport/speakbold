import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/hooks/useEvents";
import { useDailyPracticePlan } from "@/hooks/useDailyPracticePlan";
import { ArrowLeft, Clock, MapPin, Pencil, Trash2, Play, ArchiveRestore, CheckCircle2, Circle, CalendarDays, ChevronRight } from "lucide-react";
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
  const [completedDays, setCompletedDays] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("speakbold:completed-days");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const { plan, loading: planLoading, minutesPerDay, daysLeft } = useDailyPracticePlan(id);

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
    localStorage.setItem("speakbold:completed-days", JSON.stringify([...newCompleted]));
  };

  const completedCount = plan.filter((day) => completedDays.has(day.date)).length;
  const progressPercent = plan.length > 0 ? Math.round((completedCount / plan.length) * 100) : 0;

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
                <span className="text-sm text-muted-foreground">{completedCount}/{plan.length} days completed</span>
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

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-2xl mb-6 max-w-xs">
              <button
                onClick={() => setActiveTab("plan")}
                className={cn(
                  "py-2 px-4 rounded-xl text-sm font-medium transition-all",
                  activeTab === "plan"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Daily Plan
              </button>
              <button
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "py-2 px-4 rounded-xl text-sm font-medium transition-all",
                  activeTab === "overview"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Overview
              </button>
            </div>

            {activeTab === "plan" ? (
              planLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading plan...</div>
              ) : plan.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-3xl">
                  <p className="text-muted-foreground">Event is today or in the past.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {plan.map((day) => {
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
      <MobileNav />
    </main>
  );
};

export default EventDetail;
