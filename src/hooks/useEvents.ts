import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type EventType = 'interview' | 'presentation' | 'conference' | 'wedding' | 'other';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: EventType;
  location: string | null;
  archived: boolean;
  minutes_per_day: number;
  created_at: string;
  updated_at: string;
}

export const useEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .order("event_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error("Error loading events:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createEvent = useCallback(async (event: {
    title: string;
    description?: string;
    event_date: Date;
    event_type: EventType;
    location?: string;
    minutes_per_day?: number;
  }) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id: user.id,
        title: event.title,
        description: event.description || null,
        event_date: event.event_date.toISOString(),
        event_type: event.event_type,
        location: event.location || null,
        minutes_per_day: event.minutes_per_day || 5,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating event:", error);
      return null;
    }

    await refresh();
    return data;
  }, [user, refresh]);

  const updateEvent = useCallback(async (id: string, updates: Partial<Event>) => {
    if (!user) return;

    const { error } = await supabase
      .from("events")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating event:", error);
      return;
    }

    await refresh();
  }, [user, refresh]);

  const archiveEvent = useCallback(async (id: string) => {
    await updateEvent(id, { archived: true });
  }, [updateEvent]);

  const deleteEvent = useCallback(async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting event:", error);
      return;
    }

    setEvents(prev => prev.filter(e => e.id !== id));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Filter events
  const now = new Date();
  const upcomingEvents = events.filter(e => 
    !e.archived && new Date(e.event_date) > now
  );
  const pastEvents = events.filter(e => 
    e.archived || new Date(e.event_date) <= now
  );

  return {
    events,
    upcomingEvents,
    pastEvents,
    loading,
    createEvent,
    updateEvent,
    archiveEvent,
    deleteEvent,
    refresh,
  };
};
