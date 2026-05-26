export type Difficulty = "Easy" | "Medium" | "Hard";
export type Category = "Personal" | "Opinion" | "Creative" | "Business" | "Philosophical";

export interface ImpromptuTopic {
  id: string;
  text: string;
  category: Category;
  difficulty: Difficulty;
  framework: string;
  hints: string[];
  curveballs: string[];
}

export interface Framework {
  name: string;
  expanded: string;
  description: string;
}

export const FRAMEWORKS: Record<string, Framework> = {
  "PREP": {
    name: "PREP",
    expanded: "Point · Reason · Example · Point",
    description: "State your view. Why you hold it. A short story or stat. Restate the view.",
  },
  "Past · Present · Future": {
    name: "Past · Present · Future",
    expanded: "Where it was · Where it is · Where it's going",
    description: "Perfect for opinions, trends, or any 'what do you think about X?' question.",
  },
  "What · So What · Now What": {
    name: "What · So What · Now What",
    expanded: "The fact · Why it matters · What to do",
    description: "Great for reactions, news, and putting a recommendation on the table.",
  },
  "Story Arc": {
    name: "Story Arc",
    expanded: "Setting · Conflict · Turning point · Lesson",
    description: "Best for personal anecdotes — pulls the listener in fast.",
  },
};

export const PREP_TIME: Record<Difficulty, number> = {
  Easy: 15,
  Medium: 10,
  Hard: 5,
};

export const TARGET_WPM = { min: 120, max: 160 };

export const TOPIC_BANK: ImpromptuTopic[] = [
  // ── Easy ────────────────────────────────────────────────────────────────────
  {
    id: "e1",
    text: "Talk about your favorite meal and why it matters to you.",
    category: "Personal", difficulty: "Easy", framework: "Story Arc",
    hints: ["Set the scene", "One vivid memory tied to this meal", "Sensory detail — taste, smell, texture", "What the meal represents beyond food"],
    curveballs: ["Now argue that this meal should be banned from restaurants.", "Convince a food critic who thinks it's completely overrated."],
  },
  {
    id: "e2",
    text: "Describe the room you grew up in.",
    category: "Personal", difficulty: "Easy", framework: "Story Arc",
    hints: ["Paint the physical scene quickly", "Walk to one meaningful object or corner", "One memory that happened there", "What that room taught you"],
    curveballs: ["Now describe the opposite — the place you least felt like yourself.", "Someone is about to demolish that building. Make the case to save it."],
  },
  {
    id: "e3",
    text: "What is one habit that has genuinely changed your life?",
    category: "Personal", difficulty: "Easy", framework: "PREP",
    hints: ["Name the habit clearly", "What made you start it?", "A concrete before-and-after example", "Why others should consider it"],
    curveballs: ["Now argue that habits are actually overrated — and spontaneity beats routine.", "Flip it: describe the worst habit you've ever had."],
  },
  {
    id: "e4",
    text: "Tell me about a person who made you better at something.",
    category: "Personal", difficulty: "Easy", framework: "Story Arc",
    hints: ["Who was this person?", "What were you struggling with?", "The turning point moment", "What you carry from them today"],
    curveballs: ["Now make the case that we learn more from people who challenge us than people who support us.", "Pivot — describe someone who accidentally taught you something."],
  },
  {
    id: "e5",
    text: "What would you do with a completely free Saturday?",
    category: "Personal", difficulty: "Easy", framework: "What · So What · Now What",
    hints: ["Paint the day", "Why these specific choices?", "What does this reveal about you?", "The one thing you'd want to remember"],
    curveballs: ["Now plan the worst possible Saturday for someone else — and defend every choice.", "Argue that truly free time is actually more stressful than structured time."],
  },
  {
    id: "e6",
    text: "Describe a skill you wish you had learned earlier.",
    category: "Personal", difficulty: "Easy", framework: "Past · Present · Future",
    hints: ["Name the skill and why you didn't learn it earlier", "What your life looks like without it", "What's different now that you've gained it (or started)", "Who else should learn it sooner"],
    curveballs: ["Now argue that the delay actually made you better at it.", "What skill do you think is completely useless to learn? Defend your answer."],
  },

  // ── Medium ──────────────────────────────────────────────────────────────────
  {
    id: "m1",
    text: "Convince me that breakfast is the most important meal of the day.",
    category: "Opinion", difficulty: "Medium", framework: "PREP",
    hints: ["Your main claim — don't hedge", "Why breakfast specifically (not lunch, not dinner)", "A concrete example: with vs without", "The closing punch"],
    curveballs: ["Now argue the opposite — breakfast is actually the least important meal.", "Convince someone who only eats one meal a day."],
  },
  {
    id: "m2",
    text: "What skill, if everyone learned it, would most improve society?",
    category: "Opinion", difficulty: "Medium", framework: "PREP",
    hints: ["Name the skill — be specific", "Why this one above all others?", "A concrete real-world example of impact", "Restate the case with urgency"],
    curveballs: ["Now argue that teaching skills at scale actually homogenizes society dangerously.", "Pick a completely unexpected skill — something nobody would guess."],
  },
  {
    id: "m3",
    text: "Is remote work better or worse for creativity?",
    category: "Opinion", difficulty: "Medium", framework: "Past · Present · Future",
    hints: ["How creativity and work used to interact", "What remote work actually does to creative output — the evidence", "Where this trend leads"],
    curveballs: ["Argue the other side — whatever position you just took, flip it.", "Now argue that the office vs remote debate misses the real question entirely."],
  },
  {
    id: "m4",
    text: "What does success mean to you — and has that definition changed?",
    category: "Personal", difficulty: "Medium", framework: "Past · Present · Future",
    hints: ["Your past definition of success", "The moment the definition shifted", "What you believe now", "Where you're heading with this new definition"],
    curveballs: ["Now argue that no definition of success is valid — that the concept itself is flawed.", "Convince a 16-year-old version of yourself."],
  },
  {
    id: "m5",
    text: "Make the case for a hobby everyone should pick up.",
    category: "Opinion", difficulty: "Medium", framework: "PREP",
    hints: ["Name the hobby clearly", "One unexpected benefit most people miss", "A short personal or observed story", "The invitation — why now?"],
    curveballs: ["Now argue that hobbies are a luxury, not a necessity.", "Your audience already has this hobby and hates it. Reconvince them."],
  },
  {
    id: "m6",
    text: "What is the most underrated city in the world?",
    category: "Opinion", difficulty: "Medium", framework: "What · So What · Now What",
    hints: ["Name it and describe what makes it different", "Why it gets less credit than it deserves", "What should change — for travellers or for the city itself"],
    curveballs: ["Now argue that over-tourism ruins the places it finds.", "Convince someone who hates travelling."],
  },
  {
    id: "m7",
    text: "Describe a time you completely changed your mind about something.",
    category: "Personal", difficulty: "Medium", framework: "Story Arc",
    hints: ["What you believed and why — set the scene", "The moment things cracked open", "What you discovered or who changed your view", "How it affects how you hold opinions today"],
    curveballs: ["Now argue that changing your mind too easily is actually a weakness.", "Pivot: make the case for the position you used to hold."],
  },
  {
    id: "m8",
    text: "What would you change about the way we educate children?",
    category: "Opinion", difficulty: "Medium", framework: "What · So What · Now What",
    hints: ["The specific thing you'd change — be precise", "Why this matters beyond just grades or test scores", "What education that actually works looks like in practice"],
    curveballs: ["Now argue that the current system is actually fine and people are too quick to criticize it.", "Design the ideal school in 60 seconds."],
  },

  // ── Hard ────────────────────────────────────────────────────────────────────
  {
    id: "h1",
    text: "If you ran the world for a day, what is the first law you'd pass?",
    category: "Philosophical", difficulty: "Hard", framework: "What · So What · Now What",
    hints: ["Name the law — be bold and specific", "The problem it solves and why it's the most urgent", "What the world looks like the morning after"],
    curveballs: ["Now argue that giving one person world power for a day is inherently more dangerous than the problem you're trying to solve.", "Your law fails completely in practice — what do you do?"],
  },
  {
    id: "h2",
    text: "Defend the idea that failure is more valuable than success.",
    category: "Philosophical", difficulty: "Hard", framework: "PREP",
    hints: ["The counter-intuitive claim — commit to it", "Why failure teaches what success hides", "A story — famous or personal — that proves it", "The takeaway that isn't just 'fail fast'"],
    curveballs: ["Now argue the reverse: success is actually the better teacher.", "Someone just failed catastrophically. Use this framework to comfort them in 30 seconds."],
  },
  {
    id: "h3",
    text: "Argue that we should spend less time optimizing and more time experimenting.",
    category: "Philosophical", difficulty: "Hard", framework: "Past · Present · Future",
    hints: ["The obsession with optimization — where it came from", "What we lose when we only optimize", "What a more experimental world actually looks like"],
    curveballs: ["Now defend extreme optimization — argue that without it, nothing gets done.", "Apply this argument specifically to a broken institution — healthcare, politics, or schools."],
  },
  {
    id: "h4",
    text: "Make the case that discomfort is the most important driver of growth.",
    category: "Philosophical", difficulty: "Hard", framework: "PREP",
    hints: ["The claim — why discomfort specifically, not challenge or effort", "The mechanism — what discomfort uniquely does to us", "Proof: history, science, or a personal story that isn't just 'I worked hard'", "The call to action that's actually uncomfortable"],
    curveballs: ["Now argue that chronic discomfort is actually destructive, not productive.", "Convince someone who just wants comfort and argues they deserve it."],
  },
  {
    id: "h5",
    text: "What would you tell your 10-year-old self about the world?",
    category: "Personal", difficulty: "Hard", framework: "Story Arc",
    hints: ["Who were you at 10 — be specific, not nostalgic", "The single most important thing you'd want them to know", "A moment where not knowing it cost you something", "What you want them to feel, not just think"],
    curveballs: ["Now reverse it — what would your 10-year-old self tell YOU?", "Argue that advice across time is useless — because you had to live it to learn it."],
  },
  {
    id: "h6",
    text: "What is the most dangerous idea currently accepted as normal?",
    category: "Philosophical", difficulty: "Hard", framework: "What · So What · Now What",
    hints: ["Name it clearly — don't hedge with 'some people might say'", "Why it's dangerous specifically, and why we've normalized it", "What we should do about it — and why we probably won't"],
    curveballs: ["Now defend that idea — argue it's actually beneficial.", "Someone in the room is deeply offended by your answer. Address them directly."],
  },
  {
    id: "h7",
    text: "Convince me that solitude is more productive than collaboration.",
    category: "Opinion", difficulty: "Hard", framework: "PREP",
    hints: ["The claim — define 'productive' first", "Why collaboration has a hidden cost we underestimate", "Research or examples that prove solitude wins in certain domains", "When you'd flip the argument — your concession and your counter"],
    curveballs: ["Now argue the opposite — that collaboration is where all the real ideas happen.", "Apply this to a specific context: startups, or writing, or medicine."],
  },
  {
    id: "h8",
    text: "What is the most important question humanity has not yet learned to ask?",
    category: "Philosophical", difficulty: "Hard", framework: "What · So What · Now What",
    hints: ["The question — specific, not generic", "Why we haven't asked it yet — comfort, bias, or blindspot?", "What asking it could unlock — and what it would demand of us"],
    curveballs: ["Now answer your own question in 30 seconds.", "Argue that asking more questions is actually part of the problem — we need answers."],
  },
];

export function getRandomTopic(difficulty: Difficulty): ImpromptuTopic {
  const pool = TOPIC_BANK.filter(t => t.difficulty === difficulty);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getTopicsByDifficulty(difficulty: Difficulty): ImpromptuTopic[] {
  return TOPIC_BANK.filter(t => t.difficulty === difficulty);
}

export function getAllTopics(): ImpromptuTopic[] {
  return TOPIC_BANK;
}
