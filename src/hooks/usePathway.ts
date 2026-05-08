import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const LS_KEY = "speakbold.pathway.v6";

export type NodeStatus = "locked" | "available" | "completed";
export type NodeType = "lesson" | "test";
export type UnitId = 
  | "vocal" 
  | "impromptu" 
  | "rhetoric" 
  | "interviews" 
  | "body" 
  | "conflict" 
  | "executive" 
  | "mastery";

export interface PathwayLesson {
  id: string;
  type: NodeType;
  unitId: UnitId;
  title: string;
  subtitle: string;
  objective: string;
  instructions: string[];
  prompt: string;
  durationSeconds: number;
  selfReview: string[];
  passScore?: number;
}

export interface PathwayUnit {
  id: UnitId;
  name: string;
  tagline: string;
  color: string;
  lessons: PathwayLesson[];
}

// ─── Unit 1: Vocal Mastery ───────────────────────────────────────
const VOCAL_LESSONS: PathwayLesson[] = [
  {
    id: "v-1",
    type: "lesson",
    unitId: "vocal",
    title: "Filler Word Detox",
    subtitle: "Silence is strength",
    objective: "Eliminate confidence leaks like 'um' and 'uh'. Replace them with intentional pauses.",
    instructions: [
      "Record yourself answering: 'Describe your last week.'",
      "Count filler words. Answer again, replacing fillers with silence.",
    ],
    prompt: "Describe your ideal career in 60 seconds. Eliminate all filler words.",
    durationSeconds: 60,
    selfReview: ["Did I catch the fillers?", "Did the silence feel powerful?"],
  },
  {
    id: "v-2",
    type: "lesson",
    unitId: "vocal",
    title: "Vocal Range Drill",
    subtitle: "Low anchor, high energy",
    objective: "Master pitch shifting to signal authority and engagement.",
    instructions: [
      "Use a low voice for serious claims, and an energized voice for exciting ones.",
    ],
    prompt: "Tell a story where something went wrong, then right. Use pitch to show the shift.",
    durationSeconds: 60,
    selfReview: ["Was the contrast clear?", "Did I sound authentic?"],
  },
  {
    id: "v-3",
    type: "lesson",
    unitId: "vocal",
    title: "The Strategic Pause",
    subtitle: "Commanding attention",
    objective: "Use a 2-second pause after a key point to let it land.",
    instructions: [
      "Say your main claim, then stop completely for 2 seconds.",
    ],
    prompt: "Share your opinion on a controversial topic. Use a full 2-second pause after your main point.",
    durationSeconds: 60,
    selfReview: ["Did I rush the pause?", "Did it feel intentional?"],
  },
  {
    id: "v-4",
    type: "lesson",
    unitId: "vocal",
    title: "Articulation Sprint",
    subtitle: "Clarity under pressure",
    objective: "Improve your diction and prevent mumbling.",
    instructions: [
      "Over-articulate every consonant in this drill.",
    ],
    prompt: "Read a complex news paragraph aloud with extreme clarity. Don't skip a single syllable.",
    durationSeconds: 45,
    selfReview: ["Was every word clear?", "Did I trip over my tongue?"],
  },
  {
    id: "v-5",
    type: "test",
    unitId: "vocal",
    title: "Vocal Mastery Final",
    subtitle: "Certification Drill",
    objective: "Demonstrate all vocal skills in one cohesive speech.",
    instructions: ["Use variety, pauses, and zero fillers."],
    prompt: "Deliver a 2-minute 'Vision Speech' for a project you care about.",
    durationSeconds: 120,
    passScore: 80,
    selfReview: ["Was my voice grounded?", "Did I own the room?"],
  }
];

// ─── Unit 2: Quick Thinking ─────────────────────────────────────
const IMPROMPTU_LESSONS: PathwayLesson[] = [
  {
    id: "i-1",
    type: "lesson",
    unitId: "impromptu",
    title: "The Prep-Step",
    subtitle: "Buying thinking time",
    objective: "Acknowledge the question to buy 3 seconds of calm.",
    instructions: [
      "Repeat the question thoughtfully before starting your answer.",
    ],
    prompt: "Question: 'What is the most important invention of all time?' Start with a prep-step.",
    durationSeconds: 60,
    selfReview: ["Did I look panicked?", "Did the start feel smooth?"],
  },
  {
    id: "i-2",
    type: "lesson",
    unitId: "impromptu",
    title: "The Rule of Three",
    subtitle: "Instant structure",
    objective: "Organize any thought into three distinct points.",
    instructions: [
      "Start with 'I think there are three main factors here...'",
    ],
    prompt: "Explain why your favorite book is worth reading using the Rule of Three.",
    durationSeconds: 90,
    selfReview: ["Did I find 3 points?", "Was it easy to follow?"],
  },
  {
    id: "i-3",
    type: "lesson",
    unitId: "impromptu",
    title: "PREP Framework",
    subtitle: "Point, Reason, Example, Point",
    objective: "A universal formula for structured impromptu answers.",
    instructions: [
      "State your point, give a reason, an example, and restate your point.",
    ],
    prompt: "Should high schools teach financial literacy? Use the PREP framework.",
    durationSeconds: 90,
    selfReview: ["Did I follow the structure?", "Was the example vivid?"],
  },
  {
    id: "i-4",
    type: "lesson",
    unitId: "impromptu",
    title: "Bridging Techniques",
    subtitle: "Pivoting with grace",
    objective: "Learn to pivot from a question you don't know to a topic you do.",
    instructions: [
      "Acknowledge the question and bridge to a related area of expertise.",
    ],
    prompt: "You're asked about the technical details of quantum computing. Bridge to the importance of education.",
    durationSeconds: 60,
    selfReview: ["Was the pivot subtle?", "Did I sound knowledgeable?"],
  },
  {
    id: "i-5",
    type: "test",
    unitId: "impromptu",
    title: "Impromptu Gauntlet",
    subtitle: "Thinking on your feet",
    objective: "Handle a series of random prompts with zero prep.",
    instructions: ["Switch prompts every 30 seconds."],
    prompt: "Respond to 3 random 'What If' scenarios in 90 seconds.",
    durationSeconds: 90,
    passScore: 75,
    selfReview: ["Did I maintain flow?", "Was my structure consistent?"],
  }
];

// ─── Unit 3: The Art of Persuasion ──────────────────────────────
const RHETORIC_LESSONS: PathwayLesson[] = [
  {
    id: "r-1",
    type: "lesson",
    unitId: "rhetoric",
    title: "The Hook",
    subtitle: "Instant engagement",
    objective: "Start with a vivid image, a shock, or a question.",
    instructions: ["Never start with 'Hello'. Dive straight into the value."],
    prompt: "Start a pitch for a product that saves time. The first 10 seconds must be a killer hook.",
    durationSeconds: 45,
    selfReview: ["Would they keep listening?", "Was it unique?"],
  },
  {
    id: "r-2",
    type: "lesson",
    unitId: "rhetoric",
    title: "Storytelling Architecture",
    subtitle: "Narrative tension",
    objective: "Build a story with a clear conflict and resolution.",
    instructions: ["Define the 'Inciting Incident' clearly."],
    prompt: "Tell a story about the biggest hurdle you overcame last year.",
    durationSeconds: 90,
    selfReview: ["Was there real tension?", "Was the resolution satisfying?"],
  },
  {
    id: "r-3",
    type: "lesson",
    unitId: "rhetoric",
    title: "Ethos, Pathos, Logos",
    subtitle: "The persuasion triad",
    objective: "Balance credibility, emotion, and logic in one pitch.",
    instructions: ["Use one data point and one personal story."],
    prompt: "Persuade an audience to donate to a cause. Use all three rhetorical pillars.",
    durationSeconds: 120,
    selfReview: ["Did I use data?", "Did I connect emotionally?"],
  },
  {
    id: "r-4",
    type: "lesson",
    unitId: "rhetoric",
    title: "The Call to Action",
    subtitle: "Closing with intent",
    objective: "Never leave an audience wondering what to do next.",
    instructions: ["End with a specific, actionable request."],
    prompt: "Finish a presentation on a new workflow. The closing must be a clear call to action.",
    durationSeconds: 60,
    selfReview: ["Was it specific?", "Was it easy to do?"],
  }
];

// ─── Unit 4: Interview Mastery ──────────────────────────────────
const INTERVIEW_LESSONS: PathwayLesson[] = [
  {
    id: "im-1",
    type: "lesson",
    unitId: "interviews",
    title: "The STAR Method",
    subtitle: "Results-driven answers",
    objective: "Structure behavioral answers around Actions and Results.",
    instructions: ["Spend 50% of your time on the 'Action'."],
    prompt: "Tell me about a time you handled a significant failure.",
    durationSeconds: 120,
    selfReview: ["Was the result quantified?", "Was the action specific?"],
  },
  {
    id: "im-2",
    type: "lesson",
    unitId: "interviews",
    title: "The Weakness Pivot",
    subtitle: "Authenticity vs Strategy",
    objective: "Discuss a real weakness and how you're actively fixing it.",
    instructions: ["Avoid 'perfectionism'. Pick a real skill gap."],
    prompt: "What is your greatest weakness?",
    durationSeconds: 90,
    selfReview: ["Did I sound defensive?", "Was the fix convincing?"],
  },
  {
    id: "im-3",
    type: "lesson",
    unitId: "interviews",
    title: "Cultural Fit Storytelling",
    subtitle: "Values in action",
    objective: "Demonstrate you share the company's core values.",
    instructions: ["Pick a story where you embodied a specific value."],
    prompt: "Why should we hire you over other candidates?",
    durationSeconds: 120,
    selfReview: ["Did I sound like part of the team?", "Was I too arrogant?"],
  },
  {
    id: "im-4",
    type: "test",
    unitId: "interviews",
    title: "The Mock Interview",
    subtitle: "Final Simulation",
    objective: "Handle a 3-question sequence without breaking character.",
    instructions: ["Treat this like the real thing."],
    prompt: "Answer: (1) Why us? (2) Conflict story. (3) Goal story.",
    durationSeconds: 180,
    passScore: 85,
    selfReview: ["Did I maintain eye contact?", "Were my answers crisp?"],
  }
];

// ─── Unit 5: Body Language & Presence ──────────────────────────
const BODY_LESSONS: PathwayLesson[] = [
  {
    id: "bl-1",
    type: "lesson",
    unitId: "body",
    title: "The Silent Signal",
    subtitle: "Posture and non-verbals",
    objective: "Master the 'Power Stance' and open body language to signal confidence.",
    instructions: ["Stand tall, keep hands visible, and avoid crossing arms."],
    prompt: "Give a 60-second introduction. Focus exclusively on your posture and hand positioning.",
    durationSeconds: 60,
    selfReview: ["Were my hands visible?", "Did I look defensive?"],
  },
  {
    id: "bl-2",
    type: "lesson",
    unitId: "body",
    title: "The Eye Contact Pattern",
    subtitle: "Connecting through the lens",
    objective: "Learn the 5-second rule for meaningful eye contact.",
    instructions: ["Look directly at the camera/eyes for 5 seconds per point."],
    prompt: "Explain a complex concept. Practice switching your 'focus' every two sentences.",
    durationSeconds: 90,
    selfReview: ["Did I stare too long?", "Did I look away too much?"],
  }
];

// ─── Unit 6: Conflict & Difficult Conversations ────────────────
const CONFLICT_LESSONS: PathwayLesson[] = [
  {
    id: "cc-1",
    type: "lesson",
    unitId: "conflict",
    title: "Delivering Bad News",
    subtitle: "Empathy with Clarity",
    objective: "Deliver critical feedback or bad news without damaging the relationship.",
    instructions: ["Be direct with the news, then follow with a path forward."],
    prompt: "You have to tell a teammate their part of the project isn't up to standard.",
    durationSeconds: 90,
    selfReview: ["Was I too blunt?", "Was the solution clear?"],
  },
  {
    id: "cc-2",
    type: "lesson",
    unitId: "conflict",
    title: "Handling Aggression",
    subtitle: "The De-escalation Loop",
    objective: "Stay calm when faced with an aggressive or skeptical questioner.",
    instructions: ["Lower your volume, slow your tempo, and acknowledge their emotion."],
    prompt: "Someone just insulted your proposal. Respond calmly and professionally.",
    durationSeconds: 60,
    selfReview: ["Did I get defensive?", "Did I maintain my composure?"],
  }
];

// ─── Unit 7: Executive Speaking ────────────────────────────────
const EXECUTIVE_LESSONS: PathwayLesson[] = [
  {
    id: "ex-1",
    type: "lesson",
    unitId: "executive",
    title: "The Analogy Bridge",
    subtitle: "Technical Translation",
    objective: "Explain a highly technical concept to a non-technical stakeholder.",
    instructions: ["Use a household object as an analogy for a complex system."],
    prompt: "Explain how a blockchain or cloud database works to a CEO.",
    durationSeconds: 90,
    selfReview: ["Was the analogy accurate?", "Was it simple enough?"],
  },
  {
    id: "ex-2",
    type: "lesson",
    unitId: "executive",
    title: "Data Storytelling",
    subtitle: "Beyond the Spreadsheet",
    objective: "Make numbers meaningful by attaching them to a human outcome.",
    instructions: ["State the number, then state why it matters to a person."],
    prompt: "Present a 5% increase in efficiency. Why should the team care?",
    durationSeconds: 60,
    selfReview: ["Did I focus only on numbers?", "Was the 'why' clear?"],
  }
];

// ─── Unit 8: Mastery Capstone ──────────────────────────────────
const MASTERY_LESSONS: PathwayLesson[] = [
  {
    id: "mc-1",
    type: "test",
    unitId: "mastery",
    title: "The Visionary Keynote",
    subtitle: "The Final Gauntlet",
    objective: "Combine all skills (Vocal, Rhetoric, Body, Executive) into one masterpiece.",
    instructions: ["Use a hook, a STAR story, and a clear call to action."],
    prompt: "Deliver a 3-minute keynote on 'The Future of Human Connection'.",
    durationSeconds: 180,
    passScore: 90,
    selfReview: ["Was this my best work?", "Did I feel truly in command?"],
  }
];

export const ALL_LESSONS = [
  ...VOCAL_LESSONS,
  ...IMPROMPTU_LESSONS,
  ...RHETORIC_LESSONS,
  ...INTERVIEW_LESSONS,
  ...BODY_LESSONS,
  ...CONFLICT_LESSONS,
  ...EXECUTIVE_LESSONS,
  ...MASTERY_LESSONS,
];

// Use hex colors for direct style usage
const BASE_PATHWAY_UNITS: PathwayUnit[] = [
  { id: "vocal", name: "Vocal Mastery", tagline: "Foundations of Sound", color: "#3B82F6", lessons: VOCAL_LESSONS },
  { id: "impromptu", name: "Quick Thinking", tagline: "Impromptu Mastery", color: "#F43F5E", lessons: IMPROMPTU_LESSONS },
  { id: "rhetoric", name: "The Art of Persuasion", tagline: "Rhetoric & Influence", color: "#8B5CF6", lessons: RHETORIC_LESSONS },
  { id: "interviews", name: "Interview Mastery", tagline: "Professional Stakes", color: "#10B981", lessons: INTERVIEW_LESSONS },
  { id: "body", name: "The Silent Signal", tagline: "Presence & Body Language", color: "#F59E0B", lessons: BODY_LESSONS },
  { id: "conflict", name: "High Stakes", tagline: "Conflict & Difficult Talks", color: "#EF4444", lessons: CONFLICT_LESSONS },
  { id: "executive", name: "Executive Speaking", tagline: "Technical & Data Influence", color: "#06B6D4", lessons: EXECUTIVE_LESSONS },
  { id: "mastery", name: "Mastery Capstone", tagline: "The Visionary Keynote", color: "#6366F1", lessons: MASTERY_LESSONS },
];

export const usePathway = () => {
  const { user } = useAuth();
  const [units, setUnits] = useState<PathwayUnit[]>(BASE_PATHWAY_UNITS);
  const [progress, setProgress] = useState<Record<string, NodeStatus>>({});
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProgress = async () => {
      try {
        const localSelection = localStorage.getItem("speakbold_pathway_selection");
        
        const { data, error } = await supabase
          .from("profiles")
          .select("pathway_progress, pathway_selection")
          .eq("id", user.id)
          .single();

        if (error && error.code !== '42703') throw error;

        const sel = data?.pathway_selection || localSelection;
        setSelection(sel);

        let reorderedUnits = [...BASE_PATHWAY_UNITS];

        if (sel === "vocal") {
          const order: UnitId[] = ["vocal", "impromptu", "body", "rhetoric", "conflict", "interviews", "executive", "mastery"];
          reorderedUnits = order.map(id => reorderedUnits.find(u => u.id === id)!).filter(Boolean);
        } else if (sel === "interviews") {
          const order: UnitId[] = ["interviews", "vocal", "executive", "conflict", "rhetoric", "impromptu", "body", "mastery"];
          reorderedUnits = order.map(id => reorderedUnits.find(u => u.id === id)!).filter(Boolean);
        } else if (sel === "impromptu") {
          const order: UnitId[] = ["impromptu", "vocal", "conflict", "rhetoric", "body", "executive", "interviews", "mastery"];
          reorderedUnits = order.map(id => reorderedUnits.find(u => u.id === id)!).filter(Boolean);
        }

        setUnits(reorderedUnits);
        
        if (data?.pathway_progress && Object.keys(data.pathway_progress).length > 0) {
          console.log("[Pathway] Loaded progress from DB:", data.pathway_progress);
          setProgress(data.pathway_progress as Record<string, NodeStatus>);
        } else {
          console.log("[Pathway] No progress found in DB, initializing first lesson.");
          const initialProgress: Record<string, NodeStatus> = {};
          if (reorderedUnits.length > 0 && reorderedUnits[0].lessons.length > 0) {
            initialProgress[reorderedUnits[0].lessons[0].id] = "available";
          }
          setProgress(initialProgress);
        }
      } catch (err) {
        console.error("Error fetching progress:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user]);

  const completeLesson = useCallback(async (lessonId: string) => {
    if (!user) return;

    setProgress(prev => {
      const newProgress = { ...prev, [lessonId]: "completed" as NodeStatus };
      
      let found = false;
      for (const unit of units) {
        for (let i = 0; i < unit.lessons.length; i++) {
          if (unit.lessons[i].id === lessonId) {
            if (i + 1 < unit.lessons.length) {
              newProgress[unit.lessons[i + 1].id] = "available";
            } else {
              const unitIdx = units.indexOf(unit);
              if (unitIdx + 1 < units.length) {
                newProgress[units[unitIdx + 1].lessons[0].id] = "available";
              }
            }
            found = true;
            break;
          }
        }
        if (found) break;
      }

      console.log("[Pathway] Updating progress:", newProgress);
      
      // Async update to DB
      supabase
        .from("profiles")
        .update({ pathway_progress: newProgress })
        .eq("id", user.id)
        .then(({ error }) => {
          if (error) console.error("[Pathway] DB update failed:", error);
          else console.log("[Pathway] DB update successful");
        });

      return newProgress;
    });
  }, [user, units]);

  const getNodeStatus = useCallback((nodeId: string): NodeStatus => {
    return progress[nodeId] || "locked";
  }, [progress]);

  const getAttemptsLeft = useCallback((lessonId: string) => {
    return 3;
  }, []);

  const recordAttempt = useCallback((lessonId: string) => {
    console.log(`[Pathway] Recording attempt for ${lessonId}`);
  }, []);

  const recordTestScore = useCallback((lessonId: string, score: number) => {
    if (score >= 70) {
      completeLesson(lessonId);
    }
  }, [completeLesson]);

  const totalLessons = units.reduce((acc, u) => acc + u.lessons.length, 0);
  const completedLessons = Object.entries(progress)
    .filter(([_, status]) => status === "completed")
    .map(([id, _]) => id);
  const completedCount = completedLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const state = {
    completedLessons,
    testScores: {}, 
  };

  return {
    state,
    units,
    loading,
    selection,
    getNodeStatus,
    getAttemptsLeft,
    recordAttempt,
    completeLesson,
    recordTestScore,
    progressPercent,
    completedCount,
    totalLessons,
  };
};
