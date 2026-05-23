const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

// Valid production models
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite-preview-02-05", "gemini-1.5-flash"];
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

async function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

// --- MULTI-PROVIDER AI CALLER ---
async function callAI(prompt: string, attempt: number = 0, temperature: number = 0.7): Promise<string> {
  // Try Gemini first (attempt 0-2)
  if (attempt < 3 && GEMINI_API_KEY) {
    const model = GEMINI_MODELS[attempt % GEMINI_MODELS.length];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature }
        })
      });
      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
      const errorText = await res.text();
      console.warn(`Gemini API Error (${res.status}): ${errorText.slice(0, 100)}`);
      
      if (res.status === 429 || res.status === 404 || res.status === 400) {
        console.warn(`Gemini attempt ${attempt} failed. Trying next...`);
        return callAI(prompt, attempt + 1, temperature);
      }
    } catch (e) { console.error("Gemini Fetch Error:", e); }
  }

  // Fallback to Groq (attempt 3+)
  if (GROQ_API_KEY) {
    const model = GROQ_MODELS[(attempt - 3) % GROQ_MODELS.length] || GROQ_MODELS[0];
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: temperature
        })
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      }
      const errorText = await res.text();
      console.warn(`Groq API Error (${res.status}): ${errorText.slice(0, 100)}`);

      if (res.status === 429 && attempt < 5) {
        await sleep(1000);
        return callAI(prompt, attempt + 1, temperature);
      }
    } catch (e) { console.error("Groq Fetch Error:", e); }
  }

  throw new Error("All AI providers (Gemini & Groq) are currently at capacity or misconfigured. Please check API keys and try again.");
}

// --- MULTI-PROVIDER TRANSCRIPTION ---
export async function transcribeAudio(blob: Blob, attempt: number = 0): Promise<string> {
  const cleanMimeType = blob.type.split(';')[0] || "audio/webm";
  console.log(`[Transcription] Attempt ${attempt}, Blob size: ${blob.size}, MIME: ${cleanMimeType}`);
  
  // Try Groq Whisper FIRST for transcription as it has much higher limits and is faster
  if (GROQ_API_KEY && attempt === 0) {
    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      formData.append("model", "whisper-large-v3-turbo");
      
      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        return data.text || "";
      }
      const err = await res.text();
      console.warn(`Groq Whisper failed (${res.status}): ${err.slice(0, 100)}`);
    } catch (e) { console.error("Groq Whisper Exception:", e); }
  }

  // Fallback to Gemini Multimodal
  if (GEMINI_API_KEY) {
    const model = GEMINI_MODELS[attempt % GEMINI_MODELS.length];
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(blob);
      });
      const base64Data = await base64Promise;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Transcribe the audio exactly. Output only the transcript." },
              { inline_data: { mime_type: cleanMimeType, data: base64Data } }
            ]
          }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
      const err = await res.text();
      console.warn(`Gemini Transcription failed (${res.status}) for ${model}: ${err.slice(0, 100)}`);
    } catch (e) { console.error("Gemini Transcription Exception:", e); }
  }

  if (attempt < 2) {
    await sleep(1000); // Wait 1s before retrying
    return transcribeAudio(blob, attempt + 1);
  }
  throw new Error("Transcription failed on all providers. Check your browser console for specific API errors (429 = Rate Limit, 401 = Invalid Key).");
}

// --- SHARED LOGIC ---
export interface InterviewQuestion { id: string; question: string; category: string; difficulty: string; keyPoints: string[]; followUp?: string; }
export interface SpeakingDrill { id: string; title: string; objective: string; prompt: string; steps: string[]; selfReviewQuestions: string[]; duration: number; }
export interface ImpromptuPrompt { id: string; topic: string; category: string; framework: string; frameworkSteps: string[]; example: { label: string; text: string }[]; }

export async function generateInterviewQuestions(category: string, difficulty: string, count: number = 3): Promise<InterviewQuestion[]> {
  const prompt = `Generate ${count} interview questions for ${category} (${difficulty}). Return JSON array.`;
  const response = await callAI(prompt);
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : "[]").map((q: any, i: number) => ({ ...q, id: `int-${Date.now()}-${i}` }));
}

export async function generateSpeakingDrills(focus: string, count: number = 2): Promise<SpeakingDrill[]> {
  const prompt = `Generate ${count} speaking drills for ${focus}. Return JSON array.`;
  const response = await callAI(prompt);
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : "[]").map((d: any, i: number) => ({ ...d, id: `dr-${Date.now()}-${i}` }));
}

export async function generateImpromptuPrompts(category: string, count: number = 3): Promise<ImpromptuPrompt[]> {
  const prompt = `Generate ${count} impromptu topics for ${category}. Return JSON array with topic, category, framework, frameworkSteps, example. KEEP THE TOPIC SHORT AND PUNCHY (MAX 7 WORDS).`;
  const response = await callAI(prompt);
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : "[]").map((t: any, i: number) => ({ ...t, id: `imp-${Date.now()}-${i}` }));
}

export async function generateArenaPrompt(gamemode: string): Promise<string> {
  const themes = [
    "Futurism", "Ancient History", "Absurdist Humor", "Corporate Satire", 
    "Deep Ethics", "Childhood Wonder", "Cyberpunk", "Nature & Ecology",
    "Space Exploration", "Psychology", "Street Smarts", "Pop Culture",
    "Hidden Secrets", "The Uncanny", "Daily Inconveniences", "Surrealism",
    "Food Culture", "Social Media", "Urban Legends", "Mythology",
    "Time Travel", "Parallel Universes", "The 90s Nostalgia", "Luxury Living",
    "Minimalism", "Sports Culture", "Fashion Evolution", "Pet Psychology"
  ];
  const styles = [
    "Socratic", "Provocative", "Whimsical", "Grim", "Enthusiastic", "Cynical", "Mysterious",
    "Inquisitive", "Deadpan", "Over-the-top", "Stoic", "Playful", "Academic-lite"
  ];
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  const seed = Math.random().toString(36).substring(7);

  const systemPrompt = `You are a creative prompt engineer for an elite public speaking app.
  Gamemode: ${gamemode}
  Inspiration Theme: ${randomTheme}
  Tone/Style: ${randomStyle}
  Random Seed: ${seed}
  
  Requirements:
  - If blitz: A fast-paced choice or "hot take".
  - If debate: A high-stakes "This House believes..." motion.
  - If pitch: A product/service that solves a bizarre or hyper-specific problem.
  - If standard: A profound, paradoxical, or highly unusual question.

  CRITICAL: BE UNCONVENTIONAL BUT ACCESSIBLE. 
  Avoid clichés (no climate change, no AI ethics, no leadership, no failure, no school uniforms). 
  Avoid boring or hyper-academic topics. Make it something a person could talk about at a dinner party.
  Make it relatable to a general audience. Use simple but thought-provoking language.
  
  Return ONLY the prompt text. No quotes. MAXIMUM 10 WORDS.`;
  
  return callAI(systemPrompt, 0, 1.2); // High temperature for maximum variety
}

export async function generateAIArgument(prompt: string, durationSeconds: number, gamemode: string, persona?: any): Promise<string> {
  const wordCount = Math.floor(durationSeconds * 2.2); // ~2.2 words/sec speaking pace

  let gamemodeInstructions = "Deliver a compelling, standalone speech";
  if (gamemode === "debate") {
    if (prompt.includes("Your opponent is arguing AGAINST")) {
      gamemodeInstructions = "Write a strong, argumentative opening statement for a debate AGAINST the motion";
    } else if (prompt.includes("Your opponent is arguing FOR")) {
      gamemodeInstructions = "Write a strong, argumentative opening statement for a debate IN FAVOR OF the motion";
    } else {
      gamemodeInstructions = "Write a strong, argumentative opening statement for a debate IN FAVOR OF the motion";
    }
  }
  if (gamemode === "pitch") gamemodeInstructions = "Act as a strict investor/client. State a complex problem or objection in 2-3 sentences that the user must pitch a solution for";
  if (gamemode === "blitz") gamemodeInstructions = "Deliver a rapid-fire, high-energy impromptu speech";

  let personaInstructions = `You are an elite competitive speaker in a ${durationSeconds}-second argument battle.`;
  if (persona) {
    personaInstructions = `You are ${persona.name}. 
    Personality: ${persona.personality}
    Skill Level: ${persona.skill}. 
    STRENGTHS: ${persona.strengths}. 
    WEAKNESSES: ${persona.weaknesses}.
    
    IMPORTANT: Do not make your points too complex or 'AI-like'. Keep them human, grounded, and appropriate for your skill level (${persona.skill}).`;
  }

  const fullPrompt = `${personaInstructions}
The topic is: "${prompt}"

${gamemodeInstructions} that:
1. Is approximately ${wordCount} words (fills exactly ${durationSeconds} seconds when spoken aloud at normal pace)
2. Has a clear opening hook, structured middle, and memorable closing line
3. Uses vivid language, rhetorical devices, and natural spoken cadence — not essay-style prose
4. Feels like a real human speaking passionately and confidently
5. Contains NO stage directions, NO labels, NO formatting — just the raw speech text

Return ONLY the speech text. Nothing else.`;

  return callAI(fullPrompt);
}

export async function judgeBattle(
  hostName: string,
  transcript: string, 
  prompt: string, 
  challengerName?: string,
  opponentTranscript?: string
): Promise<{ 
  score: number, 
  feedback: string, 
  strengths: string,
  oppStrengths?: string,
  oppScore?: number,
  oppFeedback?: string,
  winner?: "you" | "opponent" | "tie",
  exampleSpeech?: string
}> {
  let systemPrompt = "";
  let fullPrompt = "";

  if (opponentTranscript && challengerName) {
    systemPrompt = `You are an expert, constructive, and friendly public speaking judge. 
    Compare the performances of ${hostName} and ${challengerName} based on this prompt: "${prompt}". 
    
    CRITICAL RULES:
    1. If a transcript is empty, silent, or nonsense (e.g., "[silence]"), SCORE IT 0 and award the win to the other speaker.
    2. The "winner" MUST ALWAYS be the speaker with the higher numerical score. DO NOT award a win to a lower score.
    3. If scores are within 5 points, "tie" is acceptable, but preference should be given to the more charismatic speaker.
    4. Be honest and merit-based. A poor performance MUST result in a loss.
    
    Return JSON only:
    {
      "score": (${hostName}'s score 0-100),
      "oppScore": (${challengerName}'s score 0-100),
      "feedback": (Constructive summary written directly to ${hostName}),
      "oppFeedback": (Constructive summary written directly to ${challengerName}),
      "strengths": (${hostName}'s specific technical strengths, as a clear comma-separated list),
      "oppStrengths": (${challengerName}'s specific technical strengths, as a clear comma-separated list),
      "winner": "you" | "opponent" | "tie",
      "exampleSpeech": "A high-quality version of the speech ${hostName} SHOULD have given, incorporating all the feedback above to show them how it's done."
    }
    NOTE: "winner" MUST be "opponent" if ${hostName} provided no content.`;
    fullPrompt = `${systemPrompt}\n\n${hostName}'s TRANSCRIPT: ${transcript}\n\n${challengerName}'s TRANSCRIPT: ${opponentTranscript}`;
  } else {
    systemPrompt = `You are an encouraging but strict public speaking coach. Judge this speech by ${hostName} based on prompt: "${prompt}". 
    If the transcript is empty or nonsense, score it 0. Be honest but friendly. 
    Return JSON {
      "score": 0-100, 
      "feedback": "summary", 
      "strengths": "comma-separated technical strengths",
      "exampleSpeech": "A high-quality version of the speech ${hostName} SHOULD have given, incorporating all the feedback above to show them how it's done."
    }.`;
    fullPrompt = `${systemPrompt}\n\n${hostName}'s Transcript: ${transcript}`;
  }

  const result = await callAI(fullPrompt);
  const jsonMatch = result.match(/{[\s\S]*}/);
  const p = JSON.parse(jsonMatch ? jsonMatch[0] : '{"score":50,"feedback":"Error","strengths":"Attempt"}');
  
  // Programmatically determine the winner to ensure consistency regardless of AI string response
  let finalWinner: "you" | "opponent" | "tie" = "tie";
  const s1 = p.score || 0;
  const s2 = p.oppScore || 0;
  
  if (opponentTranscript) {
    if (s1 > s2) finalWinner = "you";
    else if (s2 > s1) finalWinner = "opponent";
    else finalWinner = "tie";
  } else {
    // Solo mode: score > 0 is a success/win
    finalWinner = s1 > 0 ? "you" : "tie";
  }
  
  return { 
    score: s1, 
    oppScore: s2,
    feedback: p.feedback || "No significant content provided to evaluate.", 
    oppFeedback: p.oppFeedback || p.feedback || "No significant content provided to evaluate.",
    strengths: p.strengths || "N/A",
    oppStrengths: p.oppStrengths || "N/A",
    winner: finalWinner,
    exampleSpeech: p.exampleSpeech || ""
  };
}

export async function chatWithAssistant(history: { role: string; content: string }[], currentContext: any): Promise<{ text: string; navigateTo?: string }> {
  const contextStr = JSON.stringify(currentContext);
  const systemPrompt = `You are the SpeakBold AI Coach, an expert in public speaking and the ultimate guide for this application.
You are friendly, direct, and encouraging. Keep answers concise.

Current App Context (User State): ${contextStr}

The user can ask you for public speaking advice OR to navigate the app.
If the user asks to go somewhere, you MUST provide a "navigateTo" path.
Available paths:
- "/" (Home/Landing)
- "/pathway" (Curriculum/Learning)
- "/lab" (Skill Surgery/Drills)
- "/arena" (Practice Lounge/Battles)
- "/profile" (Stats/Resume)
- "/leaderboard" (Rankings)

CRITICAL: You must return a valid JSON object ONLY. Do not wrap in markdown blocks.
Format:
{
  "text": "Your helpful response here...",
  "navigateTo": "/path" (optional, omit if no navigation needed)
}`;

  const fullPrompt = systemPrompt + "\n\nChat History:\n" + history.map(h => `${h.role}: ${h.content}`).join("\n") + "\nassistant: ";
  
  try {
    const rawResponse = await callAI(fullPrompt);
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { text: rawResponse };
  } catch (err) {
    console.error("[chatWithAssistant] Error:", err);
    return { text: "I'm having trouble connecting to my servers right now. Please try again later." };
  }
}

export async function judgePathwayDrill(
  userName: string,
  transcript: string,
  lessonTitle: string,
  lessonObjective: string,
  lessonPrompt: string,
  passScore: number = 70
): Promise<{
  score: number;
  feedback: string;
  strengths: string;
  coaching: string;
  exampleSpeech: string;
  passed: boolean;
}> {
  if (!transcript || transcript.trim().length < 10) {
    return {
      score: 0,
      feedback: "No speech detected. Please ensure your microphone is working and try again.",
      strengths: "N/A",
      coaching: "Make sure you speak clearly into your microphone for the full duration of the drill.",
      exampleSpeech: "",
      passed: false,
    };
  }

  const systemPrompt = `You are an expert, encouraging public speaking coach evaluating a student's drill performance.

DRILL: "${lessonTitle}"
OBJECTIVE: "${lessonObjective}"
PROMPT GIVEN: "${lessonPrompt}"
STUDENT: ${userName}

Evaluate the transcript against the drill's specific objective. Be honest, constructive, and encouraging.

Return JSON ONLY:
{
  "score": (0-100, how well they met the drill objective),
  "feedback": "2-3 sentence overall verdict written directly to ${userName}, mentioning what they did well and what needs work",
  "strengths": "comma-separated list of 2-4 specific technical strengths demonstrated",
  "coaching": "1 specific, actionable coaching tip they should focus on for next time",
  "exampleSpeech": "A short, high-quality model response to this drill prompt showing exactly how an expert would execute it (2-4 sentences)"
}`;

  const fullPrompt = `${systemPrompt}\n\nSTUDENT TRANSCRIPT: ${transcript}`;

  try {
    const result = await callAI(fullPrompt);
    const jsonMatch = result.match(/{[\s\S]*}/);
    const p = JSON.parse(jsonMatch ? jsonMatch[0] : '{"score":50,"feedback":"Analysis unavailable.","strengths":"Attempted","coaching":"Keep practicing.","exampleSpeech":""}');
    const score = Math.max(0, Math.min(100, p.score || 0));
    return {
      score,
      feedback: p.feedback || "Good effort. Keep practicing!",
      strengths: p.strengths || "Attempted the drill",
      coaching: p.coaching || "Keep refining your technique.",
      exampleSpeech: p.exampleSpeech || "",
      passed: score >= passScore,
    };
  } catch (err) {
    console.error("[judgePathwayDrill] Error:", err);
    return {
      score: 0,
      feedback: "AI analysis timed out. Your session was still recorded.",
      strengths: "Completed the drill",
      coaching: "Try again — you're making progress.",
      exampleSpeech: "",
      passed: false,
    };
  }
}

export async function generateBodyLanguageFeedback(metrics: {
  posture: number;
  eyeContact: number;
  expression: number;
  gesture: number;
  overall: number;
  durationSecs: number;
}): Promise<{ bullets: string[]; title: string }> {
  const prompt = `You are an expert body language coach for public speakers. A student just completed a ${metrics.durationSecs}-second practice session with these AI-measured scores:

- Posture & Alignment: ${metrics.posture}/100
- Eye Contact: ${metrics.eyeContact}/100
- Facial Expressiveness: ${metrics.expression}/100
- Gesture Activity: ${metrics.gesture}/100
- Overall Score: ${metrics.overall}/100

Give exactly 3 specific, actionable coaching bullets. Reference the actual scores. Be direct, warm, and concrete — no generic advice.
Also write a short session title (4-6 words max) that captures their key insight or win.

Return JSON ONLY:
{
  "title": "Short session title here",
  "bullets": ["Specific bullet 1", "Specific bullet 2", "Specific bullet 3"]
}`;

  try {
    const result = await callAI(prompt);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    const p = JSON.parse(
      jsonMatch?.[0] ??
        '{"title":"Keep Building","bullets":["Focus on shoulder alignment for a stronger presence.","Sustain eye contact through the full sentence.","Let your hands move naturally to reinforce your words."]}'
    );
    return { title: p.title ?? "Session Complete", bullets: Array.isArray(p.bullets) ? p.bullets.slice(0, 3) : [] };
  } catch {
    return {
      title: "Keep Building",
      bullets: [
        `Your overall score of ${metrics.overall} shows real potential — consistency is the next step.`,
        "Eye contact is your audience's trust signal — practice holding it through full thoughts.",
        "Use deliberate gestures to anchor your key points and project authority.",
      ],
    };
  }
}
