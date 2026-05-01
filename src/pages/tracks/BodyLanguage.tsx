import { useState } from "react";
import { TrackShell } from "@/components/TrackShell";
import { Camera, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const CommonMistake = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
    <div className="text-sm text-foreground/90">{children}</div>
  </div>
);

const POSTURE_CHECK = [
  "Feet shoulder-width apart, weight even on both legs.",
  "Knees soft — never locked.",
  "Shoulders down and back, chest open.",
  "Chin level with the floor — not raised, not tucked.",
  "Hands visible, ready to gesture, not crossed or in pockets.",
  "Eyes scanning the room in 3-second holds — not darting.",
];

const MISTAKES_TO_AVOID = [
  "Shoulders hunched? Relax them down and back.",
  "Hands crossing your body? Keep them visible and ready.",
  "Chin tucked? Level it with the floor.",
];

const GESTURES = [
  {
    name: "The container",
    use: "Defining a topic or boundary.",
    how: "Hands shoulder-width apart, palms facing each other, as if holding a box.",
    mistake: "Hands too close together — looks like you're holding something tiny.",
    whenItFails: "The container works for boundaries but dies if you hold it too long — release after 3 seconds.",
    drill: "Say: 'There are three points I want to make.' Use the container for each point. Does it land before you say the number?",
  },
  {
    name: "The reveal",
    use: "Introducing an idea or surprise.",
    how: "One hand opens outward from your chest, palm up, ending shoulder-height.",
    mistake: "Palm faces down — looks like you're pushing something away, not offering it.",
    whenItFails: "The reveal works for introducing ideas but dies if you overuse it — save it for one per minute.",
    drill: "Say: 'And that's when it hit me.' Open your hand on 'hit.' Record it. Does the gesture land on the word?",
  },
  {
    name: "The list",
    use: "Counting points ('first… second… third…').",
    how: "Touch your thumb to each finger as you say each item. Don't wave the whole hand.",
    mistake: "Whole hand waving — looks like you're conducting an invisible orchestra.",
    whenItFails: "The list works for counting but dies if you gesture between numbers — only move on each number.",
    drill: "Say: 'I have three priorities: speed, quality, and safety.' Touch fingers on each priority word. Record. Does it feel sharp?",
  },
  {
    name: "The pause-down",
    use: "Landing a heavy line.",
    how: "Lower both hands slowly to your sides as you say the line. Then hold still.",
    mistake: "Hands stop halfway — looks like you're giving up, not landing.",
    whenItFails: "The pause-down works for emphasis but dies if you add movement after — hold the still for 2 seconds.",
    drill: "Say: 'This is the only number that matters.' Lower hands on 'matters.' Hold for 3 seconds. Record. Does it feel like a period?",
  },
];

const EYE_CONTACT = [
  "Pick three points in the room: left, centre, right.",
  "Hold each for 3–5 seconds — about one full sentence.",
  "Move only on a punctuation mark, never mid-word.",
  "If a real person makes you nervous, look at their forehead. They can't tell.",
];

const GOTCHAS = [
  "Hands on hips reads as impatient in formal settings. Use open hands at rest instead.",
  "More gestures ≠ better. One gesture per sentence maximum.",
  "If someone makes you nervous, lock onto their forehead — they can't tell the difference.",
];

const MirrorCheck = () => {
  const [checked, setChecked] = useState<boolean[]>(POSTURE_CHECK.map(() => false));
  const [mistakesChecked, setMistakesChecked] = useState<boolean[]>(MISTAKES_TO_AVOID.map(() => false));
  const allPostureDone = checked.every(Boolean);
  const allMistakesDone = mistakesChecked.every(Boolean);

  return (
    <div className="border border-border rounded-3xl p-8">
      <div className="flex items-center gap-2 mb-1">
        <Camera className="h-4 w-4 text-primary" />
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">Mirror / Camera self-check</p>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Stand in front of a mirror or phone camera. Run through each line. Record a 30-second video of yourself.
      </p>

      <div className="mb-8">
        <p className="text-sm font-semibold text-foreground mb-3">Posture checklist</p>
        <ul className="space-y-3">
          {POSTURE_CHECK.map((p, i) => (
            <li key={p}>
              <button
                onClick={() =>
                  setChecked((c) => {
                    const next = [...c];
                    next[i] = !next[i];
                    return next;
                  })
                }
                className="w-full flex items-start gap-3 text-left group"
              >
                <span
                  className={cn(
                    "mt-0.5 grid place-items-center h-5 w-5 rounded border transition-colors shrink-0",
                    checked[i] ? "bg-primary border-primary" : "border-muted-foreground group-hover:border-foreground",
                  )}
                >
                  {checked[i] && <Check className="h-3 w-3 text-primary-foreground" />}
                </span>
                <span className={cn("text-foreground/90", checked[i] && "line-through text-muted-foreground")}>
                  {p}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Mistakes to avoid
        </p>
        <ul className="space-y-3">
          {MISTAKES_TO_AVOID.map((m, i) => (
            <li key={m}>
              <button
                onClick={() =>
                  setMistakesChecked((c) => {
                    const next = [...c];
                    next[i] = !next[i];
                    return next;
                  })
                }
                className="w-full flex items-start gap-3 text-left group"
              >
                <span
                  className={cn(
                    "mt-0.5 grid place-items-center h-5 w-5 rounded border transition-colors shrink-0",
                    mistakesChecked[i] ? "bg-destructive border-destructive" : "border-muted-foreground group-hover:border-foreground",
                  )}
                >
                  {mistakesChecked[i] && <Check className="h-3 w-3 text-destructive-foreground" />}
                </span>
                <span className={cn("text-foreground/90", mistakesChecked[i] && "line-through text-muted-foreground")}>
                  {m}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {allPostureDone && allMistakesDone && (
        <p className="mt-5 text-primary text-sm font-semibold animate-fade-in">
          Ready. You've checked the mirror. Now practice your gestures below.
        </p>
      )}
    </div>
  );
};

const GestureCard = ({ gesture }: { gesture: typeof GESTURES[0] }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card-gradient rounded-2xl p-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <h3 className="font-display text-2xl font-semibold mb-1">{gesture.name}</h3>
        <p className="text-sm text-primary mb-2">{gesture.use}</p>
        <p className="text-muted-foreground leading-relaxed">{gesture.how}</p>
      </button>

      {expanded && (
        <div className="mt-6 space-y-4 animate-fade-in">
          <div className="border-l-2 border-destructive pl-4">
            <p className="text-xs uppercase tracking-widest text-destructive font-semibold mb-1">Common mistake</p>
            <p className="text-sm text-foreground/80">{gesture.mistake}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">When it fails</p>
            <p className="text-sm text-foreground/80">{gesture.whenItFails}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Video demo</p>
            <p className="text-sm text-muted-foreground italic">[video demo needed]</p>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Drill variant</p>
            <p className="text-sm text-foreground/90">{gesture.drill}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const EyeContactRule = () => {
  return (
    <div className="border border-border rounded-3xl p-8">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Eye contact rule</p>
      <p className="text-sm text-muted-foreground mb-6">3–5 seconds per person. Move on punctuation.</p>
      <ol className="space-y-3 list-decimal list-inside marker:text-primary marker:font-semibold">
        {EYE_CONTACT.map((e) => (
          <li key={e} className="text-foreground/90 leading-relaxed">{e}</li>
        ))}
      </ol>
    </div>
  );
};

const Gotchas = () => {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6">
      <p className="text-xs uppercase tracking-widest text-destructive font-semibold mb-4">Gotchas</p>
      <ul className="space-y-3">
        {GOTCHAS.map((g) => (
          <li key={g} className="text-sm text-foreground/90 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            {g}
          </li>
        ))}
      </ul>
    </div>
  );
};

const BodyLanguage = () => {
  return (
    <TrackShell
      eyebrow="Body Language · live drills"
      title={
        <>
          Stand like the room is <em className="text-primary not-italic">already yours.</em>
        </>
      }
      intro="Four interactive drills you do right now, on this page. Check your posture in the mirror. Practice the four gestures that carry meaning. Then watch the gotchas."
    >
      <div className="space-y-4 mb-2">
        <CommonMistake>Crossed arms signal defensiveness. Keep arms uncrossed and hands visible.</CommonMistake>
        <CommonMistake>Pacing back and forth can read as nervous. Plant yourself in one spot, then move with intention.</CommonMistake>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <MirrorCheck />
        <EyeContactRule />

        <div className="lg:col-span-2 border border-border rounded-3xl p-8 md:p-10">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">Gesture practice grid · tap to expand</p>
          <div className="grid md:grid-cols-2 gap-6">
            {GESTURES.map((g) => (
              <GestureCard key={g.name} gesture={g} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-8">
            Tap each gesture to see the drill variant. Record yourself doing each one. Does the gesture land before the word you're emphasising?
          </p>
        </div>

        <div className="lg:col-span-2">
          <Gotchas />
        </div>
      </div>
    </TrackShell>
  );
};

export default BodyLanguage;