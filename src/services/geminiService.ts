const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

const GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-2.0-flash"];
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

async function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

// --- MULTI-PROVIDER AI CALLER ---
async function callAI(prompt: string, attempt: number = 0): Promise<string> {
  // Try Gemini first (attempt 0-2)
  if (attempt < 3 && GEMINI_API_KEY) {
    const model = GEMINI_MODELS[attempt % GEMINI_MODELS.length];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
      if (res.status === 429) {
        console.warn(`Gemini Limit reached. Trying fallback...`);
        return callAI(prompt, 3); // Skip to Groq
      }
    } catch (e) { console.error("Gemini Error:", e); }
  }

  // Fallback to Groq (attempt 3+)
  if (GROQ_API_KEY) {
    const model = GROQ_MODELS[(attempt - 3) % GROQ_MODELS.length];
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
          temperature: 0.7
        })
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      }
      if (res.status === 429 && attempt < 5) {
        await sleep(1000);
        return callAI(prompt, attempt + 1);
      }
    } catch (e) { console.error("Groq Error:", e); }
  }

  throw new Error("All AI providers (Gemini & Groq) are currently at capacity. Please try again in a few minutes.");
}

// --- MULTI-PROVIDER TRANSCRIPTION ---
export async function transcribeAudio(blob: Blob, attempt: number = 0): Promise<string> {
  console.log(`[Transcription] Attempt ${attempt}, Blob size: ${blob.size}, Type: ${blob.type}`);
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
    } catch (e) { console.error("Groq Whisper failed, trying Gemini..."); }
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
              { text: "Transcribe exactly." },
              { inlineData: { mimeType: blob.type || "audio/webm", data: base64Data } }
            ]
          }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } catch (e) { console.error("Gemini Transcription failed."); }
  }

  if (attempt < 2) return transcribeAudio(blob, attempt + 1);
  throw new Error("Transcription failed on all providers.");
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
  const prompt = `Generate ${count} impromptu topics for ${category}. Return JSON array with topic, category, framework, frameworkSteps, example.`;
  const response = await callAI(prompt);
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : "[]").map((t: any, i: number) => ({ ...t, id: `imp-${Date.now()}-${i}` }));
}

export async function generateArenaPrompt(gamemode: string): Promise<string> {
  const systemPrompt = `Generate a single, compelling, and challenging prompt for a public speaking battle.
  Gamemode: ${gamemode}
  - If blitz: A simple but thought-provoking topic.
  - If debate: A controversial "This House believes..." or "Should X be banned?" style motion.
  - If pitch: A creative startup or product idea that needs to be sold.
  - If standard: A meaningful thematic prompt (e.g., 'The importance of failure').

  Return ONLY the prompt text. No quotes, no preamble.`;
  
  return callAI(systemPrompt);
}

export async function generateAIArgument(prompt: string, durationSeconds: number, gamemode: string, persona?: any): Promise<string> {
  const wordCount = Math.floor(durationSeconds * 2.2); // ~2.2 words/sec speaking pace

  let gamemodeInstructions = "Deliver a compelling, standalone speech";
  if (gamemode === "debate") gamemodeInstructions = "Write a strong, argumentative opening statement for a debate";
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
    2. DO NOT TIE if one speaker provided effort and the other did not.
    3. Be honest and merit-based. A poor performance MUST result in a loss.
    
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
  
  return { 
    score: p.score || 0, 
    oppScore: p.oppScore || 0,
    feedback: p.feedback || "No significant content provided to evaluate.", 
    oppFeedback: p.oppFeedback || p.feedback || "No significant content provided to evaluate.",
    strengths: p.strengths || "N/A",
    oppStrengths: p.oppStrengths || "N/A",
    winner: p.winner || "tie",
    exampleSpeech: p.exampleSpeech || ""
  };
}
