import { supabase } from "@/integrations/supabase/client";
import {
  DIMENSION_LABELS,
  DIMENSION_TRACK,
  type AdaptiveDrill,
  type AdaptivePlan,
  type Dimension,
  type SkillProfile,
} from "@/lib/skillProfile";

// ─── Keys (add to .env to unlock each provider) ────────────────────────────
const GEMINI_API_KEY   = import.meta.env.VITE_GEMINI_API_KEY      || "";
const GROQ_API_KEY     = import.meta.env.VITE_GROQ_API_KEY        || "";
const OPENROUTER_KEY   = import.meta.env.VITE_OPENROUTER_API_KEY  || "";
const CEREBRAS_KEY     = import.meta.env.VITE_CEREBRAS_API_KEY    || "";
const HUGGINGFACE_KEY  = import.meta.env.VITE_HUGGINGFACE_API_KEY || "";
const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL        || "";

// ─── Model lists ───────────────────────────────────────────────────────────
// Gemini: use stable v1 endpoint — works for all 1.5 + 2.0 models
const GEMINI_TEXT_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash-8b"];
const GROQ_TEXT_MODELS   = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
const OPENROUTER_MODELS  = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
];

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const geminiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

// ─── TEXT providers (each returns null on failure, string on success) ──────

async function tryOpenRouter(prompt: string, temperature: number): Promise<string | null> {
  if (!OPENROUTER_KEY) return null;
  for (const model of OPENROUTER_MODELS) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": "https://speakbold.app",
          "X-Title": "SpeakBold",
        },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) { console.log(`[AI] ✓ OpenRouter ${model}`); return text; }
      }
      if (res.status === 429) await sleep(400);
    } catch { /* try next */ }
  }
  return null;
}

async function tryCerebras(prompt: string, temperature: number): Promise<string | null> {
  if (!CEREBRAS_KEY) return null;
  try {
    const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${CEREBRAS_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b",
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: 2048,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) { console.log("[AI] ✓ Cerebras"); return text; }
    }
  } catch { /* fall through */ }
  return null;
}

async function tryGeminiText(prompt: string, temperature: number): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  for (const model of GEMINI_TEXT_MODELS) {
    try {
      const res = await fetch(geminiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) { console.log(`[AI] ✓ Gemini ${model}`); return text; }
      }
      const status = res.status;
      console.warn(`[AI] Gemini ${model} → ${status}`);
      if (status === 400) break; // Bad request, stop trying Gemini
      // 429 quota or 404 model gone — try next model
    } catch { /* try next */ }
  }
  return null;
}

async function tryGroqText(prompt: string, temperature: number): Promise<string | null> {
  if (!GROQ_API_KEY) return null;
  for (const model of GROQ_TEXT_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) { console.log(`[AI] ✓ Groq ${model}`); return text; }
      }
      const status = res.status;
      console.warn(`[AI] Groq ${model} → ${status}`);
      if (status === 401) break;  // Invalid key — stop trying Groq models
      if (status === 429) await sleep(800);
    } catch { /* try next */ }
  }
  return null;
}

// ─── MAIN TEXT CALLER ──────────────────────────────────────────────────────
// Waterfall: Groq → OpenRouter (free) → Cerebras → Gemini (3 models)
// _attempt kept for backwards-compat with call sites that pass it; ignored internally
export async function callAI(prompt: string, _attempt = 0, temperature = 0.7): Promise<string> {
  const result =
    (await tryGroqText(prompt, temperature)) ??
    (await tryOpenRouter(prompt, temperature)) ??
    (await tryCerebras(prompt, temperature)) ??
    (await tryGeminiText(prompt, temperature));

  if (result) return result;
  throw new Error("All AI providers exhausted. Check API keys and quota in the browser console.");
}

// ─── TRANSCRIPTION providers ───────────────────────────────────────────────

async function transcribeWithGroq(blob: Blob): Promise<string | null> {
  if (!GROQ_API_KEY) return null;
  try {
    const form = new FormData();
    // Whisper infers format from the filename extension — name it to match the
    // actual blob type so iOS recordings (audio/mp4) aren't rejected as ".webm".
    const t = blob.type;
    const ext = t.includes("mp4") || t.includes("m4a") || t.includes("aac") ? "m4a"
      : t.includes("ogg") ? "ogg"
      : t.includes("mpeg") || t.includes("mp3") ? "mp3"
      : t.includes("wav") ? "wav"
      : "webm";
    form.append("file", blob, `recording.${ext}`);
    form.append("model", "whisper-large-v3-turbo");
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: form,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.text) { console.log("[Transcribe] ✓ Groq Whisper"); return data.text; }
    }
    const err = await res.text().catch(() => "");
    console.warn(`[Transcribe] Groq Whisper (${res.status}): ${err.slice(0, 80)}`);
  } catch (e) { console.warn("[Transcribe] Groq exception:", e); }
  return null;
}

async function transcribeWithHuggingFace(blob: Blob): Promise<string | null> {
  if (!HUGGINGFACE_KEY) return null;
  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo",
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${HUGGINGFACE_KEY}` },
        body: blob,
      },
    );
    if (res.ok) {
      const data = await res.json();
      if (data.text) { console.log("[Transcribe] ✓ HuggingFace Whisper"); return data.text; }
    }
    const err = await res.text().catch(() => "");
    console.warn(`[Transcribe] HuggingFace (${res.status}): ${err.slice(0, 80)}`);
  } catch (e) { console.warn("[Transcribe] HuggingFace exception:", e); }
  return null;
}

async function transcribeWithGemini(blob: Blob): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  const mimeType = blob.type.split(";")[0] || "audio/webm";
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.readAsDataURL(blob);
  });
  for (const model of GEMINI_TEXT_MODELS) {
    try {
      const res = await fetch(geminiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Transcribe the audio exactly. Output only the transcript, no commentary." },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) { console.log(`[Transcribe] ✓ Gemini ${model}`); return text; }
      }
      const status = res.status;
      const err = await res.text().catch(() => "");
      console.warn(`[Transcribe] Gemini ${model} (${status}): ${err.slice(0, 80)}`);
      if (status === 400) break;
    } catch (e) { console.warn("[Transcribe] Gemini exception:", e); }
  }
  return null;
}

// ─── MAIN TRANSCRIPTION CALLER ─────────────────────────────────────────────
// Waterfall: Groq Whisper → HuggingFace Whisper → Gemini (3 models, multimodal)
// _attempt kept for backwards-compat; ignored internally
export async function transcribeAudio(blob: Blob, _attempt = 0): Promise<string> {
  console.log(`[Transcribe] blob=${blob.size}B mime=${blob.type}`);
  const result =
    (await transcribeWithGroq(blob)) ??
    (await transcribeWithHuggingFace(blob)) ??
    (await transcribeWithGemini(blob));

  if (result?.trim()) return result;
  throw new Error(
    "Transcription failed on all providers. Check console (401 = bad key, 429 = quota exceeded)."
  );
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

Evaluate the transcript against the drill's specific objective. Reward effort and on-topic execution generously — this is a learning environment, not an audition.

SCORING RUBRIC (bias toward generosity):
- 90–100: Exceptional. Clear, confident, hits every part of the objective.
- 75–89:  Strong. Meets the objective with only minor rough edges. THIS IS THE DEFAULT BAND for a solid attempt.
- 65–74:  Solid. On-topic, recognizable structure, a few weak spots. Most genuine attempts land here or above.
- 50–64:  Developing. On-topic but missing key elements of the objective.
- Below 50: Reserve for transcripts that are off-topic, near-silent, incoherent, or fundamentally don't engage with the prompt.

Default to scoring in the 70s for a real, on-topic attempt. Only score below 60 if the student clearly failed to address the prompt or said almost nothing. Filler words, brief stumbles, and minor disorganization should NOT push the score below 65 on their own.

Return JSON ONLY:
{
  "score": (0-100, calibrated to the rubric above),
  "feedback": "2-3 sentence overall verdict written directly to ${userName}, leading with what worked and framing weaknesses as next steps",
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

// ─── IMPROMPTU COACH ─────────────────────────────────────────────────────────

export interface ImpromptuCoachReport {
  score: number;
  verdict: string;
  sayMore: { quote: string; why: string }[];
  cut: { quote: string; why: string }[];
  shouldHaveSaid: { opening: string; closing: string; tighter: string };
  frameworkCheck: { step: string; hit: boolean; note: string }[];
  fillerNote: string;
  paceNote: string;
  nextFocus: string;
}

export async function coachImpromptu(
  topic: { text: string; framework: string; hints: string[] },
  transcript: string,
  durationSeconds: number,
  fillerCount: number,
  wpm: number
): Promise<ImpromptuCoachReport> {
  const systemPrompt = `You are an elite impromptu speaking coach. A student just completed a ${durationSeconds}-second impromptu speech.

TOPIC: "${topic.text}"
FRAMEWORK: ${topic.framework} (steps: ${topic.hints.join(" → ")})
TRANSCRIPT: """${transcript}"""
METRICS: ${wpm} WPM, ${fillerCount} filler words detected

Analyze the transcript with surgical precision. Be honest, specific, and quote actual lines from the transcript.

Return JSON ONLY — no markdown, no prose outside the JSON:
{
  "score": (0-100, overall performance),
  "verdict": "(2 sentences max — the single most important insight about this speech)",
  "sayMore": [
    { "quote": "(short exact quote or paraphrase from transcript)", "why": "(why this point had potential that was left undeveloped)" }
  ],
  "cut": [
    { "quote": "(exact filler phrase, ramble, or redundant moment from transcript)", "why": "(why it hurt the speech)" }
  ],
  "shouldHaveSaid": {
    "opening": "(a sharper version of how they should have opened — 1-2 sentences)",
    "closing": "(a stronger closing line — 1-2 sentences)",
    "tighter": "(the core argument distilled into 1 punchy sentence they should have built around)"
  },
  "frameworkCheck": [
    { "step": "(framework step name)", "hit": true/false, "note": "(1 sentence: what they did well or missed)" }
  ],
  "fillerNote": "(1 sentence about filler word usage — skip if count is 0)",
  "paceNote": "(1 sentence about pace — target is 120-160 WPM for conversational speaking)",
  "nextFocus": "(1 specific drill or technique to work on next time)"
}

RULES:
- sayMore: 1-2 items max. Only include if there's genuine depth to extract.
- cut: 1-3 items max. Be specific — quote the actual dead weight.
- frameworkCheck: one entry per framework step (${topic.hints.length} steps).
- If transcript is very short (<30 words), lower the score significantly and note it.
- Do not invent quotes. If the transcript doesn't have enough to analyze, say so in verdict.`;

  try {
    const result = await callAI(systemPrompt, 0, 0.5);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    const p = JSON.parse(
      jsonMatch?.[0] ??
        `{"score":0,"verdict":"Could not analyze speech.","sayMore":[],"cut":[],"shouldHaveSaid":{"opening":"","closing":"","tighter":""},"frameworkCheck":[],"fillerNote":"","paceNote":"","nextFocus":"Keep practicing."}`
    );
    return {
      score: Math.max(0, Math.min(100, p.score ?? 0)),
      verdict: p.verdict ?? "",
      sayMore: Array.isArray(p.sayMore) ? p.sayMore.slice(0, 3) : [],
      cut: Array.isArray(p.cut) ? p.cut.slice(0, 3) : [],
      shouldHaveSaid: p.shouldHaveSaid ?? { opening: "", closing: "", tighter: "" },
      frameworkCheck: Array.isArray(p.frameworkCheck) ? p.frameworkCheck : [],
      fillerNote: p.fillerNote ?? "",
      paceNote: p.paceNote ?? "",
      nextFocus: p.nextFocus ?? "Keep practicing.",
    };
  } catch {
    return {
      score: 0,
      verdict: "AI analysis unavailable. Your session was still recorded.",
      sayMore: [],
      cut: [],
      shouldHaveSaid: { opening: "", closing: "", tighter: "" },
      frameworkCheck: [],
      fillerNote: "",
      paceNote: "",
      nextFocus: "Try again — you're building the habit.",
    };
  }
}

export async function generateCurveballs(topicText: string): Promise<string[]> {
  const prompt = `Generate 2 short "curveball" twists for an impromptu speech topic. A curveball is a mid-speech pivot that forces the speaker to change angle.

TOPIC: "${topicText}"

Return JSON array of exactly 2 strings. Each curveball must:
- Be 1 short sentence (max 12 words)
- Force a genuine pivot (flip the argument, change the audience, add a constraint)
- Be immediately actionable mid-speech

Example format: ["Now argue the opposite position.", "Convince a skeptic in the room."]

Return ONLY the JSON array.`;

  try {
    const result = await callAI(prompt, 0, 0.9);
    const arrMatch = result.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(arrMatch?.[0] ?? "[]");
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 2);
  } catch { /* fall through */ }
  return ["Now argue the opposite position.", "Convince a skeptic in the room."];
}

// ─── TTS ─────────────────────────────────────────────────────────────────────
/**
 * Speak text via the ai-tts Supabase Edge Function (Deepgram Aura, server-side).
 * Returns an HTMLAudioElement ready to be played.
 * Throws on any failure — callers should catch and fall back to SpeechSynthesis.
 */
export async function speakWithDeepgramTTS(
  text: string,
  voice: string = "aura-orion-en"
): Promise<HTMLAudioElement> {
  const { data: { session } } = await supabase.auth.getSession();
  const jwt = session?.access_token;
  if (!jwt) throw new Error("[TTS] No auth session");
  if (!SUPABASE_URL) throw new Error("[TTS] VITE_SUPABASE_URL not set");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwt}`,
    },
    body: JSON.stringify({ text, voice }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.status.toString());
    throw new Error(`[TTS] Edge function error (${res.status}): ${err.slice(0, 120)}`);
  }

  const { audioBase64, mimeType } = await res.json() as { audioBase64: string; mimeType: string };
  const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
  return audio;
}

// ─── ADAPTIVE PLAN ───────────────────────────────────────────────────────────

const ALL_DIMENSIONS = Object.keys(DIMENSION_LABELS) as Dimension[];

/** Attach track routing + label to a drill, validating the AI's dimension choice. */
function hydrateDrill(raw: any, fallback: Dimension): AdaptiveDrill {
  const dim: Dimension = ALL_DIMENSIONS.includes(raw?.targetDimension) ? raw.targetDimension : fallback;
  const route = DIMENSION_TRACK[dim];
  return {
    title: String(raw?.title ?? "Practice drill").slice(0, 60),
    prompt: String(raw?.prompt ?? "").trim() || "Speak for 60 seconds on a topic of your choice.",
    targetDimension: dim,
    targetLabel: DIMENSION_LABELS[dim],
    track: route.track,
    trackUrl: route.url,
    durationSeconds: Math.min(180, Math.max(30, Number(raw?.durationSeconds) || 60)),
    rationale: String(raw?.rationale ?? "").slice(0, 160),
  };
}

/** Deterministic fallback plan used when the AI call fails or returns garbage. */
function fallbackPlan(profile: SkillProfile): AdaptivePlan {
  const focus = profile.weakest[0] ?? null;
  const focusLabel = focus ? DIMENSION_LABELS[focus] : "Your foundations";
  const targets = profile.weakest.length ? profile.weakest : (["confidence", "structure"] as Dimension[]);
  const drills: AdaptiveDrill[] = targets.slice(0, 2).flatMap((dim) => [
    hydrateDrill(
      { title: `${DIMENSION_LABELS[dim]} warm-up`, prompt: "Introduce yourself and your topic in 60 seconds.", targetDimension: dim, durationSeconds: 60, rationale: `Targets your ${DIMENSION_LABELS[dim].toLowerCase()}.` },
      dim
    ),
    hydrateDrill(
      { title: `${DIMENSION_LABELS[dim]} push`, prompt: "Argue one side of: remote work is better than office work.", targetDimension: dim, durationSeconds: 90, rationale: `Stretches your ${DIMENSION_LABELS[dim].toLowerCase()} under pressure.` },
      dim
    ),
  ]);
  return {
    focusDimension: focus,
    focusLabel,
    headline: focus ? `Build your ${focusLabel.toLowerCase()}` : "Build your foundations",
    rationale: profile.coldStart
      ? "Record a few drills so we can measure your skills — here's a starter set in the meantime."
      : `Your ${focusLabel.toLowerCase()} is your lowest-scoring skill right now. These drills target it directly.`,
    drills,
    generatedAt: new Date().toISOString(),
    basedOnCount: profile.basedOnCount,
  };
}

/**
 * Generate a performance-tailored practice plan from a computed SkillProfile.
 * Targets the user's weakest dimensions; track routing is applied in code
 * (not trusted to the AI). Falls back to a deterministic plan on any failure.
 */
export async function generateAdaptivePlan(profile: SkillProfile): Promise<AdaptivePlan> {
  const focus = profile.weakest[0] ?? null;
  const focusLabel = focus ? DIMENSION_LABELS[focus] : "Your foundations";

  const scoreLines = profile.dimensions
    .filter((d) => d.sampleCount > 0)
    .map((d) => `- ${d.label}: ${d.average}/100 (${d.trend})`)
    .join("\n");

  const weakLabels = profile.weakest.map((d) => DIMENSION_LABELS[d]).join(", ") || "general fundamentals";

  const prompt = `You are an expert speaking coach building a targeted practice plan.

${profile.coldStart
    ? `The student is new — limited measured data. Their self-identified focus areas: ${weakLabels}.`
    : `The student's measured skill profile (0-100 per dimension, recent trend):\n${scoreLines}`}

PRIORITY: improve their weakest skills: ${weakLabels}.

Generate exactly 4 short practice drills that specifically target these weak areas. Each drill must be a concrete speaking prompt the student records an answer to in under 2 minutes.

Return JSON ONLY:
{
  "headline": "punchy headline naming the #1 focus (max 6 words)",
  "rationale": "2 sentences addressed to the student explaining what to work on and why, referencing their scores",
  "drills": [
    {
      "title": "3-5 word title",
      "prompt": "the actual speaking prompt to practice",
      "targetDimension": "one of: content_quality | structure | clarity | pace | delivery | confidence",
      "durationSeconds": 60,
      "rationale": "1 short sentence: why this drill helps"
    }
  ]
}`;

  try {
    const result = await callAI(prompt, 0, 0.7);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackPlan(profile);
    const parsed = JSON.parse(jsonMatch[0]);
    const drills: AdaptiveDrill[] = Array.isArray(parsed.drills)
      ? parsed.drills.slice(0, 5).map((d: any) => hydrateDrill(d, focus ?? "confidence"))
      : [];
    if (drills.length === 0) return fallbackPlan(profile);
    return {
      focusDimension: focus,
      focusLabel,
      headline: String(parsed.headline ?? `Build your ${focusLabel.toLowerCase()}`).slice(0, 60),
      rationale: String(parsed.rationale ?? "").slice(0, 320) || fallbackPlan(profile).rationale,
      drills,
      generatedAt: new Date().toISOString(),
      basedOnCount: profile.basedOnCount,
    };
  } catch (err) {
    console.error("[generateAdaptivePlan] error", err);
    return fallbackPlan(profile);
  }
}
