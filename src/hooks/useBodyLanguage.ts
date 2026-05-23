import { useCallback, useEffect, useRef, useState } from "react";

export interface BodyMetrics {
  posture: number;
  eyeContact: number;
  expression: number;
  gesture: number;
  overall: number;
}

export interface BodyLanguageSession {
  durationMs: number;
  averageMetrics: BodyMetrics;
}

export type BodyStatus = "idle" | "loading" | "live" | "recording" | "done" | "error" | "denied";

const DEFAULT_METRICS: BodyMetrics = { posture: 50, eyeContact: 50, expression: 50, gesture: 50, overall: 50 };

// WASM served locally from public/mediapipe-wasm (copied from node_modules at install time)
const WASM_CDN = "/mediapipe-wasm";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

const ROLLING = 20;

function rollingAvg(buf: number[]): number {
  return buf.length === 0 ? 50 : Math.round(buf.reduce((a, b) => a + b, 0) / buf.length);
}

function pushRolling(buf: number[], val: number) {
  buf.push(val);
  if (buf.length > ROLLING) buf.shift();
}

function computePosture(landmarks: any[]): number {
  if (!landmarks || landmarks.length < 25) return 50;
  const ls = landmarks[11], rs = landmarks[12];
  const lh = landmarks[23], rh = landmarks[24];
  const nose = landmarks[0];
  const shoulderTilt = Math.abs(ls.y - rs.y);
  const shoulderMidX = (ls.x + rs.x) / 2;
  const hipMidX = (lh.x + rh.x) / 2;
  const tiltPenalty = Math.min(shoulderTilt * 400, 30);
  const leanPenalty = Math.min(Math.abs(shoulderMidX - hipMidX) * 200, 25);
  const headPenalty = Math.min(Math.abs(nose.x - shoulderMidX) * 150, 20);
  return Math.round(Math.max(0, 100 - tiltPenalty - leanPenalty - headPenalty));
}

function computeEyeContact(blendshapes: any[]): number {
  if (!blendshapes?.[0]?.categories) return 50;
  const shapes = blendshapes[0].categories;
  const g = (name: string) => shapes.find((s: any) => s.categoryName === name)?.score ?? 0;
  const deviation = (g("eyeLookOutLeft") + g("eyeLookOutRight") + g("eyeLookUpLeft") + g("eyeLookDownLeft")) / 4;
  return Math.round(Math.max(0, Math.min(100, 100 - deviation * 250)));
}

function computeExpression(blendshapes: any[]): number {
  if (!blendshapes?.[0]?.categories) return 50;
  const shapes = blendshapes[0].categories;
  const g = (name: string) => shapes.find((s: any) => s.categoryName === name)?.score ?? 0;
  const smile = (g("mouthSmileLeft") + g("mouthSmileRight")) / 2;
  const brow = (g("browInnerUp") + g("browOuterUpLeft")) / 2;
  return Math.round(Math.min(100, 20 + (smile * 0.65 + brow * 0.35) * 150));
}

function computeGesture(curr: any[], prev: any[] | null): number {
  if (!curr || curr.length < 17 || !prev || prev.length < 17) return 50;
  const vel = (a: any, b: any) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  const avgVel = (vel(curr[15], prev[15]) + vel(curr[16], prev[16])) / 2;
  const avgExt = (vel(curr[15], curr[11]) + vel(curr[16], curr[12])) / 2;
  return Math.round(Math.min(100, Math.max(20, avgVel * 2500 + avgExt * 120 + 20)));
}

function getNudge(m: BodyMetrics): string {
  if (m.posture < 55) return "Straighten up — shoulders back, chin level";
  if (m.eyeContact < 55) return "Look at the lens — eye contact commands attention";
  if (m.expression < 45) return "Bring energy — let your face match your words";
  if (m.gesture < 40) return "Unfreeze your hands — gestures build authority";
  return "";
}

const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
];

function drawSkeleton(ctx: CanvasRenderingContext2D, landmarks: any[], w: number, h: number, score: number) {
  if (!landmarks || landmarks.length < 29) return;
  const color = score > 70 ? "#22c55e" : score > 45 ? "#f59e0b" : "#ef4444";
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.75;
  POSE_CONNECTIONS.forEach(([a, b]) => {
    const p1 = landmarks[a], p2 = landmarks[b];
    if (!p1 || !p2) return;
    ctx.beginPath();
    ctx.moveTo(p1.x * w, p1.y * h);
    ctx.lineTo(p2.x * w, p2.y * h);
    ctx.stroke();
  });
  ctx.fillStyle = color;
  ctx.globalAlpha = 1;
  landmarks.slice(0, 29).forEach((lm: any) => {
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function useBodyLanguage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<BodyStatus>("idle");
  const [liveMetrics, setLiveMetrics] = useState<BodyMetrics>(DEFAULT_METRICS);
  const [session, setSession] = useState<BodyLanguageSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nudge, setNudge] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const poseLMRef = useRef<any>(null);
  const faceLMRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const metricsRef = useRef<BodyMetrics>(DEFAULT_METRICS);
  const prevPoseRef = useRef<any[] | null>(null);

  const postBuf = useRef<number[]>([]);
  const eyeBuf = useRef<number[]>([]);
  const exprBuf = useRef<number[]>([]);
  const gestBuf = useRef<number[]>([]);

  const isRecRef = useRef(false);
  const recStartRef = useRef(0);
  const recBufferRef = useRef<BodyMetrics[]>([]);

  // Store rAF callback in a ref so it always reads latest refs without stale closure issues
  const frameCallbackRef = useRef<(t: number) => void>();
  frameCallbackRef.current = (timestamp: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const pose = poseLMRef.current;
    const face = faceLMRef.current;

    if (!video || !canvas || !pose || !face || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(frameCallbackRef.current!);
      return;
    }

    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const poseR = pose.detectForVideo(video, timestamp);
      const faceR = face.detectForVideo(video, timestamp);
      const pLM: any[] = poseR.landmarks?.[0] ?? [];
      const blends: any[] = faceR.faceBlendshapes ?? [];

      const posture = computePosture(pLM);
      const eyeContact = computeEyeContact(blends);
      const expression = computeExpression(blends);
      const gesture = computeGesture(pLM, prevPoseRef.current);
      if (pLM.length > 0) prevPoseRef.current = pLM;

      pushRolling(postBuf.current, posture);
      pushRolling(eyeBuf.current, eyeContact);
      pushRolling(exprBuf.current, expression);
      pushRolling(gestBuf.current, gesture);

      const sm: BodyMetrics = {
        posture: rollingAvg(postBuf.current),
        eyeContact: rollingAvg(eyeBuf.current),
        expression: rollingAvg(exprBuf.current),
        gesture: rollingAvg(gestBuf.current),
        overall: 0,
      };
      sm.overall = Math.round(sm.posture * 0.3 + sm.eyeContact * 0.35 + sm.expression * 0.2 + sm.gesture * 0.15);
      metricsRef.current = sm;

      drawSkeleton(ctx, pLM, canvas.width, canvas.height, sm.posture);

      if (isRecRef.current) {
        recBufferRef.current.push({ ...sm });
      }
    } catch (_) {
      // Skip frame on inference error
    }

    rafRef.current = requestAnimationFrame(frameCallbackRef.current!);
  };

  // Re-sync srcObject whenever status returns to live (e.g. after viewing report and resetting)
  useEffect(() => {
    if ((status === "live" || status === "recording") && videoRef.current && streamRef.current) {
      if (!videoRef.current.srcObject) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [status]);

  // Throttle React state to 5fps — inference runs at native rAF speed
  useEffect(() => {
    const id = setInterval(() => {
      setLiveMetrics({ ...metricsRef.current });
      setNudge(getNudge(metricsRef.current));
    }, 200);
    return () => clearInterval(id);
  }, []);

  // Recording timer
  useEffect(() => {
    if (status !== "recording") {
      setElapsedMs(0);
      return;
    }
    const id = setInterval(() => {
      setElapsedMs(Date.now() - recStartRef.current);
    }, 100);
    return () => clearInterval(id);
  }, [status]);

  const activate = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      // Attach stream to video element — it's always in the DOM so ref is valid
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await new Promise<void>((res) => {
          video.onloadedmetadata = () => res();
        });
        await video.play();
      }

      const { PoseLandmarker, FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

      const [pLM, fLM] = await Promise.all([
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate: "CPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        }),
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: FACE_MODEL, delegate: "CPU" },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        }),
      ]);

      poseLMRef.current = pLM;
      faceLMRef.current = fLM;
      rafRef.current = requestAnimationFrame(frameCallbackRef.current!);
      setStatus("live");
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Unknown error");
      if (err.name === "NotAllowedError") {
        setStatus("denied");
        setError("Camera access denied. Enable it in your browser settings and try again.");
      } else {
        setStatus("error");
        const msg = err.message?.slice(0, 120) || "Unknown error";
        setError(`Failed to load AI models: ${msg}`);
        console.error("[useBodyLanguage] activate error:", err);
      }
    }
  }, []);

  const startRecording = useCallback(() => {
    recBufferRef.current = [];
    isRecRef.current = true;
    recStartRef.current = Date.now();
    setStatus("recording");
  }, []);

  const stopRecording = useCallback(() => {
    const durationMs = Date.now() - recStartRef.current;
    const buf = recBufferRef.current;

    // Guard against meaningless ultra-short sessions
    if (durationMs < 5000 || buf.length < 10) {
      isRecRef.current = false;
      setError("Record for at least 5 seconds — we need a real sample to analyse.");
      setStatus("live");
      // Auto-clear the warning after a few seconds
      setTimeout(() => setError(null), 4000);
      return;
    }

    isRecRef.current = false;
    const avg = (k: keyof BodyMetrics) =>
      Math.round(buf.reduce((s, m) => s + m[k], 0) / buf.length);
    setSession({
      durationMs,
      averageMetrics: {
        posture: avg("posture"),
        eyeContact: avg("eyeContact"),
        expression: avg("expression"),
        gesture: avg("gesture"),
        overall: avg("overall"),
      },
    });
    setStatus("done");
  }, []);

  const reset = useCallback(() => {
    setSession(null);
    recBufferRef.current = [];
    setStatus("live");
  }, []);

  const deactivate = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    poseLMRef.current?.close?.();
    faceLMRef.current?.close?.();
    poseLMRef.current = null;
    faceLMRef.current = null;
    setStatus("idle");
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    []
  );

  return {
    videoRef,
    canvasRef,
    status,
    liveMetrics,
    session,
    nudge,
    error,
    elapsedMs,
    activate,
    startRecording,
    stopRecording,
    reset,
    deactivate,
  };
}
