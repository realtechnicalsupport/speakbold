import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/hooks/useEvents";
import { CalendarPlus, Calendar, Clock, MapPin, Archive, Trash2, ChevronRight } from "lucide-react";
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

const EventCard = ({ event, onArchive, onDelete, delay = 0 }: any) => {
  const eventDate = new Date(event.event_date);
  const isPast = eventDate <= new Date();
  const daysLeft = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Link
      to={`/events/${event.id}`}
      className="block bg-card-gradient border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors group animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{EVENT_ICONS[event.event_type]}</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {EVENT_LABELS[event.event_type]}
            </span>
            {event.archived && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                Archived
              </span>
            )}
          </div>
          <h3 className="font-display text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {eventDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {event.location}
              </span>
            )}
            {!isPast && daysLeft <= 30 && (
              <span className={cn(
                "flex items-center gap-1",
                daysLeft <= 7 ? "text-red-500" : "text-amber-500"
              )}>
                <Clock className="h-3.5 w-3.5" />
                {daysLeft === 0 ? "Today!" : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!event.archived && !isPast && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onArchive(event.id);
              }}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Archive event"
            >
              <Archive className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete(event.id);
            }}
            className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
            title="Delete event"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </button>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
};

const Events = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { upcomingEvents, pastEvents, loading, archiveEvent, deleteEvent } = useEvents();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const handleArchive = async (id: string) => {
    await archiveEvent(id);
    toast({
      title: "Event archived",
      description: "The event has been moved to past events.",
    });
  };

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
    toast({
      title: "Event deleted",
      description: "The event has been permanently deleted.",
    });
  };

  return (
    <main className="min-h-screen bg-background pb-20 lg:pb-0">
      <SiteHeader />
      <section className="container py-8 md:py-12">
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold">My Events</h1>
            <p className="text-muted-foreground mt-2">
              Schedule and train for upcoming speaking events
            </p>
          </div>
          <Button variant="hero" asChild>
            <Link to="/events/new">
              <CalendarPlus className="h-4 w-4 mr-2" />
              Add Event
            </Link>
          </Button>
        </div>

        <div className={`grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-2xl mb-6 max-w-xs ${mounted ? "animate-fade-up" : "opacity-0"}`} style={{ animationDelay: "100ms" }}>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={cn(
              "py-2 px-4 rounded-xl text-sm font-medium transition-all",
              activeTab === "upcoming"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Upcoming ({upcomingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={cn(
              "py-2 px-4 rounded-xl text-sm font-medium transition-all",
              activeTab === "past"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Past ({pastEvents.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading events...
          </div>
        ) : activeTab === "upcoming" ? (
          upcomingEvents.length === 0 ? (
            <div className={`text-center py-16 border border-dashed rounded-3xl ${mounted ? "animate-scale-in" : "opacity-0"}`} style={{ animationDelay: "200ms" }}>
              <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-6">No upcoming events scheduled</p>
              <Button variant="hero" asChild>
                <Link to="/events/new">Schedule Your First Event</Link>
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {upcomingEvents.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  delay={mounted ? i * 80 + 100 : 0}
                />
              ))}
            </div>
          )
        ) : (
          pastEvents.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-3xl">
              <Archive className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No past events</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {pastEvents.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  delay={i * 80 + 100}
                />
              ))}
            </div>
          )
        )}
      </section>

      <div className="fixed bottom-20 right-4 lg:hidden z-40 animate-fade-up" style={{ animationDelay: "500ms" }}>
        <Button variant="hero" size="lg" className="rounded-full shadow-lg" asChild>
          <Link to="/events/new">
            <CalendarPlus className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      <MobileNav />
    </main>
  );
};

export default Events;
