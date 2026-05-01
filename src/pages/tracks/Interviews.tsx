import { useState } from "react";
import { TrackShell } from "@/components/TrackShell";
import { RecorderPanel } from "@/components/RecorderPanel";
import { Button } from "@/components/ui/button";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const CommonMistake = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
    <div className="text-sm text-foreground/90">{children}</div>
  </div>
);

interface Question {
  q: string;
  type: "Behavioural" | "Tell me about yourself" | "Strengths/Weaknesses" | "Why this role" | "Salary" | "Curveball";
  guidance: string;
  example: string;
}

const QUESTIONS: Question[] = [
  {
    q: "Tell me about yourself.",
    type: "Tell me about yourself",
    guidance:
      "Use Present · Past · Future. One line on what you do now, two on the experience that built you, one on why this role is the natural next step. 60–90 seconds. No life story.",
    example:
      "I'm a product designer focused on fintech. The last four years I've shipped onboarding flows for two startups, taking one from a 38% to a 71% completion rate. I'm here because your team is solving the same problem at scale, and that's exactly the work I want to do next.",
  },
  {
    q: "Tell me about a time you failed.",
    type: "Behavioural",
    guidance:
      "STAR: Situation, Task, Action, Result. Pick a real failure with a clean lesson. Don't pick something fake-humble (\"I work too hard\"). Land on what you changed because of it.",
    example:
      "S: Led a launch with a team of five. T: Ship in eight weeks. A: I overpromised scope and didn't push back. R: We slipped two weeks and morale dropped. Since then I run a written scoping doc on day one, and I haven't missed a launch date in two years.",
  },
  {
    q: "Tell me about a time you had a conflict with a coworker.",
    type: "Behavioural",
    guidance:
      "Show maturity, not blame. Describe the disagreement neutrally, the conversation you initiated, and the outcome. Focus on what you owned.",
    example:
      "An engineer and I disagreed on the scope of an MVP. I asked for a 30-minute session where we each wrote our top three priorities. Three of six matched. We shipped those, parked the rest. The feature went live in three weeks instead of eight.",
  },
  {
    q: "What is your greatest strength?",
    type: "Strengths/Weaknesses",
    guidance:
      "One strength + one short proof + one outcome. Choose a strength relevant to the role. Avoid generic words like 'hardworking'.",
    example:
      "Translating messy customer feedback into a clear product spec. Last quarter I synthesised 200 support tickets into three feature bets — two of them shipped and lifted retention by 9%.",
  },
  {
    q: "What is your greatest weakness?",
    type: "Strengths/Weaknesses",
    guidance:
      "Pick a real weakness, name how you noticed it, then the system you built to manage it. Never say 'perfectionist'.",
    example:
      "I used to over-prepare for meetings — I'd write five pages of notes and lose the thread live. I now write a single one-page brief with three bullets. Meetings are shorter and decisions land faster.",
  },
  {
    q: "Why do you want to work here?",
    type: "Why this role",
    guidance:
      "Show you researched. One sentence on something specific (a product decision, a value, a recent launch). One sentence on how your skills slot in. One sentence on what you'd want to learn.",
    example:
      "Your bet on async-first communication is the way I already work, and the new collaboration product looks like the cleanest take on the problem I've seen. I'd bring four years of growth experience and learn a lot from how your team thinks about retention.",
  },
  {
    q: "What are your salary expectations?",
    type: "Salary",
    guidance:
      "Anchor with a researched range, not a single number. Tie it to value. Stay friendly and firm. If pushed for one number, give the upper third of your range.",
    example:
      "Based on the role, my experience, and market data for this city, I'm looking in the 95–115k range. I'm flexible on the mix between base and equity if that helps you make a strong offer.",
  },
  {
    q: "Where do you see yourself in five years?",
    type: "Why this role",
    guidance:
      "Show ambition aimed at the company, not away from it. Describe the kind of work and impact you want — not a job title at another firm.",
    example:
      "Leading a small team that owns end-to-end on a product surface. I'd want to be the person new hires shadow in their first week — and to still be learning from the people around me.",
  },
  {
    q: "Why are you leaving your current job?",
    type: "Curveball",
    guidance:
      "Stay positive. Frame it as growth, scope, or alignment — not complaints about your manager or company.",
    example:
      "I've learned a lot but I've outgrown the surface area I own. I want a role with more ambiguity and a bigger product to shape — which is exactly what this looks like.",
  },
  {
    q: "Do you have any questions for us?",
    type: "Curveball",
    guidance:
      "Always have three. Ask about: how success is measured in the first 90 days, what makes someone thrive on the team, and one specific thing you read about the company.",
    example:
      "What does great look like in this role at the 90-day mark? · What separates the people who thrive on this team from the ones who struggle? · I read about your move to weekly releases — what surprised you in the first month?",
  },
];

const STAR = [
  { letter: "S", word: "Situation", line: "Set the scene in one sentence." },
  { letter: "T", word: "Task", line: "What were you responsible for?" },
  { letter: "A", word: "Action", line: "What did you specifically do? Use 'I', not 'we'." },
  { letter: "R", word: "Result", line: "Numbers if you have them. Lesson if you don't." },
];

const Interviews = () => {
  const [active, setActive] = useState(0);
  const current = QUESTIONS[active];

  return (
    <TrackShell
      eyebrow="Job Interviews · 10 questions"
      title={
        <>
          The questions you'll <em className="text-primary not-italic">actually be asked.</em>
        </>
      }
      intro="Pick a question, read the guidance, then say your answer out loud and record it. Every question includes a worked example you can model."
    >
      <div className="space-y-4 mb-2">
        <CommonMistake>The STAR framework helps, but the real test is: did I own it? Use "I" not "we" in the Action step.</CommonMistake>
        <CommonMistake>Avoid fake-humble weaknesses ("I work too hard"). Pick a real one and show how you fixed it.</CommonMistake>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-8">
        <aside className="space-y-2 lg:sticky lg:top-24 self-start max-h-[80vh] overflow-y-auto pr-2">
          {QUESTIONS.map((qu, i) => (
            <button
              key={qu.q}
              onClick={() => setActive(i)}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-colors flex items-start gap-3",
                active === i
                  ? "bg-card-gradient border-primary/40"
                  : "border-border hover:border-foreground/30",
              )}
            >
              <span
                className={cn(
                  "font-mono text-xs mt-1",
                  active === i ? "text-primary" : "text-muted-foreground",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium leading-snug">{qu.q}</span>
                <span className="block text-xs text-muted-foreground mt-1">{qu.type}</span>
              </span>
              <ChevronRight className={cn("h-4 w-4 mt-1 shrink-0", active === i ? "text-primary" : "text-muted-foreground")} />
            </button>
          ))}
        </aside>

        <div className="space-y-6">
          <div className="bg-card-gradient border border-border rounded-3xl p-8 md:p-10">
            <p className="text-xs uppercase tracking-widest text-primary mb-3">{current.type}</p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold leading-tight mb-8 text-pretty">
              "{current.q}"
            </h2>

            <div className="border-l-2 border-primary pl-5 mb-8">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">How to answer</p>
              <p className="text-foreground/90 leading-relaxed">{current.guidance}</p>
            </div>

            <div className="bg-muted/40 rounded-2xl p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Worked example</p>
              <p className="font-display text-lg italic leading-relaxed text-pretty">{current.example}</p>
            </div>
          </div>

          <RecorderPanel
            label="Say your answer out loud"
            hint="Aim for 60–90 seconds. Record. Listen for fillers ('um', 'like'), pacing, and whether your point lands."
            targetSeconds={75}
          />

          <div className="border border-border rounded-3xl p-6 md:p-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-5">The STAR framework</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {STAR.map((s) => (
                <div key={s.letter} className="flex gap-4">
                  <span className="grid place-items-center h-10 w-10 rounded-full bg-warm text-primary-foreground font-display font-bold shrink-0">
                    {s.letter}
                  </span>
                  <div>
                    <p className="font-semibold">{s.word}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.line}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setActive((a) => Math.max(0, a - 1))}
              disabled={active === 0}
            >
              ← Previous question
            </Button>
            <Button
              variant="hero"
              onClick={() => setActive((a) => Math.min(QUESTIONS.length - 1, a + 1))}
              disabled={active === QUESTIONS.length - 1}
            >
              Next question →
            </Button>
          </div>
        </div>
      </div>
    </TrackShell>
  );
};

export default Interviews;
