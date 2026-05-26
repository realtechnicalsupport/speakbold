// supabase/functions/ai-transcribe/index.ts
// Server-side proxy for audio transcription. API keys never reach the browser.
// Provider chain: Deepgram → Groq Whisper → HuggingFace → Gemini multimodal
// Deploy: supabase functions deploy ai-transcribe
// Secrets needed: DEEPGRAM_API_KEY, GROQ_API_KEY, HUGGINGFACE_API_KEY, GEMINI_API_KEY

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];

// Decode base64 string → Uint8Array (Deno-compatible, no Buffer)
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // ── Auth ────────────────────────────────────────────────────────────────────
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error("Supabase env not configured");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !userData.user) return json({ error: "Invalid token" }, 401);

    // ── Request ─────────────────────────────────────────────────────────────────
    const { audioBase64, mimeType = "audio/webm", attempt = 0 } = await req.json();
    if (!audioBase64) return json({ error: "audioBase64 is required" }, 400);

    const cleanMime = mimeType.split(";")[0] || "audio/webm";
    const bytes = base64ToBytes(audioBase64);

    const DEEPGRAM_KEY = Deno.env.get("DEEPGRAM_API_KEY") ?? "";
    const GROQ_KEY     = Deno.env.get("GROQ_API_KEY")     ?? "";
    const HF_KEY       = Deno.env.get("HUGGINGFACE_API_KEY") ?? "";
    const GEMINI_KEY   = Deno.env.get("GEMINI_API_KEY")   ?? "";

    // ── 1. Deepgram nova-2 ───────────────────────────────────────────────────────
    if (DEEPGRAM_KEY && attempt === 0) {
      try {
        const res = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&language=en", {
          method: "POST",
          headers: { "Authorization": `Token ${DEEPGRAM_KEY}`, "Content-Type": cleanMime },
          body: bytes,
        });
        if (res.ok) {
          const data = await res.json();
          const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
          console.log(`[ai-transcribe] ✓ Deepgram (${transcript.length} chars)`);
          return json({ transcript });
        }
        console.warn(`[ai-transcribe] Deepgram → ${res.status}`);
      } catch (e) { console.error("[ai-transcribe] Deepgram error:", e); }
    }

    // ── 2. Groq Whisper ──────────────────────────────────────────────────────────
    if (GROQ_KEY && attempt <= 1) {
      try {
        const form = new FormData();
        form.append("file", new File([bytes], "recording.webm", { type: cleanMime }));
        form.append("model", "whisper-large-v3-turbo");
        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${GROQ_KEY}` },
          body: form,
        });
        if (res.ok) {
          const data = await res.json();
          console.log("[ai-transcribe] ✓ Groq Whisper");
          return json({ transcript: data.text ?? "" });
        }
        console.warn(`[ai-transcribe] Groq Whisper → ${res.status}`);
      } catch (e) { console.error("[ai-transcribe] Groq Whisper error:", e); }
    }

    // ── 3. HuggingFace Whisper ───────────────────────────────────────────────────
    if (HF_KEY && attempt <= 2) {
      try {
        const res = await fetch(
          "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
          {
            method: "POST",
            headers: { "Authorization": `Bearer ${HF_KEY}`, "Content-Type": cleanMime },
            body: bytes,
          },
        );
        if (res.ok) {
          const data = await res.json();
          console.log("[ai-transcribe] ✓ HuggingFace Whisper");
          return json({ transcript: data.text ?? "" });
        }
        if (res.status === 503) {
          // Model cold-starting — wait once then fall through to Gemini
          await sleep(3000);
        }
        console.warn(`[ai-transcribe] HuggingFace → ${res.status}`);
      } catch (e) { console.error("[ai-transcribe] HuggingFace error:", e); }
    }

    // ── 4. Gemini multimodal ─────────────────────────────────────────────────────
    if (GEMINI_KEY) {
      const model = GEMINI_MODELS[attempt % GEMINI_MODELS.length];
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: "Transcribe the audio exactly. Output only the transcript, nothing else." },
                  { inline_data: { mime_type: cleanMime, data: audioBase64 } },
                ],
              }],
            }),
          },
        );
        if (res.ok) {
          const data = await res.json();
          const transcript = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          console.log("[ai-transcribe] ✓ Gemini multimodal");
          return json({ transcript });
        }
        console.warn(`[ai-transcribe] Gemini → ${res.status}`);
      } catch (e) { console.error("[ai-transcribe] Gemini error:", e); }
    }

    throw new Error("All transcription providers failed");

  } catch (e) {
    console.error("[ai-transcribe] unhandled:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
