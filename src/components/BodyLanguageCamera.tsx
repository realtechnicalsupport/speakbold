import { motion, AnimatePresence } from "framer-motion";
import { Camera, Video, Square, VideoOff, AlertCircle, Activity, Eye, Smile, Hand, Loader2, Sun, Ruler, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBodyLanguage } from "@/hooks/useBodyLanguage";
import { BodyLanguageReport } from "@/components/BodyLanguageReport";

const METRIC_CONFIG = [
  { key: "posture" as const, label: "POSTURE", icon: Activity, color: "#f97316" },
  { key: "eyeContact" as const, label: "EYE CONTACT", icon: Eye, color: "#38bdf8" },
  { key: "expression" as const, label: "EXPRESSION", icon: Smile, color: "#a78bfa" },
  { key: "gesture" as const, label: "GESTURE", icon: Hand, color: "#34d399" },
];

const SETUP_TIPS = [
  { icon: Sun, text: "Face a window or bright light — avoid backlight" },
  { icon: Ruler, text: "Stand 1–2 m from the camera, mid-torso up in frame" },
  { icon: UserCheck, text: "Speak for at least 30 s — click Record when ready" },
];

function TrafficLight({ value }: { value: number }) {
  const color = value >= 70 ? "#22c55e" : value >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div
      className="h-2.5 w-2.5 rounded-full shrink-0 transition-colors duration-500"
      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
    />
  );
}

function MetricRow({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <TrafficLight value={value} />
      <Icon className="h-3.5 w-3.5 opacity-40 shrink-0" style={{ color }} />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 flex-1">{label}</span>
      <span className="speak-serif text-xl font-bold italic tabular-nums">{value}</span>
    </div>
  );
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function BodyLanguageCamera() {
  const {
    videoRef, canvasRef,
    status, liveMetrics, session, nudge, error, elapsedMs, inFrame,
    activate, startRecording, stopRecording, reset, deactivate,
  } = useBodyLanguage();

  const isLive = status === "live" || status === "recording";
  const isRecording = status === "recording";
  const isDone = status === "done" && !!session;

  return (
    <div className="p-6 md:p-12 rounded-2xl md:rounded-[4rem] bg-muted/5 border border-border/60 relative overflow-hidden shadow-soft space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] text-primary">
          <Camera className="h-4 w-4" />
          AI BODY LANGUAGE STUDIO
        </div>
        {isLive && (
          <button
            onClick={deactivate}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] opacity-20 hover:opacity-60 transition-opacity"
          >
            <VideoOff className="h-3.5 w-3.5" />
            DEACTIVATE
          </button>
        )}
      </div>

      {/* Report view */}
      {isDone && session && (
        <div className="relative z-10">
          <BodyLanguageReport session={session} onReset={reset} />
        </div>
      )}

      {/* Camera + metrics layout — always in DOM (video ref must never be null) */}
      <div className={cn("relative z-10 space-y-6", isDone && "hidden")}>

        {/* Setup tips — shown when camera is idle or loading */}
        {(status === "idle" || status === "loading") && (
          <div className="grid sm:grid-cols-3 gap-3">
            {SETUP_TIPS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-border/40">
                <Icon className="h-4 w-4 text-primary opacity-60 mt-0.5 shrink-0" />
                <p className="text-xs font-medium opacity-50 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Camera + live metrics side-by-side on large screens */}
        <div className="grid lg:grid-cols-[1fr_220px] gap-6 items-start">

          {/* Camera frame */}
          <div className="relative aspect-video rounded-2xl md:rounded-[2rem] overflow-hidden bg-black border border-border/40">

            {/* Video + canvas: always mounted, invisible when camera not active */}
            <video
              ref={videoRef}
              className={cn("w-full h-full object-cover transition-opacity duration-500", !isLive && "opacity-0")}
              style={{ transform: "scaleX(-1)" }}
              muted
              playsInline
              autoPlay
            />
            <canvas
              ref={canvasRef}
              className={cn("absolute inset-0 w-full h-full transition-opacity duration-500", !isLive && "opacity-0")}
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Idle overlay */}
            {status === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                <div className="h-20 w-20 rounded-full border-2 border-border/40 flex items-center justify-center">
                  <Camera className="h-9 w-9 opacity-20" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-xs font-black uppercase tracking-[0.4em] opacity-30">CAMERA INACTIVE</p>
                  <p className="text-sm font-medium opacity-20 max-w-xs">
                    All AI runs in your browser — your video never leaves this device.
                  </p>
                </div>
              </div>
            )}

            {/* Loading overlay */}
            {status === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <div className="text-center space-y-1">
                  <p className="text-xs font-black uppercase tracking-[0.4em] text-primary">LOADING AI MODELS</p>
                  <p className="text-sm font-medium opacity-30">Downloading pose &amp; face analysis (~8 MB)…</p>
                  <p className="text-xs font-medium opacity-20">Cached after first load</p>
                </div>
              </div>
            )}

            {/* Error / denied overlay */}
            {(status === "error" || status === "denied") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <div className="text-center space-y-2 max-w-sm">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-destructive">
                    {status === "denied" ? "CAMERA DENIED" : "LOAD ERROR"}
                  </p>
                  <p className="text-sm font-medium opacity-60 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Live overlays */}
            {isLive && (
              <>
                {/* REC + timer */}
                <AnimatePresence>
                  {isRecording && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute top-4 left-4 flex items-center gap-2"
                    >
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-red-500/30">
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">REC</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
                        <span className="speak-serif text-sm font-bold italic tabular-nums text-white/90">
                          {formatTime(elapsedMs)}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Out-of-frame indicator */}
                <AnimatePresence>
                  {!inFrame && !error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-4 right-4"
                    >
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm border border-yellow-400/40">
                        <div className="h-2 w-2 rounded-full bg-yellow-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">MOVE INTO FRAME</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Short-recording warning toast */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key={error}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute top-4 left-1/2 -translate-x-1/2"
                    >
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 backdrop-blur-sm border border-yellow-400/40">
                        <AlertCircle className="h-3.5 w-3.5 text-yellow-300 shrink-0" />
                        <span className="text-[11px] font-bold text-yellow-100 whitespace-nowrap">{error}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Nudge */}
                <AnimatePresence>
                  {nudge && inFrame && (
                    <motion.div
                      key={nudge}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute bottom-4 left-4 right-4"
                    >
                      <div className="mx-auto w-fit px-4 py-2 rounded-full bg-black/70 backdrop-blur-sm border border-yellow-400/30">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-300 text-center">
                          {nudge}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Privacy badge */}
                {!isRecording && !nudge && inFrame && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">ON-DEVICE AI</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Live metrics panel — beside camera on lg+ */}
          {isLive && (
            <div className="p-5 rounded-2xl bg-black/20 border border-border/40 space-y-5 lg:self-start">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">LIVE METRICS</p>
              {!inFrame ? (
                <p className="text-xs font-medium opacity-30 leading-relaxed">Step into frame to see your scores.</p>
              ) : (
                <div className="space-y-4">
                  {METRIC_CONFIG.map((cfg) => (
                    <MetricRow key={cfg.key} {...cfg} value={liveMetrics[cfg.key]} />
                  ))}
                </div>
              )}
              <div className="border-t border-border/30 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">OVERALL</span>
                  <span className="speak-serif text-3xl font-bold italic tabular-nums">{liveMetrics.overall}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    animate={{ width: `${liveMetrics.overall}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {status === "idle" && (
            <button
              onClick={activate}
              className="group flex items-center gap-4 px-10 py-4 rounded-full bg-primary text-white hover:scale-105 transition-all duration-500 shadow-glow"
            >
              <Camera className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black uppercase tracking-[0.3em]">ACTIVATE CAMERA</span>
            </button>
          )}

          {(status === "error" || status === "denied") && (
            <button
              onClick={activate}
              className="flex items-center gap-4 px-10 py-4 rounded-full border border-border/60 hover:border-primary/40 transition-all duration-500 text-xs font-black uppercase tracking-[0.3em]"
            >
              TRY AGAIN
            </button>
          )}

          {isLive && !isRecording && (
            <>
              <button
                onClick={startRecording}
                className="group flex items-center gap-4 px-10 py-4 rounded-full bg-primary text-white hover:scale-105 transition-all duration-500 shadow-glow"
              >
                <Video className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-[0.3em]">START RECORDING</span>
              </button>
              <p className="text-xs font-medium opacity-30 leading-relaxed max-w-xs">
                Get into frame, speak for 30–90 s, then stop for your analysis.
              </p>
            </>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="group flex items-center gap-4 px-10 py-4 rounded-full bg-white text-primary hover:scale-105 transition-all duration-500 shadow-xl"
            >
              <Square className="h-4 w-4 fill-primary group-hover:scale-90 transition-transform" />
              <span className="text-xs font-black uppercase tracking-[0.3em]">STOP &amp; ANALYSE</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
