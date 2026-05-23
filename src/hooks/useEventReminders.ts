import { useEffect } from "react";
import { useEvents } from "./useEvents";
import { toast } from "@/hooks/use-toast";

export const useEventReminders = () => {
  const { upcomingEvents } = useEvents();

  useEffect(() => {
    if (!upcomingEvents || upcomingEvents.length === 0) return;

    const now = new Date();
    const REMINDER_KEY = "speakbold:event-reminders";
    
    // Get last reminder dates from localStorage
    const lastReminders = JSON.parse(localStorage.getItem(REMINDER_KEY) || "{}");

    upcomingEvents.forEach(event => {
      const eventDate = new Date(event.event_date);
      const daysLeft = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Remind if within 7 days and not reminded today
      if (daysLeft <= 7 && daysLeft >= 0) {
        const lastReminded = lastReminders[event.id];
        const today = new Date().toDateString();
        
        if (lastReminded !== today) {
          const eventTypeLabels: Record<string, string> = {
            interview: "Job Interview",
            presentation: "Presentation",
            conference: "Conference Talk",
            wedding: "Wedding Speech",
            other: "Event",
          };
          
          toast({
            title: daysLeft === 0 
              ? "Event Today!" 
              : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left!`,
            description: `Your ${eventTypeLabels[event.event_type] || 'event'} "${event.title}" is coming up. Time to train!`,
          });

          // Update last reminded date
          lastReminders[event.id] = today;
          localStorage.setItem(REMINDER_KEY, JSON.stringify(lastReminders));
        }
      }
    });
  }, [upcomingEvents]);
};
