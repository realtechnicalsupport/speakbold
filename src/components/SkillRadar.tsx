import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface RadarDim {
  label: string;
  average: number;     // 0-100
  sampleCount: number; // 0 = not yet measured
  isFocus: boolean;
}

// Hexagonal skill radar — the signature visual of the Coach. Spokes with no
// measured data (sampleCount 0, e.g. Body Language until a camera drill is done)
// render faint so the chart reads honestly instead of implying a real 0.
export const SkillRadar = ({ dims, size = 280 }: { dims: RadarDim[]; size?: number }) => {
  const n = dims.length;
  const c = size / 2;
  const R = size * 0.34;
  const labelR = R + size * 0.085;
  const levels = [0.25, 0.5, 0.75, 1];

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, r: number) => [c + r * Math.cos(angle(i)), c + r * Math.sin(angle(i))] as const;
  const polygon = (r: (i: number) => number) =>
    dims.map((_, i) => pt(i, r(i)).join(",")).join(" ");

  const dataPoly = polygon((i) => R * (Math.max(0, Math.min(100, dims[i].average)) / 100));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[320px] mx-auto overflow-visible">
      {/* Grid rings */}
      {levels.map((lvl, li) => (
        <polygon
          key={li}
          points={polygon(() => R * lvl)}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth={1}
          opacity={0.4}
        />
      ))}

      {/* Axes */}
      {dims.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="currentColor" className="text-border" strokeWidth={1} opacity={0.4} />;
      })}

      {/* Data polygon */}
      <motion.polygon
        points={dataPoly}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "center" }}
        fill="hsl(var(--primary))"
        fillOpacity={0.18}
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Vertex dots */}
      {dims.map((d, i) => {
        const [x, y] = pt(i, R * (Math.max(0, Math.min(100, d.average)) / 100));
        const measured = d.sampleCount > 0;
        return (
          <circle
            key={i}
            cx={x} cy={y} r={d.isFocus ? 4 : 3}
            fill={measured ? "hsl(var(--primary))" : "transparent"}
            stroke="hsl(var(--primary))"
            strokeWidth={measured ? 0 : 1.5}
            opacity={measured ? 1 : 0.35}
          />
        );
      })}

      {/* Labels */}
      {dims.map((d, i) => {
        const [x, y] = pt(i, labelR);
        const anchor = Math.abs(x - c) < 4 ? "middle" : x > c ? "start" : "end";
        const measured = d.sampleCount > 0;
        return (
          <g key={i} opacity={measured ? 1 : 0.4}>
            <text
              x={x} y={y - 2}
              textAnchor={anchor}
              dominantBaseline="middle"
              className={cn("text-[8px] font-black uppercase", d.isFocus ? "fill-primary" : "fill-foreground")}
              style={{ letterSpacing: "0.08em" }}
            >
              {d.label}
            </text>
            <text
              x={x} y={y + 8}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="text-[9px] font-bold fill-foreground"
              opacity={0.5}
            >
              {measured ? d.average : "—"}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
