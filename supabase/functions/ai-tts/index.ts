// supabase/functions/ai-tts/index.ts
// Server-side proxy for Deepgram Aura TTS. API key never reaches the browser.
// Returns { audioBase64: string, mimeType: string } so the client can play it.
// Deploy: supabase functions deploy ai-tts
// Secrets needed: DEEPGRAM_API_KEY

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

// Encode ArrayBuffer → base64 without Buffer (Deno-compatible)
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
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

    // ── Keys ────────────────────────────────────────────────────────────────────
    const DEEPGRAM_KEY = Deno.env.get("DEEPGRAM_API_KEY") ?? "";
    if (!DEEPGRAM_KEY) return json({ error: "TTS not configured — DEEPGRAM_API_KEY missing" }, 503);

    // ── Request ─────────────────────────────────────────────────────────────────
    const { text, voice = "aura-orion-en" } = await req.json();
    if (!text?.trim()) return json({ error: "text is required" }, 400);

    // ── Forward to Deepgram Aura ─────────────────────────────────────────────────
    const res = await fetch(`https://api.deepgram.com/v1/speak?model=${voice}`, {
      method: "POST",
      headers: {
        "Authorization": `Token ${DEEPGRAM_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Deepgram TTS failed (${res.status}): ${err.slice(0, 120)}`);
    }

    const mimeType = res.headers.get("Content-Type") || "audio/mp3";
    const audioBase64 = bufferToBase64(await res.arrayBuffer());

    console.log(`[ai-tts] ✓ ${Math.round(audioBase64.length * 0.75 / 1024)} KB audio, voice=${voice}`);
    return json({ audioBase64, mimeType });

  } catch (e) {
    console.error("[ai-tts] unhandled:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
