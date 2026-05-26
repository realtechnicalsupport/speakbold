// supabase/functions/ai-text/index.ts
// Server-side proxy for AI text generation. API keys never reach the browser.
// Provider chain: OpenRouter → Cerebras → Gemini → Groq
// Deploy: supabase functions deploy ai-text
// Secrets needed (supabase secrets set KEY=value):
//   OPENROUTER_API_KEY, CEREBRAS_API_KEY, GEMINI_API_KEY, GROQ_API_KEY

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

// ── Model lists (mirrors geminiService.ts) ────────────────────────────────────
const OR_MODELS = [
  "openrouter/free",
  "meta-llama/llama-4-scout:free",
  "meta-llama/llama-4-maverick:free",
  "qwen/qwen3-8b:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];
const CER_MODELS = ["llama-3.3-70b", "llama3.1-8b"];
const GEM_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash-preview-04-17"];
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

const OR_END  = OR_MODELS.length;                // 6
const CER_END = OR_END  + CER_MODELS.length;     // 8
const GEM_END = CER_END + GEM_MODELS.length;     // 11

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

interface Keys { OR: string; CER: string; GEM: string; GROQ: string }

// Recursive fallback chain — geminiDead is request-scoped, not module-level.
async function callAI(
  prompt: string,
  attempt: number,
  temp: number,
  geminiDead: boolean,
  keys: Keys,
): Promise<string> {
  const safeTemp = Math.min(temp, 1.0);

  // ── 1. OpenRouter ────────────────────────────────────────────────────────────
  if (attempt < OR_END && keys.OR) {
    const model = OR_MODELS[attempt];
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${keys.OR}`,
          "HTTP-Referer": "https://speakbold.app",
          "X-Title": "SpeakBold",
        },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: safeTemp }),
      });
      const raw = await res.text();
      if (res.ok) {
        try {
          const text = (JSON.parse(raw).choices?.[0]?.message?.content || "").trim();
          if (text) { console.log(`[ai-text] ✓ OpenRouter ${model}`); return text; }
        } catch { /* non-JSON */ }
      } else console.warn(`[ai-text] OpenRouter ${model} → ${res.status}`);
    } catch (e) { console.error(`[ai-text] OpenRouter ${model} network error:`, e); }
    return callAI(prompt, attempt + 1, temp, geminiDead, keys);
  }

  // ── 2. Cerebras ──────────────────────────────────────────────────────────────
  if (attempt < CER_END && keys.CER) {
    const model = CER_MODELS[attempt - OR_END];
    try {
      const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${keys.CER}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: safeTemp }),
      });
      const raw = await res.text();
      if (res.ok) {
        try {
          const text = (JSON.parse(raw).choices?.[0]?.message?.content || "").trim();
          if (text) { console.log(`[ai-text] ✓ Cerebras ${model}`); return text; }
        } catch { /* non-JSON */ }
      } else console.warn(`[ai-text] Cerebras ${model} → ${res.status}`);
    } catch (e) { console.error(`[ai-text] Cerebras ${model} network error:`, e); }
    return callAI(prompt, attempt + 1, temp, geminiDead, keys);
  }

  // ── 3. Gemini ─────────────────────────────────────────────────────────────────
  if (attempt < GEM_END && keys.GEM) {
    if (geminiDead) {
      console.warn("[ai-text] Gemini skipped (DNS dead) → Groq");
      return callAI(prompt, GEM_END, temp, geminiDead, keys);
    }
    const model = GEM_MODELS[attempt - CER_END];
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.GEM}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: safeTemp },
          }),
        },
      );
      const raw = await res.text();
      if (res.ok) {
        try {
          const text = (JSON.parse(raw).candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
          if (text) { console.log(`[ai-text] ✓ Gemini ${model}`); return text; }
        } catch { /* non-JSON */ }
      } else console.warn(`[ai-text] Gemini ${model} → ${res.status}`);
    } catch (e) {
      console.warn("[ai-text] Gemini DNS error — skipping remaining Gemini slots:", e);
      return callAI(prompt, GEM_END, temp, true, keys);
    }
    return callAI(prompt, attempt + 1, temp, geminiDead, keys);
  }

  // ── 4. Groq (last resort) ─────────────────────────────────────────────────────
  if (keys.GROQ) {
    const idx = Math.max(0, attempt - GEM_END) % GROQ_MODELS.length;
    const model = GROQ_MODELS[idx];
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${keys.GROQ}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: safeTemp }),
      });
      const raw = await res.text();
      if (res.ok) {
        try {
          const text = (JSON.parse(raw).choices?.[0]?.message?.content || "").trim();
          if (text) { console.log(`[ai-text] ✓ Groq ${model}`); return text; }
        } catch { /* non-JSON */ }
      } else {
        console.warn(`[ai-text] Groq ${model} → ${res.status}`);
        if (res.status === 429 && idx < GROQ_MODELS.length - 1) {
          await sleep(1000);
          return callAI(prompt, attempt + 1, temp, geminiDead, keys);
        }
      }
    } catch (e) { console.error("[ai-text] Groq network error:", e); }
  }

  throw new Error("All AI providers exhausted");
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
    const { prompt, attempt = 0, temperature = 0.7 } = await req.json();
    if (!prompt?.trim()) return json({ error: "prompt is required" }, 400);

    // ── Keys ────────────────────────────────────────────────────────────────────
    const keys: Keys = {
      OR:   Deno.env.get("OPENROUTER_API_KEY")   ?? "",
      CER:  Deno.env.get("CEREBRAS_API_KEY")     ?? "",
      GEM:  Deno.env.get("GEMINI_API_KEY")       ?? "",
      GROQ: Deno.env.get("GROQ_API_KEY")         ?? "",
    };

    const text = await callAI(prompt, attempt, temperature, false, keys);
    return json({ text });

  } catch (e) {
    console.error("[ai-text] unhandled:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
