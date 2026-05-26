import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type NodeStatus = "locked" | "available" | "completed";
export type NodeType = "lesson" | "test";

export interface PathwayLesson {
  id: string;
  type: NodeType;
  chapterId: string;
  title: string;
  subtitle: string;
  objective: string;
  instructions: string[];
  prompt: string;
  durationSeconds: number;
  selfReview: string[];
  passScore?: number;
}

export interface PathwayChapter {
  id: string;
  name: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  tagline: string;
  promise: string;
  color: string;
  lessons: PathwayLesson[];
}

// ─── Chapter 1: Warm Up (Beginner) ──────────────────────────────
const WARMUP_LESSONS: PathwayLesson[] = [
  {
    id: "wu-1", type: "lesson", chapterId: "warmup",
    title: "Say Hello", subtitle: "Your name, three ways",
    objective: "Get comfortable hearing your own voice on a recording.",
    instructions: [
      "Say your name three times in a row.",
      "First calm and clear. Then warmly, like greeting a friend. Then boldly, like introducing yourself on stage.",
    ],
    prompt: "Hi, I'm [your name]. Say it three different ways.",
    durationSeconds: 20,
    selfReview: ["Did each one sound different?"],
  },
  {
    id: "wu-2", type: "lesson", chapterId: "warmup",
    title: "One Thing You Love", subtitle: "A tiny honest opinion",
    objective: "Talk about something you actually care about — short and real.",
    instructions: [
      "Pick one thing: a food, a song, a place, anything.",
      "Tell us what it is and one reason you love it. Keep it under 30 seconds.",
    ],
    prompt: "I love ___ because ___.",
    durationSeconds: 30,
    selfReview: ["Did I sound like I meant it?"],
  },
  {
    id: "wu-3", type: "lesson", chapterId: "warmup",
    title: "Walk Me Through Your Morning", subtitle: "A tiny narrative",
    objective: "Tell a small story in order — start, middle, end.",
    instructions: [
      "Describe your morning, from waking up to right now.",
      "Keep the events in order. Don't worry about being interesting — just clear.",
    ],
    prompt: "This is how my morning went…",
    durationSeconds: 45,
    selfReview: ["Was it easy to follow?"],
  },
  {
    id: "wu-4", type: "test", chapterId: "warmup",
    title: "Introduce Yourself", subtitle: "60-second self-intro",
    objective: "Combine name, what you love, and a moment from your life into a single intro.",
    instructions: [
      "Open with your name.",
      "Share one thing you care about.",
      "End with something memorable — a question, a quote, or a tiny story.",
    ],
    prompt: "Tell us who you are in 60 seconds.",
    durationSeconds: 60,
    passScore: 55,
    selfReview: ["Did I sound like myself?", "Did I land the ending?"],
  },
];

// ─── Chapter 2: Get Clear (Beginner → Intermediate) ─────────────
const CLEAR_LESSONS: PathwayLesson[] = [
  {
    id: "gc-1", type: "lesson", chapterId: "clear",
    title: "Rule of Three", subtitle: "Three reasons, neatly",
    objective: "Organize a thought into three distinct points.",
    instructions: [
      "Pick a topic you know.",
      "List three reasons. Say 'first,' 'second,' 'third.' Don't overlap them.",
    ],
    prompt: "Three reasons people should visit your hometown.",
    durationSeconds: 60,
    selfReview: ["Did I actually have three?"],
  },
  {
    id: "gc-2", type: "lesson", chapterId: "clear",
    title: "Power Pause", subtitle: "Silence is loud",
    objective: "Use intentional pauses to land your points.",
    instructions: [
      "Say your most important sentence.",
      "Then stop completely. Count to two. Then continue.",
    ],
    prompt: "Tell me one thing you'd change about your school or workplace.",
    durationSeconds: 60,
    selfReview: ["Did the silence feel powerful or awkward?"],
  },
  {
    id: "gc-3", type: "lesson", chapterId: "clear",
    title: "Teach Me a Small Thing", subtitle: "Step by step",
    objective: "Walk someone through a simple how-to in clear steps.",
    instructions: [
      "Pick something tiny: making tea, tying a knot, sending a clean email.",
      "Number your steps. Make it so a beginner could follow.",
    ],
    prompt: "Teach me how to make your go-to snack or drink.",
    durationSeconds: 60,
    selfReview: ["Could a 10-year-old follow?"],
  },
  {
    id: "gc-4", type: "test", chapterId: "clear",
    title: "Tell a Real Story", subtitle: "Beginning, middle, end",
    objective: "Tell a true story with clear shape and a satisfying ending.",
    instructions: [
      "Set the scene in one sentence.",
      "Build to a turn — what changed?",
      "Land the resolution.",
    ],
    prompt: "Tell me about a moment that surprised you.",
    durationSeconds: 90,
    passScore: 65,
    selfReview: ["Was there real tension?", "Did the ending pay off?"],
  },
];

// ─── Chapter 3: Sound Confident (Intermediate) ──────────────────
const CONFIDENT_LESSONS: PathwayLesson[] = [
  {
    id: "sc-1", type: "lesson", chapterId: "confident",
    title: "Filler-Free Minute", subtitle: "Zero 'um, uh, like'",
    objective: "Speak for 60 seconds without any filler words.",
    instructions: [
      "Replace every 'um' with silence. Pause if you need to think.",
      "Silence beats filler every time.",
    ],
    prompt: "Describe your dream weekend — and what makes it dreamy.",
    durationSeconds: 60,
    selfReview: ["Did the silence feel okay?"],
  },
  {
    id: "sc-2", type: "lesson", chapterId: "confident",
    title: "Voice Range", subtitle: "Low gear, high gear",
    objective: "Use vocal variety — lower for serious, brighter for excited.",
    instructions: [
      "Tell a story where something went wrong, then right.",
      "Use a lower tone for the trouble. Raise it as things turn.",
    ],
    prompt: "Tell me about a time something went wrong — and then worked out.",
    durationSeconds: 75,
    selfReview: ["Was the contrast clear?"],
  },
  {
    id: "sc-3", type: "lesson", chapterId: "confident",
    title: "Hook 'Em Fast", subtitle: "First 10 seconds count",
    objective: "Open with a hook strong enough that people want to keep listening.",
    instructions: [
      "Don't start with 'so,' 'hi,' or 'today I want to talk about.'",
      "Start with a question, a surprising number, or a vivid image.",
    ],
    prompt: "Pitch your favorite hobby to someone who's never tried it.",
    durationSeconds: 60,
    selfReview: ["Would I have kept listening?"],
  },
  {
    id: "sc-4", type: "test", chapterId: "confident",
    title: "90-Second Pitch", subtitle: "Everything together",
    objective: "Combine hook, structure, vocal variety, and zero filler.",
    instructions: [
      "Open with a hook.",
      "Use rule of three OR a clear story.",
      "Use at least one intentional pause.",
      "No filler words.",
    ],
    prompt: "Convince me that something you love is worth my time.",
    durationSeconds: 90,
    passScore: 70,
    selfReview: ["Did I sound confident?", "Was the structure obvious?"],
  },
];

// ─── Chapter 4: Take the Stage (Advanced) ───────────────────────
const STAGE_LESSONS: PathwayLesson[] = [
  {
    id: "ts-1", type: "lesson", chapterId: "stage",
    title: "Quick Thinking", subtitle: "Cold prompt, hot answer",
    objective: "Answer an unfamiliar question with structure under pressure.",
    instructions: [
      "Acknowledge the question to buy 2 seconds. ('That's a good one — let me think.')",
      "Use rule of three to structure your answer.",
    ],
    prompt: "What's one rule everyone follows but nobody questions?",
    durationSeconds: 75,
    selfReview: ["Did I sound steady?"],
  },
  {
    id: "ts-2", type: "lesson", chapterId: "stage",
    title: "Handle the Tough One", subtitle: "Stay calm under fire",
    objective: "Respond to a hostile or skeptical challenge without getting defensive.",
    instructions: [
      "Lower your volume. Slow your tempo.",
      "Acknowledge the challenge. Then answer with one clear point.",
    ],
    prompt: "Someone just told you your idea is naive. Respond with grace.",
    durationSeconds: 60,
    selfReview: ["Did I stay composed?"],
  },
  {
    id: "ts-3", type: "lesson", chapterId: "stage",
    title: "Persuade With a Story", subtitle: "Story + fact + ask",
    objective: "Move someone using a personal story, one piece of evidence, and a clear ask.",
    instructions: [
      "Open with a 20-second story.",
      "Drop one fact or number that backs up your point.",
      "End with a specific call to action.",
    ],
    prompt: "Persuade me to care about something you care about.",
    durationSeconds: 90,
    selfReview: ["Did the story land?", "Was the ask specific?"],
  },
  {
    id: "ts-4", type: "test", chapterId: "stage",
    title: "The Keynote", subtitle: "Final capstone",
    objective: "Deliver a 2-minute keynote on something that matters. Use everything you've learned.",
    instructions: [
      "Hook → story → main point → call to action.",
      "Zero filler. Intentional pauses. Vocal variety.",
      "Own the moment.",
    ],
    prompt: "Give a 2-minute talk on 'the one thing I wish more people understood.'",
    durationSeconds: 120,
    passScore: 80,
    selfReview: ["Was this my best work?", "Did I feel in command?"],
  },
];

const CHAPTERS: PathwayChapter[] = [
  {
    id: "warmup",
    name: "Warm Up",
    level: "Beginner",
    tagline: "Just make some sounds.",
    promise: "Hear your own voice on tape and get comfortable. Each drill is under a minute.",
    color: "#22C55E",
    lessons: WARMUP_LESSONS,
  },
  {
    id: "clear",
    name: "Get Clear",
    level: "Beginner",
    tagline: "Sound organized, on demand.",
    promise: "Add structure so people can follow you — even when you haven't prepared.",
    color: "#3B82F6",
    lessons: CLEAR_LESSONS,
  },
  {
    id: "confident",
    name: "Sound Confident",
    level: "Intermediate",
    tagline: "Like you actually mean it.",
    promise: "Drop fillers, vary your voice, and hook attention from the first sentence.",
    color: "#8B5CF6",
    lessons: CONFIDENT_LESSONS,
  },
  {
    id: "stage",
    name: "Take the Stage",
    level: "Advanced",
    tagline: "Command the room.",
    promise: "Handle pressure, persuade with story, and deliver a keynote worth remembering.",
    color: "#F97316",
    lessons: STAGE_LESSONS,
  },
];

export const ALL_LESSONS = CHAPTERS.flatMap(c => c.lessons);

export const usePathway = () => {
  const { user } = useAuth();
  const [chapters] = useState<PathwayChapter[]>(CHAPTERS);
  const [progress, setProgress] = useState<Record<string, NodeStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("pathway_progress")
          .eq("id", user.id)
          .single();

        if (error && error.code !== "42703") throw error;

        const stored = (data?.pathway_progress as Record<string, NodeStatus>) || {};
        // Drop any orphaned ids from old pathway content
        const validIds = new Set(ALL_LESSONS.map(l => l.id));
        const cleaned: Record<string, NodeStatus> = {};
        for (const [id, status] of Object.entries(stored)) {
          if (validIds.has(id)) cleaned[id] = status;
        }

        // Always unlock the first lesson
        const firstId = CHAPTERS[0].lessons[0].id;
        if (cleaned[firstId] !== "completed") {
          cleaned[firstId] = "available";
        }

        setProgress(cleaned);
      } catch (err) {
        console.error("[Pathway] fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user]);

  // Sync progress to DB
  useEffect(() => {
    if (!user || loading) return;
    if (Object.keys(progress).length === 0) return;

    const sync = async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ pathway_progress: progress })
        .eq("id", user.id);
      if (error) console.error("[Pathway] sync error:", error);
    };
    sync();
  }, [progress, user, loading]);

  const getNodeStatus = useCallback(
    (id: string): NodeStatus => progress[id] || "locked",
    [progress]
  );

  const completeLesson = useCallback(
    (id: string) => {
      if (!user) return;
      setProgress(prev => {
        const next = { ...prev, [id]: "completed" as NodeStatus };
        outer: for (const ch of CHAPTERS) {
          for (let i = 0; i < ch.lessons.length; i++) {
            if (ch.lessons[i].id === id) {
              // Unlock next in chapter
              if (i + 1 < ch.lessons.length) {
                const nextId = ch.lessons[i + 1].id;
                if (next[nextId] !== "completed") next[nextId] = "available";
              } else {
                // Unlock first lesson of next chapter
                const chIdx = CHAPTERS.indexOf(ch);
                if (chIdx + 1 < CHAPTERS.length) {
                  const nextId = CHAPTERS[chIdx + 1].lessons[0].id;
                  if (next[nextId] !== "completed") next[nextId] = "available";
                }
              }
              break outer;
            }
          }
        }
        return next;
      });
    },
    [user]
  );

  const totalLessons = ALL_LESSONS.length;
  const completedLessons = Object.entries(progress)
    .filter(([_, s]) => s === "completed")
    .map(([id]) => id);
  const completedCount = completedLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // state object kept for ProgressReport compatibility
  const state = {
    completedLessons,
    testScores: {} as Record<string, number>,
  };

  return {
    chapters,
    units: chapters, // alias for ProgressReport
    loading,
    state,
    getNodeStatus,
    completeLesson,
    progressPercent,
    completedCount,
    totalLessons,
  };
};
