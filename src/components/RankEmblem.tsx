import { type Rank, type RankName } from "@/context/ArenaContext";
import { cn } from "@/lib/utils";

export interface RankEmblemProps {
  rank: Rank;
  /** xs=20px  sm=28px  md=40px  lg=56px  xl=80px */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Render "{RankName} {tier}" text beside the badge. */
  showLabel?: boolean;
  className?: string;
}

// ── Per-rank visual config ────────────────────────────────────────────────────

const RANK_CFG: Record<
  RankName,
  {
    gradient: string;    // Tailwind bg-gradient classes
    glow: string;        // full box-shadow (outer glow + 3-D inset)
    letter: string;      // glyph shown inside the badge
    letterColor: string; // Tailwind text color for the letter
    labelColor: string;  // Tailwind text color for the optional label
  }
> = {
  Bronze: {
    gradient: "from-amber-900 via-amber-700 to-amber-500",
    glow:
      "0 0 10px rgba(180,83,9,0.65), inset 0 1px 2px rgba(251,191,36,0.3), inset 0 -2px 4px rgba(0,0,0,0.5)",
    letter: "B",
    letterColor: "text-amber-100",
    labelColor: "text-amber-600 dark:text-amber-500",
  },
  Silver: {
    gradient: "from-slate-600 via-slate-400 to-slate-200",
    glow:
      "0 0 10px rgba(148,163,184,0.55), inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.35)",
    letter: "S",
    letterColor: "text-slate-800",
    labelColor: "text-slate-500 dark:text-slate-300",
  },
  Gold: {
    gradient: "from-amber-700 via-yellow-400 to-amber-200",
    glow:
      "0 0 14px rgba(245,158,11,0.75), inset 0 1px 3px rgba(255,240,180,0.6), inset 0 -2px 5px rgba(0,0,0,0.3)",
    letter: "G",
    letterColor: "text-amber-950",
    labelColor: "text-amber-500 dark:text-yellow-400",
  },
  Platinum: {
    gradient: "from-teal-800 via-teal-400 to-cyan-300",
    glow:
      "0 0 14px rgba(45,212,191,0.65), inset 0 1px 3px rgba(255,255,255,0.4), inset 0 -2px 5px rgba(0,0,0,0.3)",
    letter: "P",
    letterColor: "text-teal-950",
    labelColor: "text-teal-500 dark:text-teal-300",
  },
  Diamond: {
    gradient: "from-cyan-700 via-blue-400 to-cyan-200",
    glow:
      "0 0 18px rgba(34,211,238,0.85), inset 0 1px 3px rgba(255,255,255,0.7), inset 0 -2px 6px rgba(0,0,0,0.2)",
    letter: "◆",
    letterColor: "text-sky-950",
    labelColor: "text-cyan-500 dark:text-cyan-400",
  },
};

// ── Size scale ────────────────────────────────────────────────────────────────

const SIZE_CFG: Record<
  NonNullable<RankEmblemProps["size"]>,
  { outer: string; font: string; label: string }
> = {
  xs: { outer: "h-5 w-5",   font: "text-[9px] font-black",   label: "text-[10px]" },
  sm: { outer: "h-7 w-7",   font: "text-[11px] font-black",  label: "text-xs"     },
  md: { outer: "h-10 w-10", font: "text-sm font-black",      label: "text-sm"     },
  lg: { outer: "h-14 w-14", font: "text-xl font-black",      label: "text-base"   },
  xl: { outer: "h-20 w-20", font: "text-3xl font-black",     label: "text-lg"     },
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * A circular rank badge with a rank-coloured gradient fill, an inset 3-D
 * shadow for depth, and a coloured outer glow.
 *
 * Replaces the old `getRankEmblem()` emoji string everywhere rank is shown.
 *
 * @example
 * <RankEmblem rank={getRankFromElo(profile.elo)} size="md" showLabel />
 */
export function RankEmblem({
  rank,
  size = "md",
  showLabel = false,
  className,
}: RankEmblemProps) {
  const cfg = RANK_CFG[rank.name];
  const sz  = SIZE_CFG[size];

  return (
    <div className={cn("inline-flex items-center gap-2 shrink-0", className)}>
      {/* Badge circle */}
      <div
        className={cn(
          "rounded-full bg-gradient-to-br flex items-center justify-center select-none shrink-0",
          cfg.gradient,
          sz.outer,
        )}
        style={{ boxShadow: cfg.glow }}
        aria-label={`${rank.name} ${rank.tier}`}
        role="img"
      >
        <span className={cn("leading-none", sz.font, cfg.letterColor)}>
          {cfg.letter}
        </span>
      </div>

      {/* Optional label: "Gold II" */}
      {showLabel && (
        <span className={cn("font-bold", sz.label, cfg.labelColor)}>
          {rank.name}{" "}
          <span className="opacity-60 font-semibold">{rank.tier}</span>
        </span>
      )}
    </div>
  );
}
