// ── Custom impromptu prompts ──────────────────────────────────────────────────
// User-authored prompts, saved locally so they build up a personal practice set.
// localStorage only — nothing is uploaded.

export interface CustomPrompt {
  id: string;
  text: string;
  framework: string;
}

const KEY = "speakbold_impromptu_custom_v1";
const MAX = 50;

export function loadCustomPrompts(): CustomPrompt[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function save(list: CustomPrompt[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* storage full — ignore */ }
}

export function addCustomPrompt(text: string, framework: string): CustomPrompt {
  const prompt: CustomPrompt = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: text.trim(),
    framework,
  };
  // De-dupe on identical text — keep the existing one rather than piling up.
  const existing = loadCustomPrompts();
  const dup = existing.find(p => p.text.toLowerCase() === prompt.text.toLowerCase());
  if (dup) return dup;
  save([prompt, ...existing]);
  return prompt;
}

export function removeCustomPrompt(id: string) {
  save(loadCustomPrompts().filter(p => p.id !== id));
}
