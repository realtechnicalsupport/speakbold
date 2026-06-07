import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Camera, Loader2, AlertCircle, Lock, ArrowRight, Activity, Eye, Smile, Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBodyLanguage } from "@/hooks/useBodyLanguage";
import { track } from "@/lib/analytics";

/**
 * A compact, LIVE Body-Language hero — the on-device webcam coach, front and
 * centre. Reuses the same `useBodyLanguage` engine as the full studio; this is
 * just a tighter presentation for high-visibility surfaces (landing + the first
 * signed-in screen) so judges/visitors meet the app's strongest, most
 * SDG-4-aligned feature immediately. One tap activates the real camera (browsers
 * require a user gesture for camera access — there is no auto-start). The full
 * record-and-report experience lives at /tracks/body-language.
 */

const METRICS = [
  { key: "posture", label: "Posture", icon: Activity, color: "#f97316" },
  { key: "eyeContact", label: "Eye", icon: Eye, color: "#38bdf8" },
  { key: "expression", label: "Expression", icon: Smile, color: "#a78bfa" },
  { key: "gesture", label: "Gesture", icon: Hand, color: "#34d399" },
] as const;

export function BodyLanguageHero({ className }: { className?: string }) {
  const { videoRef, canvasRef, status, liveMetrics, inFrame, error, activate, deactivate } = useBodyLanguage();
  const isLive = status === "live" || status === "recording";

  // Funnel: the camera is the "earned upgrade" hook. Track the request (tap) and
  // the grant (camera actually goes live) so activation can be measured.
  const requestCamera = () => { track("camera_requested", { surface: "landing_hero" }); activate(); };
  useEffect(() => {
    if (status === "live") track("camera_granted", { surface: "landing_hero" });
  }, [status]);

  return (
    <div className={cn("w-full max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12", className)}>
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Copy */}
        <div className="space-y-5 order-2 lg:order-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Live · On-device AI</span>
          </div>
          <h2 className="speak-serif text-3xl md:text-5xl italic leading-tight">
            Your body speaks <span className="text-primary">before you do.</span>
          </h2>
          <p className="text-sm md:text-base opacity-60 leading-relaxed max-w-md">
            Real-time AI coaching on your posture, eye contact, expression, and gestures —
            running entirely in your browser. Your camera never leaves this device.
          </p>
          <div className="flex items-center gap-2 text-[11px] font-bold opacity-50">
            <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
            Nothing recorded · nothing uploaded · works offline
          </div>
          <Link
            to="/tracks/body-language"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary hover:gap-3 transition-all"
          >
            Open full studio <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Live camera */}
        <div className="order-1 lg:order-2">
          <div className="relative aspect-video rounded-2xl md:rounded-[2rem] overflow-hidden bg-black border border-border/60 shadow-soft">
            <video
              ref={videoRef}
              className={cn("w-full h-full object-cover transition-opacity duration-500", !isLive && "opacity-0")}
              style={{ transform: "scaleX(-1)" }}
              muted playsInline autoPlay
            />
            <canvas
              ref={canvasRef}
              className={cn("absolute inset-0 w-full h-full transition-opacity duration-500", !isLive && "opacity-0")}
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Idle — one tap to go live */}
            {status === "idle" && (
              <button onClick={requestCamera} className="absolute inset-0 flex flex-col items-center justify-center gap-3 group">
                <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
                  <Camera className="h-7 w-7" />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">Start live camera</span>
                <span className="text-[10px] opacity-40 max-w-[220px] text-center leading-relaxed">
                  Activates your webcam — processed only on your device
                </span>
              </button>
            )}

            {/* Loading models */}
            {status === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-9 w-9 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Loading on-device AI…</p>
              </div>
            )}

            {/* Error / denied */}
            {(status === "error" || status === "denied") && (
              <button onClick={requestCamera} className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm font-medium opacity-70 max-w-xs leading-relaxed">{error}</p>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Tap to retry</span>
              </button>
            )}

            {/* Live overlays */}
            {isLive && (
              <>
                <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2">
                  {METRICS.map((m) => (
                    <div key={m.key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
                      <m.icon className="h-3 w-3 shrink-0" style={{ color: m.color }} />
                      <span className="text-[11px] font-black tabular-nums text-white/90">{inFrame ? liveMetrics[m.key] : "—"}</span>
                    </div>
                  ))}
                </div>

                {!inFrame && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-black uppercase tracking-widest text-yellow-300">
                      Step into frame
                    </span>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/60">On-device</span>
                </div>

                <button
                  onClick={deactivate}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white transition-colors"
                >
                  Stop
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
