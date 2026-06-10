export type Difficulty = "Easy" | "Medium" | "Hard" | "News";
export type Category = "Personal" | "Opinion" | "Creative" | "Business" | "Philosophical" | "Current Affairs";

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
  News: 10,
};

export const TARGET_WPM = { min: 120, max: 160 };

export const TOPIC_BANK: ImpromptuTopic[] = [
  // ── Easy — Personal / Narrative ─────────────────────────────────────────────
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
  {
    id: "e7",
    text: "Talk about a piece of technology that has genuinely improved your daily life.",
    category: "Personal", difficulty: "Easy", framework: "Story Arc",
    hints: ["Name the technology and when you first encountered it", "What problem it solved — or what life looked like before", "One specific moment where it made a real difference", "Why you'd notice immediately if it disappeared"],
    curveballs: ["Now argue that we rely on this technology too much — and that's a real problem.", "Make the case for the version of your life without it."],
  },
  {
    id: "e8",
    text: "Describe the best advice you've ever received — and whether you actually took it.",
    category: "Personal", difficulty: "Easy", framework: "Story Arc",
    hints: ["Set the scene — who said it and when?", "What the advice was, exactly", "What you did with it (or didn't do)", "What it's worth to you now"],
    curveballs: ["Now argue that advice is almost always useless — you have to live it to learn it.", "What's the worst advice you've ever received? Turn it into a lesson."],
  },
  {
    id: "e9",
    text: "Talk about a moment when asking for help changed the outcome of something.",
    category: "Personal", difficulty: "Easy", framework: "Story Arc",
    hints: ["The situation — what were you trying to do alone?", "The moment you finally asked", "What the help actually looked like", "What you learned about independence vs. knowing your limits"],
    curveballs: ["Now argue that asking for help too readily is a sign of weakness.", "Describe a time when asking for help made things worse."],
  },
  {
    id: "e10",
    text: "Describe a small daily ritual that keeps you grounded.",
    category: "Personal", difficulty: "Easy", framework: "What · So What · Now What",
    hints: ["Name the ritual — be specific, not generic", "What happens when you skip it?", "Where it came from — accident or intention?", "Why it works for you, even if it sounds ordinary"],
    curveballs: ["Now argue that routines are actually a trap — they stop you from adapting.", "Convince someone whose life is completely chaotic to adopt just one routine."],
  },
  {
    id: "e11",
    text: "Describe a place in your city or neighborhood that deserves more attention than it gets.",
    category: "Personal", difficulty: "Easy", framework: "What · So What · Now What",
    hints: ["Paint the place in a few sentences", "Why it's overlooked — what do most people miss?", "What would change if more people knew about it"],
    curveballs: ["Now argue that the best things stay hidden for a reason — popularity ruins them.", "Make the case that your neighborhood is actually underrated overall."],
  },
  {
    id: "e12",
    text: "Talk about a time when a small change — in process, environment, or mindset — made a surprisingly big difference.",
    category: "Personal", difficulty: "Easy", framework: "PREP",
    hints: ["Name the change — make it specific", "Why it was easy to overlook", "The concrete before-and-after", "What this teaches about how improvement actually works"],
    curveballs: ["Now argue that small changes are overrated — real change only comes from big moves.", "What small change have you been avoiding that you know would help?"],
  },

  // ── Easy — Creative ──────────────────────────────────────────────────────────
  {
    id: "ce1",
    text: "Design the ideal first week for a new employee at any company. Walk us through it.",
    category: "Creative", difficulty: "Easy", framework: "What · So What · Now What",
    hints: ["What most onboarding gets wrong", "What a new person actually needs in week one — beyond training docs", "The one moment you'd make sure they experience"],
    curveballs: ["Now argue that structured onboarding is patronizing — people learn by being thrown in.", "Your new hire is fully remote, in a different time zone, and has never met the team. Adapt your plan."],
  },

  // ── Medium — Opinion / Personal / Business ───────────────────────────────────
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
  {
    id: "m9",
    text: "What makes a great workplace culture — and why do so many organisations get it wrong?",
    category: "Business", difficulty: "Medium", framework: "What · So What · Now What",
    hints: ["Define culture in concrete terms, not buzzwords", "The specific ways organisations undermine their own stated values", "What good culture actually looks like in an ordinary Tuesday — not a company retreat"],
    curveballs: ["Now argue that 'culture' is just a word companies use to avoid talking about pay and workload.", "Describe the worst workplace culture you've witnessed — what went wrong, and when?"],
  },
  {
    id: "m10",
    text: "Make the case for the four-day work week.",
    category: "Business", difficulty: "Medium", framework: "PREP",
    hints: ["Your claim — commit to it without hedging", "The evidence that output doesn't drop (or improves)", "A real example: a company or country that's tried it", "The strongest counterargument and how you'd address it"],
    curveballs: ["Now argue the opposite — five days isn't enough, we should be working more.", "What happens to shift workers, service staff, and hourly employees in a four-day model? Address it directly."],
  },
  {
    id: "m11",
    text: "What is the most underrated skill for being effective at work?",
    category: "Business", difficulty: "Medium", framework: "PREP",
    hints: ["Name the skill — make it specific and unexpected", "Why it's underrated — what gets the attention and budget instead?", "A real example of this skill making a visible difference", "Why organisations should start hiring for it deliberately"],
    curveballs: ["Now argue that the skill you named is actually overrated — and something else matters more.", "What's the most overrated 'essential skill' in most job descriptions?"],
  },
  {
    id: "m12",
    text: "Is it better to specialize deeply in one skill or develop broad capability across many?",
    category: "Opinion", difficulty: "Medium", framework: "Past · Present · Future",
    hints: ["How the market has historically rewarded specialists vs. generalists", "What the current job landscape actually demands", "Where this is heading — which profile will be more valuable in ten years?"],
    curveballs: ["Now argue the opposite of whatever position you just took.", "How does your answer change completely depending on the industry or career stage?"],
  },
  {
    id: "m13",
    text: "What would make your city's public spaces genuinely worth spending time in?",
    category: "Opinion", difficulty: "Medium", framework: "What · So What · Now What",
    hints: ["What's currently missing from most public spaces — be specific", "Why it matters: what does good public space actually do for a community?", "One concrete, realistic change that would move things in the right direction"],
    curveballs: ["Now argue that cafes, gyms, and malls already do this better than cities ever will.", "Design the single best public space you can imagine — in 60 seconds."],
  },
  {
    id: "m14",
    text: "What does work-life balance actually look like — and does anyone get it right?",
    category: "Opinion", difficulty: "Medium", framework: "Past · Present · Future",
    hints: ["What 'balance' meant in a previous era and whether it was real", "What the honest picture looks like for most people today", "What genuinely sustainable work actually requires — not just less of it"],
    curveballs: ["Now argue that work-life balance is a flawed concept that needs a completely different frame.", "Convince a workaholic that balance matters without sounding like a self-help poster."],
  },
  {
    id: "m15",
    text: "Describe a team or community you've been part of that worked unusually well. What made it work?",
    category: "Personal", difficulty: "Medium", framework: "Story Arc",
    hints: ["Set the scene — who was in it and what were you trying to do?", "The specific dynamic that made it different from others", "A moment where the collaboration produced something none of you could have done alone", "What it taught you about how groups actually function vs. how we say they should"],
    curveballs: ["Now describe what causes great teams to fall apart — and what the early warning signs are.", "Argue that great teams are mostly luck, not design or leadership."],
  },
  {
    id: "m16",
    text: "Pitch a simple product or service idea that solves a real problem you encounter every week.",
    category: "Business", difficulty: "Medium", framework: "PREP",
    hints: ["Name the problem — make it specific and relatable, not abstract", "Why existing solutions don't fully work", "Your idea — explained in one sentence a ten-year-old could understand", "Who needs this and why they'd pay for it"],
    curveballs: ["Now identify the single biggest reason your idea would fail in the real market.", "Your competitor just launched something nearly identical. How do you differentiate in 30 seconds?"],
  },

  // ── Medium — Creative ────────────────────────────────────────────────────────
  {
    id: "cm1",
    text: "If you could redesign the way most offices are built, what one change would you make — and why?",
    category: "Creative", difficulty: "Medium", framework: "What · So What · Now What",
    hints: ["What's broken about most office design right now — be specific", "The real cost: productivity, wellbeing, or something else?", "Your redesign — one concrete change, not a utopia"],
    curveballs: ["Now argue that the physical office is already obsolete and redesigning it misses the point entirely.", "Your budget is near zero. What's the cheapest change with the biggest impact?"],
  },
  {
    id: "cm2",
    text: "If you could add one subject to every school's curriculum, what would it be and why?",
    category: "Creative", difficulty: "Medium", framework: "PREP",
    hints: ["Name the subject — be specific, not 'life skills' or 'critical thinking'", "What gap it fills that no current subject addresses", "What a lesson in this subject actually looks like on a Tuesday afternoon", "Why it belongs in school specifically, not self-taught or left to parents"],
    curveballs: ["Now argue that adding more subjects is the wrong direction — we should cut, not expand.", "What would you remove from the current curriculum to make room for it?"],
  },
  {
    id: "cm3",
    text: "Describe what a truly great neighborhood looks like — what does it have that most neighborhoods don't?",
    category: "Creative", difficulty: "Medium", framework: "What · So What · Now What",
    hints: ["Name 2–3 specific features — not 'community' or 'safety', but what concretely creates those things", "Why these features are rare — what forces work against them?", "One realistic change that would move most neighborhoods closer to this"],
    curveballs: ["Now argue that the perfect neighborhood doesn't exist — any design creates its own trade-offs.", "Who tends to get left out of most visions of a 'great neighborhood'?"],
  },

  // ── Hard — Philosophical ─────────────────────────────────────────────────────
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
  {
    id: "h9",
    text: "Has constant connectivity made us better at our jobs — or worse at being present?",
    category: "Philosophical", difficulty: "Hard", framework: "PREP",
    hints: ["Your claim — pick a side and commit, don't hedge", "The mechanism: how always being reachable changes the way we think or work", "Evidence or a telling example — research, observation, or a personal story", "The concession you'd make and why it doesn't change your conclusion"],
    curveballs: ["Now argue the opposite — that disconnecting is actually the luxury of the already successful.", "What if the answer is completely different depending on the type of work? Explore that."],
  },
  {
    id: "h10",
    text: "What does it mean to build something that lasts — in an era that rewards speed?",
    category: "Philosophical", difficulty: "Hard", framework: "Past · Present · Future",
    hints: ["What we used to build for durability — institutions, careers, relationships", "What speed culture has done to our idea of value and quality", "What genuinely lasting things look like today, and what they require of the people building them"],
    curveballs: ["Now argue that speed IS a form of durability — things that survive fast cycles are the most resilient.", "Apply this to your own work or life: what are you building that will outlast the current moment?"],
  },
  {
    id: "h11",
    text: "Argue that the way most organisations measure success is fundamentally broken.",
    category: "Philosophical", difficulty: "Hard", framework: "PREP",
    hints: ["The specific metric you're challenging — revenue, growth rate, headcount, or something else", "Why measuring it creates incentives that undermine the actual goal", "What happens when you optimize for the wrong thing — a concrete, recognizable example", "What you'd measure instead, and why that's harder to fake"],
    curveballs: ["Now defend the metric you just attacked — make the strongest possible case for why it exists.", "What happens when you remove all metrics entirely? Is that better or just differently broken?"],
  },
  {
    id: "h12",
    text: "What is the hidden cost of convenience — and should we think harder before paying it?",
    category: "Philosophical", difficulty: "Hard", framework: "What · So What · Now What",
    hints: ["Name a specific convenience and make its hidden cost concrete, not abstract", "Who pays the cost you're not paying — and why that matters", "What a life that honestly priced its conveniences would look like"],
    curveballs: ["Now argue that convenience is a genuine social good and its critics are naive or privileged.", "Pick an inconvenience you accept willingly in your own life — and explain why you do."],
  },
  {
    id: "h13",
    text: "Is it possible to be genuinely innovative while also being risk-averse? Argue a clear position.",
    category: "Philosophical", difficulty: "Hard", framework: "PREP",
    hints: ["Define innovation precisely — not just 'doing new things'", "The case for: how cautious, incremental approaches have produced real breakthroughs", "The case against: what risk-aversion kills before it ever starts", "Your verdict — and the conditions under which it changes"],
    curveballs: ["Now flip your answer and defend the other side convincingly.", "Apply this to a specific field — medicine, education, or urban planning."],
  },
  {
    id: "h14",
    text: "What do we lose when every local business becomes a franchise or chain?",
    category: "Philosophical", difficulty: "Hard", framework: "What · So What · Now What",
    hints: ["What independent local businesses actually provide beyond their products or services", "The systemic reason they're disappearing — not just 'big companies are bad'", "What can realistically be done, and what is probably lost permanently regardless"],
    curveballs: ["Now defend the chain or franchise — argue that consistency and affordability are genuine, underrated values.", "A small business owner in the room just closed their shop last week. Speak to them directly."],
  },

  // ── News — Current Affairs / Real-World Issues ───────────────────────────────
  // Evergreen topics that are continuously "in the news" — framed neutrally and
  // analytically, steered away from partisan or hot-button subjects.
  {
    id: "n1",
    text: "Companies are racing to adopt AI tools. How should a business decide where AI actually belongs — and where it doesn't?",
    category: "Current Affairs", difficulty: "News", framework: "What · So What · Now What",
    hints: ["Where AI genuinely adds value vs. where it's hype", "What's at stake if a company gets this decision wrong", "A practical rule of thumb anyone could apply"],
    curveballs: ["Now argue that most companies should slow down their AI adoption, not speed it up.", "A worker in the room is afraid AI will take their job. Speak to them directly."],
  },
  {
    id: "n2",
    text: "Electric vehicles are everywhere in the headlines. What's the single biggest thing still holding back mainstream adoption?",
    category: "Current Affairs", difficulty: "News", framework: "What · So What · Now What",
    hints: ["Name the barrier specifically — cost, charging, range, or something else", "Why it matters more than the alternatives", "What would actually move the needle"],
    curveballs: ["Now argue that the focus on electric cars distracts from better solutions like public transit.", "Convince a driver who loves their petrol car to seriously consider switching."],
  },
  {
    id: "n3",
    text: "As remote and hybrid work become permanent, what does this mean for the future of city centres?",
    category: "Current Affairs", difficulty: "News", framework: "Past · Present · Future",
    hints: ["What city centres were originally built around", "What's changing now that offices sit half-empty", "What a thriving city centre could look like in ten years"],
    curveballs: ["Now argue that remote work will ultimately make cities better, not worse.", "Make the case for why offices will come roaring back."],
  },
  {
    id: "n4",
    text: "Online courses can teach almost any skill for free. What does this mean for the value of a traditional degree?",
    category: "Current Affairs", difficulty: "News", framework: "Past · Present · Future",
    hints: ["What a degree used to guarantee", "What's shifting as skills become freely learnable online", "What employers will actually value in the future"],
    curveballs: ["Now argue that a traditional degree is more valuable than ever.", "Convince a teenager deciding between university and teaching themselves."],
  },
  {
    id: "n5",
    text: "Private companies are now leading space exploration. Is that a good thing for humanity?",
    category: "Current Affairs", difficulty: "News", framework: "PREP",
    hints: ["Your position — commit to it without hedging", "The single strongest reason in your favour", "A concrete example of private space progress (or its risks)", "Restate your case with conviction"],
    curveballs: ["Now argue the opposite of the position you just took.", "Someone says that money should be spent on Earth's problems first. Respond to them."],
  },
  {
    id: "n6",
    text: "The world is shifting toward renewable energy. What's the most underappreciated challenge in making that shift actually work?",
    category: "Current Affairs", difficulty: "News", framework: "What · So What · Now What",
    hints: ["Name the challenge — go beyond 'it's expensive'", "Why this challenge is so easy to overlook", "What needs to happen to address it"],
    curveballs: ["Now argue that we're moving far too slowly and should be much more aggressive.", "A worker whose job depends on fossil fuels is worried about the future. Address them."],
  },
  {
    id: "n7",
    text: "Housing affordability is a headline in nearly every major city. What's one change that would genuinely help — and why is it so hard to do?",
    category: "Current Affairs", difficulty: "News", framework: "What · So What · Now What",
    hints: ["The specific change you'd push for", "Why it would actually help, not just sound good", "Why it hasn't happened already"],
    curveballs: ["Now argue that the problem is overstated in at least some places.", "Make your case to a homeowner who fears your change would lower their property value."],
  },
  {
    id: "n8",
    text: "Mental health is discussed more openly than ever. Has that awareness translated into real change — or just more talk?",
    category: "Current Affairs", difficulty: "News", framework: "Past · Present · Future",
    hints: ["How mental health was treated in the past", "What's genuinely different today — and what isn't", "What real progress would look like next"],
    curveballs: ["Now argue that all the awareness has, in some ways, made things worse.", "Convince a workplace to move from talking about wellbeing to actually funding it."],
  },
  {
    id: "n9",
    text: "Many people feel their attention spans are shrinking. How much of that is really down to social media — and what can we do about it?",
    category: "Current Affairs", difficulty: "News", framework: "PREP",
    hints: ["Your claim — how big a role does social media really play?", "The mechanism — how these apps reshape attention", "Evidence or a relatable example", "One realistic step forward"],
    curveballs: ["Now argue that blaming social media lets us off the hook too easily.", "Convince someone who sees nothing wrong with five hours of scrolling a day."],
  },
  {
    id: "n10",
    text: "The gig economy promised flexibility and freedom. For workers, has it actually delivered?",
    category: "Current Affairs", difficulty: "News", framework: "PREP",
    hints: ["Your verdict — be clear", "The strongest point for your side", "A concrete example of a gig worker's day-to-day reality", "The concession you'd make, and why your view still holds"],
    curveballs: ["Now argue the opposite side just as convincingly.", "Propose the single change that would make gig work genuinely fairer."],
  },
  {
    id: "n11",
    text: "AI can now write, draw, and compose. What does that mean for human creativity — a threat, a tool, or something else?",
    category: "Current Affairs", difficulty: "News", framework: "What · So What · Now What",
    hints: ["Where AI-generated content actually stands today", "Why it matters for people who create for a living", "How creators should respond"],
    curveballs: ["Now argue the position opposite to the one you just took.", "A young artist asks whether it's even worth learning their craft anymore. Answer them."],
  },
  {
    id: "n12",
    text: "Cities and companies keep pledging to cut single-use plastic. Why is it so hard — and what would actually make a difference?",
    category: "Current Affairs", difficulty: "News", framework: "What · So What · Now What",
    hints: ["Why single-use plastic is so deeply entrenched", "Why most pledges quietly fall short", "The one change that would move the needle most"],
    curveballs: ["Now argue that individual recycling efforts are a distraction from the real fix.", "Convince a small business owner that cutting plastic is worth the added cost."],
  },
  {
    id: "n13",
    text: "You're the CEO of a major airline. Defend your company's carbon offset programme to a room of climate scientists who have read the small print.",
    category: "Current Affairs", difficulty: "News", framework: "PREP",
    hints: ["Acknowledge what they already know — don't pretend the criticisms aren't real", "The strongest honest case for offsets as a bridge, not a solution", "What the airline is doing beyond offsets that they may not have heard", "The ask: what you need from them, not just what you're promising"],
    curveballs: ["A scientist stands up and says offsets are 'organised lying.' Respond directly.", "Now argue from their side — make the case that offsets do more harm than good by letting companies avoid real cuts."],
  },
  {
    id: "n14",
    text: "Explain the concept of a 'cost of living crisis' to someone who has never once worried about paying a bill.",
    category: "Current Affairs", difficulty: "News", framework: "Story Arc",
    hints: ["Find an analogy from their world — don't lecture", "Walk them through one specific week in someone else's life", "The decision that person has to make that your audience has never had to"],
    curveballs: ["They say: 'but people just need to budget better.' Respond without losing them.", "Now flip it — make the case that financial stress, at some level, sharpens decision-making."],
  },
  {
    id: "n15",
    text: "Make the case that doomscrolling is a completely rational response to the state of the world right now.",
    category: "Current Affairs", difficulty: "News", framework: "PREP",
    hints: ["Your claim — defend it seriously, not as a joke", "The logic: why staying informed, even compulsively, makes sense", "What doomscrolling is actually doing that people who dismiss it don't understand", "The concession — and why your position still holds"],
    curveballs: ["Now argue that doomscrolling is one of the most self-destructive habits of the modern era.", "Convince a therapist who spends their week treating anxiety caused by news consumption."],
  },
  {
    id: "n16",
    text: "You have 90 seconds to convince a city council not to cut the budget for public libraries.",
    category: "Current Affairs", difficulty: "News", framework: "What · So What · Now What",
    hints: ["Lead with what a library actually is in 2025 — not just books", "The specific people who lose most when it closes — make them real", "The cost of cutting it vs. the cost of keeping it — reframe the numbers"],
    curveballs: ["A councillor says: 'everything a library does, a smartphone does better.' Answer them.", "Now argue the other side: given tight budgets, libraries are not the highest-impact use of public money."],
  },
  {
    id: "n17",
    text: "Convince a room of shareholders that the decision that made the most money last quarter was also the worst one the company made.",
    category: "Current Affairs", difficulty: "News", framework: "Past · Present · Future",
    hints: ["Name the type of decision — be specific enough to be credible", "What it cost that won't show up in this year's numbers", "What a company that thinks in decades looks like vs. one that thinks in quarters"],
    curveballs: ["A shareholder says: 'that's what competitors are doing too, so it's table stakes.' Respond.", "Now make the steelman case: short-term profit maximisation is exactly what shareholders are owed."],
  },
  {
    id: "n18",
    text: "Argue that the best investment a government can make in public health costs almost nothing.",
    category: "Current Affairs", difficulty: "News", framework: "PREP",
    hints: ["Name the intervention — be specific, not vague ('more exercise')","The evidence that cheap, unsexy interventions outperform expensive ones", "Why this isn't what gets funded — and what that reveals about how decisions get made", "The ask"],
    curveballs: ["A health minister says: 'if it were that simple, we'd already be doing it.' Respond.", "Now argue that underfunding health systems is a choice, not a budget constraint, and cheap fixes let governments off the hook."],
  },
  {
    id: "n19",
    text: "Convince a group of tech founders that moving fast and breaking things has broken something important.",
    category: "Current Affairs", difficulty: "News", framework: "What · So What · Now What",
    hints: ["Name the thing that got broken — specifically, not abstractly", "Why speed felt like the right call at the time — show you understand the logic", "What building carefully actually looks like, and why it isn't the same as moving slowly"],
    curveballs: ["A founder says: 'the alternative is irrelevance — slow companies die.' Respond.", "Now defend the move-fast philosophy: argue that over-caution has its own body count."],
  },
  {
    id: "n20",
    text: "Make the case that traffic jams are a sign of a city that is working, not failing.",
    category: "Current Affairs", difficulty: "News", framework: "PREP",
    hints: ["Your claim — own the provocation", "The mechanism: what congestion actually signals about economic activity and density", "Where your argument breaks down — and why it still holds overall"],
    curveballs: ["Now argue the obvious counter: congestion is a policy failure and the data on productivity loss proves it.", "Apply your argument to a specific city that is held up as a traffic success story — and stress-test it."],
  },
  {
    id: "n21",
    text: "You're addressing a room of coal miners whose plant is closing in six months. Tell them what comes next.",
    category: "Current Affairs", difficulty: "News", framework: "Story Arc",
    hints: ["Don't open with policy — open with the room", "Be honest about the timeline: what is actually available, and when", "What you're asking of them — and what you owe them in return"],
    curveballs: ["Someone shouts: 'you said this transition would be just.' Respond.", "Now argue from the other side: that delaying plant closures for social reasons is borrowing against the climate."],
  },
  {
    id: "n22",
    text: "Argue that the loneliness epidemic is a design problem, not a personal failure.",
    category: "Current Affairs", difficulty: "News", framework: "What · So What · Now What",
    hints: ["What we've designed out of everyday life that used to create incidental connection", "Why framing loneliness as individual weakness is convenient for the people who built that design", "One specific change — to a place, a policy, or a platform — that would actually help"],
    curveballs: ["Now argue that technology is actually the most powerful antidote to loneliness we've ever had.", "Convince a company that its product is contributing to the problem — and that fixing it is in their interest."],
  },
  {
    id: "n23",
    text: "Make the case that a four-day school week would produce better-educated children.",
    category: "Current Affairs", difficulty: "News", framework: "PREP",
    hints: ["Your claim — don't hedge", "What the evidence from places that have tried it actually shows", "What happens to the fifth day — and why that matters as much as the cut", "The strongest objection and your answer to it"],
    curveballs: ["A parent says: 'this is just about saving money, dressed up as pedagogy.' Respond.", "Now argue that school hours are irrelevant — the real variable is what happens inside them."],
  },
];

// ── Trial prompts ────────────────────────────────────────────────────────────
// Shown to anonymous visitors in the 30-second landing-page trial — often the
// app's very first impression, and often a non-native English speaker. These
// are deliberately the SIMPLEST prompts in the app: short, concrete, everyday,
// answerable in one breath. Kept separate from the signed-in "Easy" pool (which
// runs longer and more abstract) so the trial never opens with a wall of text.
const TRIAL_PROMPTS: string[] = [
  "What is your favorite food, and why?",
  "Talk about your best friend.",
  "What did you do last weekend?",
  "Describe your favorite place to relax.",
  "What is your favorite hobby?",
  "Talk about a movie or show you like.",
  "What is one thing that makes you happy?",
  "Describe your morning routine.",
  "What is your dream job?",
  "Talk about a place you want to visit.",
  "What is your favorite season, and why?",
  "Describe a gift you were happy to receive.",
];

export const TRIAL_TOPICS: ImpromptuTopic[] = TRIAL_PROMPTS.map((text, i) => ({
  id: `trial-${i + 1}`,
  text,
  category: "Personal",
  difficulty: "Easy",
  framework: "PREP",
  hints: [],
  curveballs: [],
}));

/** A short, simple prompt for the anonymous landing-page trial. */
export function getRandomTrialTopic(): ImpromptuTopic {
  return TRIAL_TOPICS[Math.floor(Math.random() * TRIAL_TOPICS.length)];
}

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
