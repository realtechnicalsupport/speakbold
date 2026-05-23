export type Rank = {
  name: string;
  min: number;
  next: number | null;
  tier: number;
  emblem: string;
};

const TIERS: { name: string; min: number; emblem: string }[] = [
  { name: "Whisper", min: 0, emblem: "◦" },
  { name: "Murmur", min: 50, emblem: "◌" },
  { name: "Speaker", min: 150, emblem: "◍" },
  { name: "Orator", min: 350, emblem: "◉" },
  { name: "Headliner", min: 700, emblem: "✦" },
  { name: "Keynote", min: 1200, emblem: "✸" },
  { name: "Luminary", min: 2000, emblem: "✺" },
  { name: "Legend", min: 3500, emblem: "✷" },
];

export const rankFor = (xp: number): Rank => {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) if (xp >= TIERS[i].min) idx = i;
  const t = TIERS[idx];
  const next = TIERS[idx + 1]?.min ?? null;
  return { name: t.name, emblem: t.emblem, min: t.min, next, tier: idx + 1 };
};

export const rankProgress = (xp: number) => {
  const r = rankFor(xp);
  if (r.next == null) return { pct: 100, into: xp - r.min, span: 0 };
  const span = r.next - r.min;
  const into = xp - r.min;
  return { pct: Math.round((into / span) * 100), into, span };
};

export const ALL_RANKS = TIERS;
