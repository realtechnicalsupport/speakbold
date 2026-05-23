import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface PracticeActivity {
  title: string;
  content: string; // The actual prompt/question to practice
  track: string;
  trackUrl: string;
  duration: number;
  difficulty: string;
}

export interface PracticeDay {
  dayNumber: number;
  date: string;
  activities: PracticeActivity[];
  completed: boolean;
}

export interface PracticePlan {
  eventId: string;
  isCustom: boolean;
  days: PracticeDay[];
}

const TRACK_MAP: Record<string, { url: string; track: string }> = {
  interview: { url: "/tracks/interviews", track: "interviews" },
  presentation: { url: "/tracks/public-speaking", track: "public-speaking" },
  conference: { url: "/tracks/public-speaking", track: "public-speaking" },
  wedding: { url: "/tracks/public-speaking", track: "public-speaking" },
  impromptu: { url: "/tracks/impromptu", track: "impromptu" },
  other: { url: "/tracks/impromptu", track: "impromptu" },
};

export const usePracticePlan = (eventId: string | undefined) => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PracticePlan | null>(null);
  const [loading, setLoading] = useState(false);

  const generatePlan = useCallback(async (
    eventType: string,
    focusAreas: string[],
    daysUntilEvent: number,
    customDescription?: string
  ) => {
    if (!user || !eventId) return null;
    setLoading(true);

    try {
      let activities: PracticeActivity[];

      if (customDescription && customDescription.trim().length > 0) {
        // Use AI to generate custom prompts based on user's description
        toast({
          title: "Generating Custom Plan",
          description: "Creating personalized prompts for your scenario...",
        });

        const eventTypeLabel = {
          interview: "job interview",
          presentation: "presentation or speech",
          conference: "conference talk",
          wedding: "wedding speech",
          other: "speaking event"
        }[eventType] || "speaking event";

        const prompt = `Generate 5 unique ${eventTypeLabel} practice prompts based on this scenario: "${customDescription}". 

Focus areas: ${focusAreas.join(", ")}

Return ONLY a valid JSON array with this exact structure:
[
  {
    "title": "Brief title (3-5 words)",
    "content": "The actual prompt or question to practice (be specific to the scenario)",
    "difficulty": "standard"
  }
]

Make prompts specific to the user's described scenario. Don't make them generic.`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY || ""}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 1024,
          }),
        });

        if (!response.ok) {
          throw new Error("AI generation failed");
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          const customPrompts = JSON.parse(jsonMatch[0]);
          activities = customPrompts.map((p: any) => ({
            title: p.title || "Custom Practice",
            content: p.content || customDescription,
            track: eventType,
            trackUrl: TRACK_MAP[eventType]?.url || "/tracks/impromptu",
            duration: 5,
            difficulty: p.difficulty || "standard",
          }));
        } else {
          throw new Error("Invalid AI response");
        }
      } else {
        // Use pre-built prompts from Supabase
        const { data: prompts, error } = await supabase
          .from("practice_prompts")
          .select("*")
          .eq("event_type", eventType)
          .limit(daysUntilEvent * 2);

        if (error || !prompts || prompts.length === 0) {
          // Fallback to generic prompts if table is empty
          activities = generateFallbackPrompts(eventType, daysUntilEvent);
        } else {
          // Shuffle and select prompts for each day
          const shuffled = [...prompts].sort(() => Math.random() - 0.5);
          activities = shuffled.slice(0, daysUntilEvent).map((p: any) => ({
            title: p.title || "Practice",
            content: p.content,
            track: p.event_type,
            trackUrl: TRACK_MAP[p.event_type]?.url || "/tracks/impromptu",
            duration: 5,
            difficulty: p.difficulty || "standard",
          }));
        }
      }

      // Build days
      const planDays: PracticeDay[] = [];
      for (let i = 1; i <= daysUntilEvent; i++) {
        const date = new Date();
        date.setDate(date.getDate() + (i - 1));
        
        planDays.push({
          dayNumber: i,
          date: date.toISOString().split('T')[0],
          activities: [activities[i - 1] || activities[0]],
          completed: false,
        });
      }

      const newPlan: PracticePlan = {
        eventId,
        isCustom: !!customDescription,
        days: planDays,
      };

      // Save to Supabase
      const { error: saveError } = await supabase
        .from("user_practice_plans")
        .upsert({
          user_id: user.id,
          event_id: eventId,
          is_custom: !!customDescription,
          plan_data: newPlan,
        }, { onConflict: "user_id,event_id" });
      
      if (saveError) {
        console.error("Save error:", saveError);
      } else {
        console.log("Plan saved successfully!");
      }

      setPlan(newPlan);
      setLoading(false);
      return newPlan;
    } catch (err) {
      console.error("Plan generation error:", err);
      // Fallback to generic prompts
      const fallbackPlan: PracticePlan = {
        eventId,
        isCustom: false,
        days: generateFallbackDays(eventType, daysUntilEvent),
      };
      setPlan(fallbackPlan);
      setLoading(false);
      return fallbackPlan;
    }
  }, [user, eventId]);

  const loadPlan = useCallback(async () => {
    if (!user || !eventId) return;
    setLoading(true);

    try {
      console.log("Loading plan for user:", user.id, "event:", eventId);
      const { data, error } = await supabase
        .from("user_practice_plans")
        .select("plan_data, is_custom")
        .eq("user_id", user.id)
        .eq("event_id", eventId)
        .maybeSingle();

      console.log("Loaded data:", data, "error:", error);
      if (data?.plan_data) {
        setPlan(data.plan_data as PracticePlan);
      }
    } catch (err) {
      console.error("Load plan error:", err);
    }
    setLoading(false);
  }, [user, eventId]);

  return { plan, loading, generatePlan, loadPlan };
};

function generateFallbackPrompts(eventType: string, count: number): PracticeActivity[] {
  const prompts: PracticeActivity[] = [];
  const track = TRACK_MAP[eventType]?.url || "/tracks/impromptu";
  
  for (let i = 0; i < count; i++) {
    prompts.push({
      title: `Practice ${i + 1}`,
      content: eventType === 'interview' 
        ? "Tell me about yourself and why you're interested in this role."
        : eventType === 'presentation'
        ? "Introduce yourself and your topic in 60 seconds."
        : "What is success? Give me your definition.",
      track: eventType,
      trackUrl: track,
      duration: 5,
      difficulty: "standard",
    });
  }
  return prompts;
}

function generateFallbackDays(eventType: string, days: number): PracticeDay[] {
  const activities = generateFallbackPrompts(eventType, days);
  const result: PracticeDay[] = [];
  
  for (let i = 1; i <= days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + (i - 1));
    result.push({
      dayNumber: i,
      date: date.toISOString().split('T')[0],
      activities: [activities[i - 1]],
      completed: false,
    });
  }
  return result;
}