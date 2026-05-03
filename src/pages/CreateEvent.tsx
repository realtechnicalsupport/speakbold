import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarModal } from "@/components/ui/calendar-modal";
import { ClockModal } from "@/components/ui/clock-modal";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/hooks/useEvents";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const EVENT_TYPES = [
  { value: 'interview', label: 'Job Interview', icon: '💼' },
  { value: 'presentation', label: 'Presentation', icon: '📊' },
  { value: 'conference', label: 'Conference Talk', icon: '🎤' },
  { value: 'wedding', label: 'Wedding Speech', icon: '💍' },
  { value: 'other', label: 'Other Event', icon: '📅' },
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
          title: "Event created",
          description: "Your event has been scheduled successfully.",
        });
        navigate(`/events/${result.id}?generatePlan=true`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-20 lg:pb-0">
      <SiteHeader />
      <section className="container max-w-2xl py-8 md:py-12">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/events">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Link>
          </Button>
        </div>

        <h1 className="font-display text-3xl md:text-4xl font-semibold mb-2">
          Schedule New Event
        </h1>
        <p className="text-muted-foreground mb-8">
          Plan your upcoming speaking engagement and get personalized training recommendations.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              placeholder="e.g., Product Demo Presentation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Event Type */}
          <div className="space-y-3">
            <Label>Event Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setEventType(type.value as any)}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    eventType === type.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <span className="text-2xl mb-2 block">{type.icon}</span>
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <CalendarModal 
                value={eventDate} 
                onChange={setEventDate}
                minDate={new Date()}
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <ClockModal 
                value={eventTime} 
                onChange={setEventTime}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              placeholder="e.g., Conference Center, Room 205"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any notes or details about your event..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="hero" size="lg" disabled={loading || !title || !eventDate}>
              <CalendarPlus className="h-4 w-4 mr-2" />
              {loading ? "Creating..." : "Create Event"}
            </Button>
            <Button type="button" variant="outline" size="lg" asChild>
              <Link to="/events">Cancel</Link>
            </Button>
          </div>
        </form>
      </section>
      <MobileNav />
    </main>
  );
};

export default CreateEvent;
