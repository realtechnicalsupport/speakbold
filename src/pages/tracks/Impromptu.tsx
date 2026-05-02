import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TrackShell } from "@/components/TrackShell";
import { RecorderPanel } from "@/components/RecorderPanel";
import { TimerHeader } from "@/components/TimerHeader";
import { Button } from "@/components/ui/button";
import { Shuffle, Play, Pause, RotateCcw, Lightbulb, EyeOff, Mic, MicOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PromptAuthor, type CustomPrompt, type Difficulty, type Prompt } from "@/components/PromptAuthor";
import { PromptLibrary, type LibraryEntry } from "@/components/PromptLibrary";
import { RecordingsList } from "@/components/RecordingsList";
import { useSyncedPrompts } from "@/hooks/useSyncedPrompts";
import { useRecordings, useSyncedStreak } from "@/hooks/useRecordings";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

// Stable ID for built-in prompts (index in the original PROMPTS array per difficulty)
const builtinId = (d: Difficulty, i: number) => `builtin:${d}:${i}`;

const FRAMEWORKS = [
  {
    name: "PREP",
    expanded: "Point · Reason · Example · Point",
    detail: "State your view. Why you hold it. A short story or stat. Restate the view.",
  },
  {
    name: "Past · Present · Future",
    expanded: "Where it was · Where it is · Where it's going",
    detail: "Perfect for opinions, trends, or any 'what do you think about X?' question.",
  },
  {
    name: "What · So What · Now What",
    expanded: "The fact · Why it matters · What to do",
    detail: "Great for reactions, news, and putting a recommendation on the table.",
  },
  {
    name: "Story Arc",
    expanded: "Setting · Conflict · Turning point · Lesson",
    detail: "Best for personal anecdotes — pulls the listener in fast.",
  },
];

const PROMPTS: Record<Difficulty, Prompt[]> = {
  Easy: [
    {
      text: "Talk about your favorite meal and why it matters to you.",
      framework: "Story Arc",
      points: [
        "Set the scene — where and when you usually eat it",
        "Describe one specific memory tied to it",
        "Name the smell, taste, or texture you love most",
        "End with what it represents (home, family, comfort)",
      ],
      example: [
        { label: "Setting", text: "Every Sunday growing up, my grandmother's kitchen filled with steam by noon. You could smell her beef noodle soup from the hallway." },
        { label: "Conflict", text: "After she passed, nobody made it for almost a year. It felt like a small, specific kind of silence." },
        { label: "Turning point", text: "Last winter I finally tried her recipe. I burnt the garlic twice, but on the third pot — the smell was exactly right." },
        { label: "Lesson", text: "That meal isn't my favorite because of the taste. It's my favorite because it's how I visit her." },
      ],
    },
    {
      text: "Describe the room you grew up in.",
      framework: "Story Arc",
      points: [
        "Open with one vivid detail (a poster, a smell, the light)",
        "Walk us around the room in 2–3 sentences",
        "Mention an object that meant a lot to you",
        "Close with how it shaped who you are",
      ],
      example: [
        { label: "Setting", text: "The light came in at a weird angle — my window faced a brick wall, so the room always had this soft, dim amber glow." },
        { label: "Conflict", text: "It was tiny. A single bed, a desk I built out of a door, and a shelf that leaned forward like it was trying to escape." },
        { label: "Turning point", text: "On that shelf sat a beat-up Walkman. It was where I first heard music that felt like it was written for me." },
        { label: "Lesson", text: "That room taught me you don't need space to have a world. You just need a door that closes." },
      ],
    },
    {
      text: "What is one small thing that made you smile this week?",
      framework: "What · So What · Now What",
      points: [
        "Name the moment in one sentence",
        "Why it landed — what you needed that day",
        "What it reminded you to pay attention to",
      ],
      example: [
        { label: "What", text: "On Tuesday, a stranger held the elevator for me even though I was clearly thirty seconds away, jogging, coffee in hand." },
        { label: "So what", text: "I'd had a rough morning and was fully braced for the doors to close. That tiny bit of patience cracked the day open." },
        { label: "Now what", text: "I've been holding doors and elevators all week. It costs nothing and it apparently travels." },
      ],
    },
    {
      text: "Pitch your hometown as a vacation spot.",
      framework: "PREP",
      points: [
        "Point: one bold reason to visit",
        "Reason: what makes it different from everywhere else",
        "Example: a specific street, dish, or season",
        "Point: restate why someone would love it",
      ],
      example: [
        { label: "Point", text: "If you want a city that still feels like a secret, come to mine." },
        { label: "Reason", text: "It's small enough that you learn the rhythm in two days, but strange enough that you keep finding new corners for a week." },
        { label: "Example", text: "One Saturday in October, I watched a brass band play on a rooftop while people ate dumplings on the fire escape below. Free. No tickets. That was just Saturday." },
        { label: "Point (restated)", text: "Skip the tourist cities. Come somewhere that doesn't perform for you — and let it surprise you." },
      ],
    },
    {
      text: "Talk for 60 seconds about the color blue.",
      framework: "Past · Present · Future",
      points: [
        "Past: where blue shows up in your earliest memories",
        "Present: where you notice it now (sky, screens, mood)",
        "Future: what blue could come to mean",
      ],
      example: [
        { label: "Past", text: "When I was five, blue was my father's work shirt. Faded cotton, always a little damp at the collar by dinner." },
        { label: "Present", text: "Now blue is mostly a screen — notifications, the glow of my phone at 1 a.m., the color of being slightly too online." },
        { label: "Future", text: "I want blue to go back to meaning sky. The kind you notice when you're walking without headphones, looking up for no reason at all." },
      ],
    },
    {
      text: "Describe a teacher who left a mark on you.",
      framework: "Story Arc",
      points: [
        "Who they were and what they taught",
        "One specific moment with them",
        "What they said or did that stuck",
        "How you carry it today",
      ],
      example: [
        { label: "Setting", text: "Mr. Alvarez taught 9th grade English. He wore the same brown blazer every day and never smiled until October." },
        { label: "Conflict", text: "I handed in an essay I knew was lazy. I expected a C. He gave it back blank, with one line: 'Try again. I know you.'" },
        { label: "Turning point", text: "I rewrote it three times. He didn't praise the final version — he just nodded and said, 'That's you on the page.'" },
        { label: "Lesson", text: "I still hear that voice when I'm about to send something half-finished. 'Try again. I know you.'" },
      ],
    },
    {
      text: "What is one habit you actually enjoy?",
      framework: "PREP",
      points: [
        "Point: name the habit",
        "Reason: why it works for you",
        "Example: what a typical day looks like with it",
        "Point: what it has changed",
      ],
      example: [
        { label: "Point", text: "I walk for twenty minutes before I open my phone in the morning." },
        { label: "Reason", text: "It's the only window in my day that belongs to me before the world starts talking." },
        { label: "Example", text: "This morning I walked past a bakery, two arguing pigeons, and a kid showing his dad a worm. I had zero thoughts about work and it was wonderful." },
        { label: "Point (restated)", text: "Twenty minutes of nothing, and the whole day walks in slower behind it." },
      ],
    },
    {
      text: "Tell us about an ordinary object you couldn't live without.",
      framework: "Story Arc",
      points: [
        "Name the object plainly",
        "Describe the ritual it is part of",
        "A moment it saved you or surprised you",
        "Why losing it would actually hurt",
      ],
      example: [
        { label: "Setting", text: "It's a chipped ceramic mug. Navy blue, a hairline crack down one side, holds exactly one large coffee." },
        { label: "Conflict", text: "Every morning I wrap both hands around it before I say a word to anyone. It's my five-minute airlock between sleep and people." },
        { label: "Turning point", text: "My cat knocked it off the counter last spring. It bounced. I actually gasped out loud — like a friend had tripped." },
        { label: "Lesson", text: "It's just a mug. But rituals live in objects, and losing the object breaks the ritual. I'd feel it for weeks." },
      ],
    },
  ],
  Medium: [
    {
      text: "Convince me that breakfast is the most important meal.",
      framework: "PREP",
      points: [
        "Point: breakfast sets the tone for the day",
        "Reason: energy, focus, and decision quality",
        "Example: a morning with vs. without it",
        "Point: small meal, big compounding effect",
      ],
      example: [
        { label: "Point", text: "Breakfast isn't about the calories — it's the first decision you make for yourself all day, and that decision sets the tone." },
        { label: "Reason", text: "When you eat something intentional in the morning, you're telling your brain: we are running this day, not reacting to it." },
        { label: "Example", text: "Last Tuesday I skipped it. By 11 I had snapped at a coworker over a Slack typo. Wednesday I ate eggs and toast, same workload, and I was a normal human being." },
        { label: "Point (restated)", text: "Small meal, big frame. Breakfast is the cheapest mood regulator you'll ever buy." },
      ],
    },
    {
      text: "What advice would you give your 16-year-old self?",
      framework: "Past · Present · Future",
      points: [
        "Past: what you were worrying about at 16",
        "Present: what you now know is true",
        "Future: the one habit you'd start earlier",
      ],
      example: [
        { label: "Past", text: "At 16 I was convinced that how I was perceived on Friday night would define the rest of my life. Every conversation was a small audition." },
        { label: "Present", text: "Nobody remembers. Genuinely. The people I was trying to impress have moved to other cities and forgotten my last name." },
        { label: "Future", text: "I'd tell him: start writing things down. Not for a journal — for the version of you trying to figure out what you actually think. Ten years of that compounds into a person." },
      ],
    },
    {
      text: "Argue for or against working from home.",
      framework: "PREP",
      points: [
        "Point: pick a clear side",
        "Reason: focus, autonomy, or collaboration",
        "Example: a real situation that proves it",
        "Point: who it works best for",
      ],
      example: [
        { label: "Point", text: "I'm for working from home — but only for work that actually requires thinking." },
        { label: "Reason", text: "Deep work needs long, uninterrupted blocks. Open offices are optimized for the opposite: visibility, not output." },
        { label: "Example", text: "The best thing I shipped last year was written over four quiet mornings in my kitchen. The worst was a deck I made in a meeting room between two other meetings." },
        { label: "Point (restated)", text: "Home for focus, office for collaboration. Treat location as a tool, not a loyalty test." },
      ],
    },
    {
      text: "Pitch a brand new holiday — what is it and how do we celebrate?",
      framework: "What · So What · Now What",
      points: [
        "What: the name and the date",
        "So what: the value it celebrates",
        "Now what: one ritual everyone does",
      ],
      example: [
        { label: "What", text: "I'm proposing Quiet Day. The second Saturday of every February. One day, globally, of no notifications." },
        { label: "So what", text: "We have holidays for love, for nations, for gratitude — but none for attention. And attention is the scarcest thing we have now." },
        { label: "Now what", text: "The ritual is simple: phones off at sunrise, back on at sunset. In between, you have to actually hang out with your own life. That's it. That's the holiday." },
      ],
    },
    {
      text: "Describe a time you changed your mind about something important.",
      framework: "Story Arc",
      points: [
        "What you used to believe and why",
        "The moment that cracked it open",
        "The new view you hold now",
        "What it taught you about being wrong",
      ],
      example: [
        { label: "Setting", text: "For years I believed ambition and kindness were trade-offs. You picked one, and the other leaked out over time." },
        { label: "Conflict", text: "Then I worked for a woman who ran a 200-person team and still remembered my dog's name. She was the sharpest operator in the building and the warmest person in the room." },
        { label: "Turning point", text: "One late night she told me, 'Kindness is a strategy, not a softness. People do their best work for people who see them.'" },
        { label: "Lesson", text: "I was wrong, and I was wrong in a way that was costing me. Being wrong turned out to be the upgrade." },
      ],
    },
    {
      text: "What is one belief most people hold that you disagree with?",
      framework: "PREP",
      points: [
        "Point: state the belief and your counter-view",
        "Reason: where the common view falls short",
        "Example: a case that proves your point",
        "Point: what people should do instead",
      ],
      example: [
        { label: "Point", text: "Most people believe 'follow your passion' is good advice. I think it's one of the most damaging lines we give young adults." },
        { label: "Reason", text: "Passion is usually the byproduct of getting good at something, not the starting point. Telling someone to follow it first is like telling them to follow a shadow." },
        { label: "Example", text: "Every person I know who loves their work started out tolerating it, got competent, and then fell in love. Not the other way around." },
        { label: "Point (restated)", text: "Don't follow your passion. Follow your curiosity, build a skill, and let passion catch up." },
      ],
    },
    {
      text: "Sell me a book you'd recommend to anyone.",
      framework: "PREP",
      points: [
        "Point: the book and the one-line promise",
        "Reason: who it is for and what shifts",
        "Example: an idea or scene that hit hard",
        "Point: when to read it",
      ],
      example: [
        { label: "Point", text: "Read 'Man's Search for Meaning' by Viktor Frankl. It will change how you think about a bad week." },
        { label: "Reason", text: "It's written by a Holocaust survivor who argues that you don't get to choose what happens to you, but you always get to choose your response. It reframes suffering into agency." },
        { label: "Example", text: "There's a line where he describes two men in the camp handing out their last pieces of bread. He writes, 'They may have been few, but they offer sufficient proof that everything can be taken from a man but one thing.'" },
        { label: "Point (restated)", text: "Read it the next time you feel stuck. It's short, brutal, and quietly rearranges you." },
      ],
    },
    {
      text: "What does courage look like in everyday life?",
      framework: "What · So What · Now What",
      points: [
        "What: define the kind of courage you mean",
        "So what: why small acts matter more than big ones",
        "Now what: one thing the listener can do today",
      ],
      example: [
        { label: "What", text: "Everyday courage isn't running into a burning building. It's saying 'I don't know' in a room full of people pretending they do." },
        { label: "So what", text: "The big brave moments are rare. The small ones — honesty, boundaries, asking for help — are what actually build a life you respect." },
        { label: "Now what", text: "Today, in the next conversation that matters, say the true thing instead of the smooth thing. Just once. See what happens." },
      ],
    },
  ],
  Hard: [
    {
      text: "If you ran the world for a day, what is the first law you'd pass?",
      framework: "What · So What · Now What",
      points: [
        "What: the law in one sentence",
        "So what: the problem it solves",
        "Now what: how life changes the next morning",
      ],
      example: [
        { label: "What", text: "My first law would be simple: every product and service must display, in plain language, how it makes money." },
        { label: "So what", text: "Most of the harm in the modern world hides behind unclear incentives. You can't make good choices as a citizen, a parent, or a user when the business model is invisible." },
        { label: "Now what", text: "The next morning, social apps would say 'we profit from your attention.' Supermarkets would say 'this brand paid for this shelf.' People wouldn't change overnight — but they'd finally be choosing with their eyes open." },
      ],
    },
    {
      text: "Defend a controversial opinion you actually hold.",
      framework: "PREP",
      points: [
        "Point: state it cleanly, no hedging",
        "Reason: the principle behind it",
        "Example: where the mainstream view fails",
        "Point: what you are NOT saying",
      ],
      example: [
        { label: "Point", text: "I believe most people should quit a job they're comfortable in at least once in their twenties, even without a plan." },
        { label: "Reason", text: "Comfort in your twenties compounds into identity in your thirties. The longer you stay in a role that fits loosely, the more you shape yourself to fit it." },
        { label: "Example", text: "Everyone I know who stayed 'just one more year' ended up staying four. Everyone I know who jumped early regretted the chaos for six months and the decision for zero." },
        { label: "Not saying", text: "I'm not saying be reckless. I'm saying don't confuse inertia with a career." },
      ],
    },
    {
      text: "Describe the best meal you've ever eaten without naming the food.",
      framework: "Story Arc",
      points: [
        "Where you were and who you were with",
        "The textures, smells, sounds at the table",
        "The first bite — described, not named",
        "Why it became unforgettable",
      ],
      example: [
        { label: "Setting", text: "A narrow alley in a city I couldn't pronounce. Plastic stools, a single bulb, and an old woman who'd been cooking at the same corner for forty years." },
        { label: "Conflict", text: "I'd been traveling alone for three weeks and hadn't had a real conversation in days. The air smelled like charcoal and something sweet turning sharp in oil." },
        { label: "Turning point", text: "The first bite was crunch, then steam, then a sudden burst of heat that made my eyes water. She watched my face and laughed." },
        { label: "Lesson", text: "I don't remember the dish. I remember feeling, for the first time in a month, that I was being taken care of by a stranger. That's the meal." },
      ],
    },
    {
      text: "What is the most useful skill schools fail to teach?",
      framework: "PREP",
      points: [
        "Point: name the skill",
        "Reason: where adults clearly lack it",
        "Example: a moment it would have helped you",
        "Point: how it could be taught simply",
      ],
      example: [
        { label: "Point", text: "The most useful skill schools don't teach is how to disagree without fighting." },
        { label: "Reason", text: "Look at any workplace, any comment section, any family dinner. Adults don't lack facts. They lack the ability to hold tension without collapsing it into a winner and a loser." },
        { label: "Example", text: "I spent most of my early career either steamrolling quieter people or going silent around louder ones. Nobody ever taught me there was a third option." },
        { label: "Point (restated)", text: "Teach it with debates where your grade depends on steelmanning the other side. Ten years of that and we'd have a different country." },
      ],
    },
    {
      text: "Explain quantum entanglement to a curious 10-year-old.",
      framework: "What · So What · Now What",
      points: [
        "What: a simple analogy (two coins, two dice)",
        "So what: why it is weirder than it sounds",
        "Now what: where this shows up in real tech",
      ],
      example: [
        { label: "What", text: "Imagine two magic coins. You flip one in New York and one on the moon at the exact same moment. Every single time, they land on opposite sides. Always." },
        { label: "So what", text: "Here's the weird part — the coins aren't secretly pre-set. They genuinely decide in the moment, together, even though nothing travels between them. Einstein called this 'spooky action at a distance,' and he hated it." },
        { label: "Now what", text: "Scientists are now using this to build unhackable messages and computers that can solve problems ours can't. So those magic coins? They're about to run your phone." },
      ],
    },
    {
      text: "Argue that failure is more valuable than success.",
      framework: "PREP",
      points: [
        "Point: the bold claim",
        "Reason: feedback, humility, durability",
        "Example: a personal or famous failure",
        "Point: how to fail on purpose",
      ],
      example: [
        { label: "Point", text: "Failure is more valuable than success — because success is a terrible teacher." },
        { label: "Reason", text: "When you win, you can't tell what worked from what was luck. When you lose, the feedback is loud, specific, and almost always useful." },
        { label: "Example", text: "My first startup died in ten months. I learned more about pricing, people, and my own ego in that year than in the three 'successful' jobs after it combined." },
        { label: "Point (restated)", text: "Go fail on purpose. Pitch something too early. Ship something ugly. Apply for the job you're underqualified for. Collect the feedback success will never give you." },
      ],
    },
    {
      text: "Make the case for or against social media in three points.",
      framework: "PREP",
      points: [
        "Pick a side and state it fast",
        "Three reasons — keep them distinct",
        "One example per reason",
        "Land on what the listener should do",
      ],
      example: [
        { label: "Point", text: "I'm against the way we use social media today — and I'll give you three reasons." },
        { label: "Reason", text: "One: it trains us to perform instead of think. Two: it collapses every context — work, family, strangers — into one stressful feed. Three: it sells our attention to whoever pays most, which is almost never aligned with our wellbeing." },
        { label: "Example", text: "A friend of mine deleted Instagram for a month. She said the first week was withdrawal, the second was boredom, and by the third she'd started painting again — something she'd loved at 19 and hadn't touched in a decade." },
        { label: "Point (restated)", text: "You don't have to quit. But audit it. If a platform isn't making your offline life better, it's making it worse." },
      ],
    },
    {
      text: "What would you say in a 60-second eulogy for your past self?",
      framework: "Past · Present · Future",
      points: [
        "Past: who that version of you was",
        "Present: what they made possible",
        "Future: what you are carrying forward without them",
      ],
      example: [
        { label: "Past", text: "He was anxious, a little arrogant, and convinced that hustle was a personality. He answered emails at midnight and called it commitment." },
        { label: "Present", text: "But he got me here. He took the risks I benefit from, burned out in the jobs I learned from, and loved the wrong people so I could recognize the right ones." },
        { label: "Future", text: "I'm not going to miss him. But I'm going to carry his nerve, leave his panic behind, and try to build a life he would have been proud — and a little surprised — to end up in." },
      ],
    },
  ],
};

const Impromptu = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const { user } = useAuth();
  const {
    customPrompts,
    overrides,
    disabledIds,
    upsertCustomPrompt,
    deleteCustomPrompt,
    replaceAllCustomPrompts,
    setOverride,
    clearOverride,
    setDisabled,
    resetAll,
  } = useSyncedPrompts();
  const { upload: uploadRecording, refresh: refreshRecordings, items: recordings } = useRecordings();
  const { markPracticed } = useSyncedStreak();

  // All prompts as library entries (built-ins + custom), with overrides + enabled state applied
  const entries = useMemo<LibraryEntry[]>(() => {
    const out: LibraryEntry[] = [];
    (Object.keys(PROMPTS) as Difficulty[]).forEach((d) => {
      PROMPTS[d].forEach((p, i) => {
        const id = builtinId(d, i);
        const override = overrides[id];
        out.push({
          id,
          source: "builtin",
          difficulty: override?.difficulty ?? d,
          prompt: override?.prompt ?? p,
          enabled: !disabledIds.has(id),
          edited: !!override,
        });
      });
    });
    customPrompts.forEach((cp) => {
      out.push({
        id: cp.id,
        source: "custom",
        difficulty: cp.difficulty,
        prompt: { text: cp.text, framework: cp.framework, points: cp.points, example: cp.example },
        enabled: !disabledIds.has(cp.id),
        edited: false,
      });
    });
    return out;
  }, [customPrompts, overrides, disabledIds]);

  // Active shuffle pool: only enabled prompts, grouped by their (possibly overridden) difficulty
  const pool = useMemo<Record<Difficulty, Prompt[]>>(() => {
    const merged: Record<Difficulty, Prompt[]> = { Easy: [], Medium: [], Hard: [] };
    entries.forEach((e) => {
      if (e.enabled) merged[e.difficulty].push(e.prompt);
    });
    return merged;
  }, [entries]);

   const [prompt, setPrompt] = useState<Prompt>(PROMPTS.Medium[0]);
   const [duration, setDuration] = useState(60);
   const [seconds, setSeconds] = useState(60);
   const [running, setRunning] = useState(false);
const [revealed, setRevealed] = useState(false);
  const [completedPrompts, setCompletedPrompts] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("speakbold:impromptu-completed");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
    const [recordEnabled, setRecordEnabled] = useState(false);
    const [authorPanelOpen, setAuthorPanelOpen] = useState(false);
    const idRef = useRef<number | null>(null);
    const wasRunningRef = useRef<boolean>(false);
    const hasStartedRef = useRef<boolean>(false);
    const recorderStartRef = useRef<() => void>();
    const recorderPauseRef = useRef<() => void>();
    const recorderResumeRef = useRef<() => void>();
    const recorderStopRef = useRef<() => void>();

  const shuffle = (d: Difficulty = difficulty) => {
    const list = pool[d];
    if (list.length === 0) return;
    let next = prompt;
    let guard = 0;
    while (next.text === prompt.text && guard < 10) {
      next = list[Math.floor(Math.random() * list.length)];
      guard++;
    }
    setPrompt(next);
    setSeconds(duration);
    setRunning(false);
    setRevealed(false);
  };

  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pauseDuration, setPauseDuration] = useState(0);

  // Timer logic - independent of recording
  useEffect(() => {
    if (!running && !pausedAt) {
      if (idRef.current) window.clearInterval(idRef.current);
      return;
    }
    
    if (running && !pausedAt) {
      // Start or resume timer
      idRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s <= 0) {
            setRunning(false);
            setPausedAt(null);
            hasStartedRef.current = false;
            // Don't reset wasRunningRef here - let recording control effect handle it
            if (recordEnabled) refreshRecordings();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else if (!running && pausedAt) {
      // Timer was paused
      if (idRef.current) window.clearInterval(idRef.current);
      // Add the paused duration to total pause time
      setPauseDuration(prev => prev + (Date.now() - pausedAt));
    }
    
    return () => {
      if (idRef.current) window.clearInterval(idRef.current);
    };
  }, [running, pausedAt]);

  // Recording control - syncs with timer when recording is enabled
  useEffect(() => {
    if (!recordEnabled) {
      // If recording is disabled, stop any recording
      recorderStopRef.current?.();
      return;
    }
    
    // When recording is enabled, sync with timer state
    if (running && !pausedAt && !wasRunningRef.current) {
      // Started running (first time)
      recorderStartRef.current?.();
      wasRunningRef.current = true;
    } else if (running && !pausedAt && wasRunningRef.current) {
      // Resumed from pause - resume recording
      recorderResumeRef.current?.();
    } else if ((!running || pausedAt) && wasRunningRef.current) {
      // Stopped or paused
      if (pausedAt) {
        recorderPauseRef.current?.();
        // Keep wasRunningRef true so we can resume later
      } else {
        // Add buffer to let recording finalize
        setTimeout(() => {
          recorderStopRef.current?.();
          wasRunningRef.current = false;
        }, 50);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordEnabled, running, pausedAt]);

  // Keep displayed seconds in sync if duration changes while idle
  useEffect(() => {
    if (!running && seconds !== 0) setSeconds(duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = duration > 0 ? (seconds / duration) * 100 : 0;
  const suggestedFramework = FRAMEWORKS.find((f) => f.name === prompt.framework);

  return (
    <>
      {/* Timer Header - appears only when timer is running */}
      {running && (
        <TimerHeader
          running={running}
          seconds={seconds}
          duration={duration}
          title={`${difficulty} prompt`}
          recordingActive={recordEnabled}
          onPlay={() => {
            if (seconds === 0) setSeconds(duration);
            setRunning(true);
            if (pausedAt) setPausedAt(null);
            hasStartedRef.current = true;
          }}
          onPause={() => {
            setRunning(false);
            setPausedAt(Date.now());
          }}
          onReset={() => {
            recorderStopRef.current?.();
            setSeconds(duration);
            setRunning(false);
            setPausedAt(null);
            wasRunningRef.current = false;
            hasStartedRef.current = false;
          }}
        />
      )}
      <div className={running ? "pt-32 max-w-full overflow-x-hidden" : "max-w-full overflow-x-hidden"}>
      <TrackShell
        eyebrow="Impromptu · 60-second drills"
        title={
          <>
            One prompt. Sixty seconds. <em className="text-primary not-italic">No notes.</em>
          </>
        }
        intro="The fastest way to build speaking confidence is to speak when you don't feel ready. Pick a difficulty, hit start, and talk until the timer ends. Stuck? Reveal hints — but try without them first."
      >
      <div className="grid lg:grid-cols-[1fr_380px] gap-10">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PROMPTS) as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDifficulty(d);
                  shuffle(d);
                }}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  difficulty === d
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="relative bg-card-gradient border border-border rounded-3xl p-8 md:p-12 shadow-soft overflow-hidden">
            <div
              className="absolute top-0 left-0 h-1 bg-warm transition-all duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
            <div className="flex items-center justify-between mb-8">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{difficulty} prompt</span>
              <span className="font-mono tabular-nums text-5xl md:text-6xl font-bold">
                {mins}:{String(secs).padStart(2, "0")}
              </span>
            </div>
            <p className="font-display text-3xl md:text-5xl leading-tight text-pretty mb-10 min-h-[8rem]">
              "{prompt.text}"
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="text-xs uppercase tracking-widest text-muted-foreground mr-1">Timer</span>
              {[30, 60, 90, 120].map((d) => (
                <button
                  key={d}
                  onClick={() => { setDuration(d); setSeconds(d); setRunning(false); }}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    duration === d
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d < 60 ? `${d}s` : `${d / 60}m`}
                </button>
              ))}
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="number"
                  min={5}
                  max={600}
                  value={duration}
                  onChange={(e) => {
                    const v = Math.max(5, Math.min(600, Number(e.target.value) || 0));
                    setDuration(v);
                    if (!running) setSeconds(v);
                  }}
                  className="w-16 h-8 px-2 rounded-md bg-background border border-border text-sm font-mono tabular-nums focus:outline-none focus:border-primary"
                  aria-label="Custom duration in seconds"
                />
                <span className="text-xs text-muted-foreground">sec</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <>
                {!running ? (
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={() => {
                      if (seconds === 0) setSeconds(duration);
                      setRunning(true);
                      if (pausedAt) setPausedAt(null);
                      hasStartedRef.current = true;
                    }}
                  >
                    <Play className="h-4 w-4" />
                    {hasStartedRef.current ? "Resume " : "Start "}{duration < 60 ? `${duration}s` : `${duration}s`}
                  </Button>
                ) : (
                  <Button variant="hero" size="lg" onClick={() => { setRunning(false); setPausedAt(Date.now()); }}>
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                )}
              </>
              <Button variant="outline" size="lg" onClick={() => { recorderStopRef.current?.(); setSeconds(duration); setRunning(false); setPausedAt(null); wasRunningRef.current = false; hasStartedRef.current = false; }}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button variant="outline" size="lg" onClick={() => shuffle()}>
                <Shuffle className="h-4 w-4" />
                New prompt
              </Button>
              <Button
                variant={revealed ? "outline" : "spotlight"}
                size="lg"
                onClick={() => setRevealed((r) => !r)}
              >
                {revealed ? <EyeOff className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
                {revealed ? "Hide hints" : "Reveal hints"}
              </Button>
            </div>
            {seconds === 0 && (
              <p className="mt-6 text-primary font-semibold animate-fade-in">Time. Take a breath. Try a fresh prompt.</p>
            )}

            <div className="mt-8 pt-6 border-t border-border flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                {!user ? (
                  <MicOff className="h-5 w-5 text-muted-foreground/50 mt-0.5" />
                ) : recordEnabled ? (
                  <Mic className="h-5 w-5 text-primary mt-0.5" />
                ) : (
                  <MicOff className="h-5 w-5 text-muted-foreground mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">Record this attempt</p>
                  {!user ? (
                    <p className="text-xs text-muted-foreground max-w-sm">
                      <Link to="/login" className="text-primary hover:underline">Sign in</Link> to save recordings to your account.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Auto-starts and stops with the timer. Saved to your account.
                    </p>
                  )}
                </div>
              </div>
              <Switch 
                checked={recordEnabled} 
                onCheckedChange={setRecordEnabled} 
                aria-label="Toggle recording"
                disabled={!user}
              />
            </div>

              {recordEnabled && (
                <div className="mt-6 animate-fade-in">
                  <RecorderPanel
                    label="Recording your attempt"
                     hint={
                       user
                         ? "Mic activates when you hit Start. Saved to your account when recording ends."
                         : "Mic activates when you hit Start. Sign in to sync recordings to your account."
                     }
                    externalRunning={running}
                    recorderStartRef={(fn) => { recorderStartRef.current = fn; }}
                    recorderPauseRef={(fn) => { recorderPauseRef.current = fn; }}
                    recorderResumeRef={(fn) => { recorderResumeRef.current = fn; }}
                    recorderStopRef={(fn) => { recorderStopRef.current = fn; }}
                      onRecorded={async ({ blob, durationMs }) => {
                        markPracticed();
                        if (!user) {
                          toast({
                            title: "Recording captured",
                            description: "Sign in to save it to your account.",
                          });
                          return;
                        }
                        const attemptNum = recordings.length + 1;
                        const saved = await uploadRecording(blob, {
                          promptText: `Attempt ${attemptNum}: ${prompt.text}`,
                          difficulty,
                          durationMs,
                          targetSeconds: duration,
                        });
                        toast({
                          title: saved ? "Recording saved" : "Save failed",
                          description: saved
                            ? "Synced to your account."
                            : "We couldn't upload your recording.",
                        });
                      }}
                   />
                </div>
              )}
          </div>

          {revealed && (
            <div className="grid md:grid-cols-2 gap-4 animate-fade-in">
              <div className="border border-primary/30 rounded-2xl p-6 bg-primary/5">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="text-xs uppercase tracking-widest text-primary font-semibold">
                    Talking points
                  </span>
                </div>
                <ol className="space-y-3">
                  {prompt.points.map((p, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed">
                      <span className="font-mono text-primary shrink-0">{i + 1}.</span>
                      <span className="text-foreground/90">{p}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {suggestedFramework && (
                <div className="border border-border rounded-2xl p-6 bg-muted/30">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                      Suggested framework
                    </span>
                  </div>
                  <h3 className="font-display text-2xl font-semibold mb-1">{suggestedFramework.name}</h3>
                  <p className="text-sm text-primary mb-3">{suggestedFramework.expanded}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{suggestedFramework.detail}</p>
                </div>
              )}
            </div>
          )}

          {revealed && (
            <div className="border border-border rounded-2xl p-6 md:p-8 bg-card-gradient animate-fade-in">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-widest text-primary font-semibold">
                    Example speech
                  </span>
                </div>
                {suggestedFramework && (
                  <span className="text-xs text-muted-foreground font-mono">
                    using {suggestedFramework.name}
                  </span>
                )}
              </div>
              <ol className="space-y-5">
                {prompt.example.map((beat, i) => (
                  <li key={i} className="grid md:grid-cols-[140px_1fr] gap-2 md:gap-6">
                    <span className="text-xs uppercase tracking-widest text-primary font-semibold pt-1">
                      {beat.label}
                    </span>
                    <p className="text-base leading-relaxed text-foreground/90 italic">
                      "{beat.text}"
                    </p>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-muted-foreground mt-6 leading-relaxed">
                Don't memorise this — use it to feel how the framework holds the speech together, then say yours in your own voice.
              </p>
            </div>
          )}

          <PromptLibrary
            frameworks={FRAMEWORKS.map((f) => ({ name: f.name, expanded: f.expanded }))}
            entries={entries}
            onToggle={(id, enabled) => setDisabled(id, !enabled)}
            onEdit={(id, next) => {
              if (id.startsWith("builtin:")) {
                setOverride(id, next);
              } else {
                const existing = customPrompts.find((p) => p.id === id);
                if (existing) {
                  upsertCustomPrompt({
                    ...existing,
                    difficulty: next.difficulty,
                    text: next.prompt.text,
                    framework: next.prompt.framework,
                    points: next.prompt.points,
                    example: next.prompt.example,
                  });
                }
              }
            }}
            onResetBuiltin={(id) => clearOverride(id)}
            onDeleteCustom={(id) => deleteCustomPrompt(id)}
            onResetAll={() => resetAll()}
            onOpenAuthor={() => setAuthorPanelOpen(true)}
          />

          <RecordingsList />

          <PromptAuthor
            frameworks={FRAMEWORKS.map((f) => ({ name: f.name, expanded: f.expanded }))}
            customPrompts={customPrompts}
            onAdd={(p) => upsertCustomPrompt(p)}
            onDelete={(id) => deleteCustomPrompt(id)}
            onReplaceAll={(ps) => replaceAllCustomPrompts(ps)}
            isOpen={authorPanelOpen}
            onOpen={(open) => setAuthorPanelOpen(open)}
          />

          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">All frameworks</p>
          {FRAMEWORKS.map((f) => (
            <div key={f.name} className="border border-border rounded-2xl p-5">
              <h3 className="font-display text-xl font-semibold">{f.name}</h3>
              <p className="text-sm text-primary mb-2">{f.expanded}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.detail}</p>
            </div>
          ))}
          <div className="border border-border rounded-2xl p-5 bg-muted/30">
            <p className="text-sm text-foreground/85 leading-relaxed">
              <strong className="text-foreground">Rule:</strong> never apologise mid-prompt. If you stumble,
              keep going. The goal is reps, not perfection.
            </p>
          </div>
        </aside>
        </div>
      </div>
    </TrackShell>
      </div>
    </>
  );
};

export default Impromptu;
