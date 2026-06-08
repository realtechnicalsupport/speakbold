import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useRecorder, RecordingState } from "@/hooks/useRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { toast } from "@/hooks/use-toast";
import { Pause, RotateCcw, Mic, MicOff, Check, X, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { setTimerActive } from "@/lib/timerState";
import { setRecordingActive } from "@/lib/recordingState";
import { MicrophoneBorder } from "@/components/MicrophoneBorder";

interface PracticeActivity {
  title: string;
  content: string;
  track: string;
  trackUrl: string;
  duration: number;
  difficulty: string;
}

interface PracticeModalProps {
  activity: PracticeActivity;
  eventId: string;
  onClose: () => void;
  onComplete: () => void;
}

export const PracticeModal = ({ activity, eventId, onClose, onComplete }: PracticeModalProps) => {
  const { user } = useAuth();
  const [duration, setDuration] = useState(activity.duration * 60);
  const [seconds, setSeconds] = useState(activity.duration * 60);
  const [running, setRunning] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [recordEnabled, setRecordEnabled] = useLocalStorageState<boolean>("speakbold:record-attempts", true);
  const [isSaving, setIsSaving] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);
  const recorderStartRef = useRef<() => void>();
  const recorderStopRef = useRef<() => void>();
  
  const { state: recordingState, recording, elapsedMs, start: startRecording, stop: stopRecording, reset: resetRecording } = useRecorder({
    recorderStartRef: (fn) => { recorderStartRef.current = fn; },
    recorderStopRef: (fn) => { recorderStopRef.current = fn; },
  });

  const pct = duration > 0 ? (seconds / duration) * 100 : 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  // Timer logic
  useEffect(() => {
    if (running && !pausedAt && seconds > 0) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            setRunning(false);
            setTimerActive(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimerActive(running || pausedAt !== null);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, pausedAt, seconds]);

  // Recording state
  useEffect(() => {
    const isActuallyRecording = recordEnabled && running && !pausedAt;
    setRecordingActive(isActuallyRecording);
    if (isActuallyRecording && recorderStartRef.current) {
      recorderStartRef.current();
    } else if (!isActuallyRecording && recorderStopRef.current) {
      recorderStopRef.current();
    }
  }, [recordEnabled, running, pausedAt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setTimerActive(false);
      setRecordingActive(false);
    };
  }, []);

  const toggleTimer = () => {
    if (running && !pausedAt) {
      // Pause
      setPausedAt(Date.now());
    } else if (running && pausedAt) {
      // Resume
      setPausedAt(null);
    } else {
      // Start
      if (seconds === 0) setSeconds(duration);
      setRunning(true);
      setPausedAt(null);
      hasStartedRef.current = true;
    }
  };

  const handleReset = () => {
    setSeconds(duration);
    setRunning(false);
    setPausedAt(null);
    resetRecording();
    hasStartedRef.current = false;
  };

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration * 60);
    setSeconds(newDuration * 60);
    setRunning(false);
    setPausedAt(null);
    setTimerActive(false);
    hasStartedRef.current = false;
  };

  const handleSave = async () => {
    if (!recording?.blob || !user) return;
    
    setIsSaving(true);
    
    try {
      // Upload audio file
      const fileName = `practice-${eventId}-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("recordings")
        .upload(fileName, recording.blob);
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({ title: "Error", description: "Failed to upload recording" });
        setIsSaving(false);
        return;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("recordings")
        .getPublicUrl(fileName);
      
      // Save to recordings table
      const { error: insertError } = await supabase
        .from("recordings")
        .insert({
          user_id: user.id,
          event_id: eventId,
          title: activity.title,
          prompt: activity.content,
          audio_url: publicUrl,
          duration_ms: recording.durationMs,
        });
      
      if (insertError) {
        console.error("Insert error:", insertError);
        toast({ title: "Error", description: "Failed to save recording" });
        setIsSaving(false);
        return;
      }
      
      // Award XP
      const { data: xpData } = await supabase
        .from("user_xp")
        .select("total_xp")
        .eq("user_id", user.id)
        .maybeSingle();
      
      const currentXp = xpData?.total_xp || 0;
      const newXp = currentXp + 10;
      
      if (xpData) {
        await supabase
          .from("user_xp")
          .update({ total_xp: newXp })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("user_xp")
          .insert({ user_id: user.id, total_xp: newXp });
      }
      
      // Dispatch XP update event
      window.dispatchEvent(new CustomEvent("xp-updated"));
      
      toast({ 
        title: "Practice Saved!", 
        description: "You earned 10 XP! Great job completing your practice session." 
      });
      
      onComplete();
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: "Error", description: "Failed to save practice session" });
    }
    
    setIsSaving(false);
  };

  const isRecording = recordingState === "recording";
  const hasRecording = recordingState === "stopped" && recording;

  return (
    <>
      <MicrophoneBorder />
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden">
          {/* Header with border progress bar */}
          <div className="relative">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-lg">Practice Session</h2>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Progress border */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50">
              <div
                className={cn(
                  "h-full transition-all duration-1000 ease-linear",
                  pausedAt ? "bg-amber-500" : "bg-warm"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          
          {/* Prompt */}
          <div className="p-4 bg-primary/5 border-b border-border">
            <p className="text-sm text-muted-foreground mb-2">Practice this prompt:</p>
            <p className="font-medium text-lg">{activity.title}</p>
            <p className="text-muted-foreground mt-2">{activity.content}</p>
          </div>
          
          {/* Timer */}
          <div className="p-6 text-center border-b border-border">
            <div className={cn(
              "text-5xl font-mono font-bold mb-4 tabular-nums tracking-wide",
              pausedAt ? "text-amber-500" : "text-foreground"
            )}>
              {mins}:{String(secs).padStart(2, "0")}
            </div>
            
            {/* Duration selector */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Duration:</span>
              <select 
                value={Math.round(duration / 60)} 
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                className="bg-muted rounded-lg px-3 py-1 text-sm"
                disabled={running || isRecording}
              >
                {[1, 2, 3, 4, 5, 10, 15, 20].map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
            
            {/* Timer controls */}
            <div className="flex items-center justify-center gap-3">
              <Button 
                variant="hero"
                size="lg"
                onClick={toggleTimer}
              >
                {!running ? (
                  <>
                    <Play className="h-4 w-4" />
                    {hasStartedRef.current ? "Resume" : "Start"}
                  </>
                ) : pausedAt ? (
                  <>
                    <Play className="h-4 w-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleReset}
                aria-label="Reset timer"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Recording toggle */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium mb-1">Recording</p>
                <p className="text-sm text-muted-foreground">
                  {isRecording 
                    ? "Recording in progress..." 
                    : hasRecording 
                      ? `Recording saved (${Math.round(recording.durationMs / 1000)}s)`
                      : recordEnabled 
                        ? "Recording auto-starts with timer. You'll earn XP when complete."
                        : "Toggle to enable recording and earn XP."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!user ? (
                  <MicOff className="h-5 w-5 text-muted-foreground/50" />
                ) : recordEnabled ? (
                  <Mic className="h-5 w-5 text-primary" />
                ) : (
                  <Mic className="h-5 w-5 text-red-500" />
                )}
                <Switch 
                  checked={recordEnabled} 
                  onCheckedChange={setRecordEnabled} 
                  aria-label="Toggle recording"
                  disabled={!user}
                />
              </div>
            </div>
            
            {/* Playback */}
            {hasRecording && recording && (
              <div className="mt-4 p-3 bg-muted/50 rounded-xl flex items-center gap-3">
                <Mic className="h-4 w-4 text-muted-foreground" />
                <audio src={recording.url} controls className="flex-1 h-8" />
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-4 flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasRecording || isSaving}
              className="flex-1"
            >
              {isSaving ? "Saving..." : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save & Complete (+10 XP)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
