import { useState } from "react";
import { TrackShell } from "@/components/TrackShell";
import { RecorderPanel } from "@/components/RecorderPanel";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Context = "small" | "large" | "stage" | "virtual";

const CONTEXTS: { id: Context; label: string; desc: string }[] = [
  { id: "small", label: "Small meeting", desc: "Under 20 people" },
  { id: "large", label: "Conference room", desc: "20–100 people" },
  { id: "stage", label: "Large event", desc: "100+ people" },
  { id: "virtual", label: "Virtual / video", desc: "On screen" },
];

const CONTEXT_GUIDANCE = {
  small: {
    pause: "0.5–1 second — feels like a beat, keeps energy tight.",
    energy: "Tighter energy, eye contact with individuals, lean in slightly.",
    pace: "Slightly faster to maintain momentum.",
  },
  large: {
    pause: "1.5–2 seconds — lets it echo, signals authority.",
    energy: "Bigger gestures, project to the back, own the room.",
    pace: "Slower, deliberate — give people time to absorb.",
  },
  stage: {
    pause: "2–3 seconds on key moments — the room needs to feel the weight.",
    energy: "Full body commitment, move with intention, don't plant.",
    pace: "Measured — every word should land in the back row.",
  },
  virtual: {
    pause: "0.5–1 second — anything longer risks losing people.",
    energy: "Closer to camera, lean toward it, minimised large gestures.",
    pace: "Faster than in-person — maintain urgency to keep attention.",
  },
};

const LESSONS = [
  {
    title: "The 10-second hook",
    duration: "5 min",
    summary:
      "Audiences decide if they're listening in the first ten seconds. Open with a sharp question, a single image, or a number that surprises.",
    drill:
      "Pick a topic you know well. Write three different opening lines: a question, an image, a stat. Record yourself reading each one. Which lands?",
    example:
      '"Three out of four people in this room will quit a meeting in their head before it even starts. Today, we change that."',
    contexts: {
      small: "Open with a direct question to the room. Make eye contact with one person as you start — it pulls the whole room in.",
      large: "Start with a number or image that travels. Your opening needs to carry to the back row.",
      stage: "Big opener — a stat, a bold claim, a pause before you say anything. Let them wonder.",
      virtual: "Smile before you start. Then go straight into the hook. You have 5 seconds before they check email.",
    },
  },
  {
    title: "Structure: Point — Story — Point",
    duration: "6 min",
    summary:
      "The cleanest structure on earth. State your point. Tell one specific story that proves it. Restate the point with new force.",
    drill:
      "Take any belief you hold. Speak for 90 seconds using PSP. Don't add a second point — discipline is the lesson.",
    example:
      'Point: "Small habits beat big plans." Story: a 30-second moment from your life. Point again, sharpened.',
    contexts: {
      small: "One person can challenge you mid-story. Be ready to defend your point.",
      large: "The story carries everything. Make it vivid — they can't ask questions, so the story must do the work.",
      stage: "Your story needs a callback to the opening. The audience should feel the loop close.",
      virtual: "Keep the story shorter (20 seconds). They can't see your body, so your voice must carry it.",
    },
  },
  {
    title: "The pause that earns attention",
    duration: "4 min",
    summary:
      "New speakers fill silence. Strong speakers use it. A pause after your headline tells the room: this matters.",
    drill:
      "Record a 60-second story. Insert one full second of silence after your most important line. Listen back — feel the weight.",
    example:
      'Try: "And then she said the one thing I never expected." (one… two…) "She said: \'You\'re ready.\'"',
    contexts: {
      small: "0.5 seconds feels like a beat. 1 second reads as intention. 2 seconds feels like you forgot your line.",
      large: "1.5–2 seconds is right. Let it land, then deliver the next line with authority.",
      stage: "2–3 seconds on the key headline. The silence should feel uncomfortable — that's when you own it.",
      virtual: "Pauses over 1 second risk losing people. Keep them tight. If you pause, move your eyes to camera.",
    },
  },
  {
    title: "Pace, pitch, and the energy curve",
    duration: "5 min",
    summary:
      "Monotone kills meaning. Vary speed: slow on the heavy lines, faster on the build. End lower than you start to land authority.",
    drill:
      "Read a paragraph aloud twice — once flat, once with deliberate variation. Record both. Compare.",
    example: "Slow: the headline. Fast: the build. Slow + low: the close.",
    contexts: {
      small: "You can be quieter. Your energy carries in a small room — watch their faces for feedback.",
      large: "Project slower. The back row needs clear enunciation. Drop your pitch on the close.",
      stage: "Every word needs to land in the last row. Speak from the diaphragm, not the throat.",
      virtual: "Slightly faster pacing. Close to the camera. Lift your energy — it flattens on screen.",
    },
  },
  {
    title: "Closing: the line they'll repeat",
    duration: "4 min",
    summary:
      "A talk lives or dies on its last line. Write it before you write anything else. Make it short, vivid, and quotable.",
    drill:
      "Write three possible closes for a short talk. Say each out loud. Keep the one your body wants to say with conviction.",
    example: '"Don\'t practice until you get it right. Practice until you can\'t get it wrong."',
    contexts: {
      small: "End with a question or call to action. In small groups, you can invite response.",
      large: "The close is your only job — make it memorable. No 'any questions' — give them a line to take with them.",
      stage: "Hold the last line for 3 seconds. Let the room sit in it. Then walk off — don't thank them.",
      virtual: "End with a clear next step. 'Let's talk after' doesn't land online — give them a specific action.",
    },
  },
];

const CommonMistake = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
    <div className="text-sm text-foreground/90">{children}</div>
  </div>
);

const PublicSpeaking = () => {
  const [open, setOpen] = useState(0);
  const [context, setContext] = useState<Context>("large");

  const guidance = CONTEXT_GUIDANCE[context];

  return (
    <TrackShell
      eyebrow="Public Speaking · 5 lessons"
      title={
        <>
          Build a talk that <em className="text-primary not-italic">lands.</em>
        </>
      }
      intro="Five short lessons on hooks, structure, pause, pace, and the close. Each one ends with a drill you do out loud — record yourself, listen back, repeat tomorrow."
    >
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">What's your speaking context?</p>
        <div className="flex flex-wrap gap-2">
          {CONTEXTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setContext(c.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm border transition-colors",
                context === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:border-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Adjusting guidance for {CONTEXTS.find((c) => c.id === context)?.desc.toLowerCase()}
        </p>
      </div>

      <CommonMistake>
        Filler words ("um", "like") destroy credibility. If you pause instead, you're powerful.
      </CommonMistake>

      <div className="grid lg:grid-cols-[1fr_420px] gap-10 mt-6">
        <div className="space-y-3">
          {LESSONS.map((l, i) => {
            const isOpen = open === i;
            const contextGuidance = l.contexts[context];
            return (
              <article
                key={l.title}
                className={cn(
                  "border border-border rounded-2xl overflow-hidden transition-colors",
                  isOpen ? "bg-card-gradient" : "bg-card",
                )}
              >
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 p-6 text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="grid place-items-center h-10 w-10 rounded-full bg-muted font-display text-lg font-semibold">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-display text-xl md:text-2xl font-semibold">{l.title}</h3>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{l.duration}</p>
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform shrink-0",
                      isOpen && "rotate-90 text-primary",
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-7 space-y-5 animate-fade-in">
                    <p className="text-foreground/90 leading-relaxed">{l.summary}</p>
                    <div className="border-l-2 border-primary pl-4">
                      <p className="text-xs uppercase tracking-widest text-primary mb-1">Drill</p>
                      <p className="text-muted-foreground leading-relaxed">{l.drill}</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-4">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Example</p>
                      <p className="font-display text-lg italic leading-relaxed">{l.example}</p>
                    </div>
                    {contextGuidance && (
                      <div className="bg-card border border-border rounded-xl p-4">
                        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">
                          In a {context === "small" ? "small room" : context === "large" ? "large room" : context === "stage" ? "large event" : "virtual setting"}:
                        </p>
                        <p className="text-sm text-foreground/90">{contextGuidance}</p>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <aside className="lg:sticky lg:top-24 self-start space-y-6">
          <RecorderPanel
            label="Practice this lesson"
            hint="Run the drill from the open lesson. Record. Listen. Adjust."
          />
          <div className="border border-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Self-review checklist</p>
            <ul className="space-y-2 text-sm">
              {[
                "Did the first 10 seconds earn attention?",
                "One clear point — not three?",
                "At least one full pause?",
                "Pace varied between lines?",
                "Closing line lands cleanly?",
              ].map((q) => (
                <li key={q} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground/85">{q}</span>
                </li>
              ))}
            </ul>
          </div>
          <CommonMistake>
            A pause that's 3+ seconds in a small meeting feels like you forgot your line. Match room size.
          </CommonMistake>
          <Button variant="outline" className="w-full" asChild>
            <a href="/tracks/impromptu">Next: try the impromptu drills →</a>
          </Button>
        </aside>
      </div>
    </TrackShell>
  );
};

export default PublicSpeaking;