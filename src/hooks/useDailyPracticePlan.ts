import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { EventType } from "./useEvents";

export interface PracticeDay {
  dayNumber: number;
  date: string;
  activities: {
    title: string;
    description: string;
    track: string;
    duration: number;
    icon: string;
  }[];
  totalDuration: number;
  completed: boolean;
}

const TRACK_PLAN: Record<EventType, { track: string; label: string; icon: string }[]> = {
  interview: [
    { track: "interviews", label: "Interview Drills", icon: "🎯" },
    { track: "impromptu", label: "Impromptu Thinking", icon: "💡" },
  ],
  presentation: [
    { track: "public-speaking", label: "Public Speaking", icon: "🎤" },
    { track: "body-language", label: "Body Language", icon: "🧍" },
  ],
  conference: [
    { track: "public-speaking", label: "Public Speaking", icon: "🎤" },
    { track: "impromptu", label: "Impromptu Drills", icon: "💡" },
  ],
  wedding: [
    { track: "body-language", label: "Body Language", icon: "🧍" },
    { track: "impromptu", label: "Impromptu Speaking", icon: "💡" },
  ],
  other: [
    { track: "impromptu", label: "Impromptu Drills", icon: "💡" },
    { track: "public-speaking", label: "Public Speaking", icon: "🎤" },
  ],
};

const ACTIVITY_TEMPLATES: Record<string, { title: string; description: string; duration: number }[]> = {
  interviews: [
    { title: "Behavioral Questions", description: "Practice STAR method responses", duration: 3 },
    { title: "Technical Questions", description: "Answer technical challenges aloud", duration: 3 },
    { title: "Tell Me About Yourself", description: "Refine your elevator pitch", duration: 2 },
    { title: "Strengths & Weaknesses", description: "Practice honest, confident answers", duration: 3 },
    { title: "Curveball Questions", description: "Handle unexpected questions gracefully", duration: 3 },
  ],
  "public-speaking": [
    { title: "Opening Strong", description: "Practice your hook and introduction", duration: 3 },
    { title: "Voice Projection", description: "Work on clarity and volume", duration: 3 },
    { title: "Pacing & Pauses", description: "Control your speaking rhythm", duration: 2 },
    { title: "Storytelling", description: "Deliver a compelling story", duration: 3 },
    { title: "Call to Action", description: "Practice your closing statement", duration: 3 },
  ],
  impromptu: [
    { title: "Quick Thinking", description: "Respond to prompts within 10 seconds", duration: 3 },
    { title: "PREP Framework", description: "Point, Reason, Example, Point", duration: 2 },
    { title: "Structure Under Pressure", description: "Organize thoughts on the fly", duration: 3 },
    { title: "Confidence Building", description: "Speak without filler words", duration: 3 },
    { title: "Persuasion", description: "Convince in 60 seconds", duration: 2 },
  ],
  "body-language": [
    { title: "Eye Contact", description: "Practice maintaining natural eye contact", duration: 3 },
    { title: "Posture & Presence", description: "Work on confident stance", duration: 2 },
    { title: "Hand Gestures", description: "Use purposeful, natural gestures", duration: 3 },
    { title: "Facial Expressions", description: "Match expressions to your message", duration: 2 },
    { title: "Stage Movement", description: "Practice purposeful positioning", duration: 3 },
  ],
};

const getDayPlan = (
  dayNumber: number,
  totalDays: number,
  minutesPerDay: number,
  eventType: EventType
): PracticeDay => {
  const tracks = TRACK_PLAN[eventType];
  const activities: PracticeDay["activities"] = [];

  const isDay1 = dayNumber === 1;
  const isLastDay = dayNumber === totalDays;
  const isMidPoint = dayNumber === Math.ceil(totalDays / 2);

  if (isDay1) {
    // Day 1: Foundation
    tracks.forEach(track => {
      const template = ACTIVITY_TEMPLATES[track.track]?.[0];
      if (template) {
        activities.push({
          title: `${track.icon} ${track.label}`,
          description: template.description,
          track: `/tracks/${track.track}`,
          duration: Math.ceil(minutesPerDay / tracks.length),
          icon: track.icon,
        });
      }
    });
    activities.push({
      title: "📋 Warm-up",
      description: "Review the event details and set your goal for today",
      track: "/",
      duration: 1,
      icon: "📋",
    });
  } else if (isLastDay) {
    // Last day: Full rehearsal
    activities.push({
      title: "🎭 Full Rehearsal",
      description: "Do a complete run-through as if it's the real event",
      track: `/tracks/${tracks[0].track}`,
      duration: minutesPerDay - 2,
      icon: "🎭",
    });
    activities.push({
      title: "🧘 Cool Down",
      description: "Reflect on your progress and visualize success",
      track: "/",
      duration: 2,
      icon: "🧘",
    });
  } else {
    // Other days: Progressive training
    const dayIndex = (dayNumber - 2) % Math.max(tracks.length * 2, 4);
    
    tracks.forEach((track, i) => {
      const templateIndex = (dayIndex + i) % (ACTIVITY_TEMPLATES[track.track]?.length || 1);
      const template = ACTIVITY_TEMPLATES[track.track]?.[templateIndex];
      if (template) {
        activities.push({
          title: `${track.icon} ${track.label}`,
          description: template.description,
          track: `/tracks/${track.track}`,
          duration: Math.ceil(minutesPerDay / tracks.length),
          icon: track.icon,
        });
      }
    });

    if (isMidPoint) {
      activities.push({
        title: "📊 Mid-point Review",
        description: "Record yourself and compare to day 1",
        track: "/",
        duration: 1,
        icon: "📊",
      });
    }
  }

  // Adjust total duration to match minutesPerDay
  const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);

  return {
    dayNumber,
    date: "",
    activities,
    totalDuration: totalDuration || minutesPerDay,
    completed: false,
  };
};

export const useDailyPracticePlan = (eventId: string | undefined) => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PracticeDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [minutesPerDay, setMinutesPerDay] = useState(5);
  const [eventType, setEventType] = useState<EventType>("interview");
  const [daysLeft, setDaysLeft] = useState(0);

  const generatePlan = useCallback(() => {
    if (!daysLeft || daysLeft <= 0) {
      setPlan([]);
      setLoading(false);
      return;
    }

    const days: PracticeDay[] = [];
    for (let i = 1; i <= daysLeft; i++) {
      const dayPlan = getDayPlan(i, daysLeft, minutesPerDay, eventType);
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() + (i - 1));
      dayPlan.date = dayDate.toISOString().split("T")[0];
      days.push(dayPlan);
    }

    setPlan(days);
    setLoading(false);
  }, [daysLeft, minutesPerDay, eventType]);

  useEffect(() => {
    if (!eventId || !user) return;

    const loadEvent = async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        if (!data) return;

        const eventDate = new Date(data.event_date);
        const now = new Date();
        const days = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        setDaysLeft(Math.max(0, days));
        setMinutesPerDay(5); // Default 5 minutes per day
        setEventType(data.event_type);
      } catch (err) {
        console.error("Error loading event:", err);
      }
    };

    loadEvent();
  }, [eventId, user]);

  useEffect(() => {
    if (daysLeft > 0) {
      generatePlan();
    }
  }, [daysLeft, minutesPerDay, eventType, generatePlan]);

  return { plan, loading, minutesPerDay, daysLeft, eventType };
};
