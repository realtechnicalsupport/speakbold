import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, X, Brain, Target, Clock as ClockIcon, Zap, ChevronRight } from "lucide-react";

interface AIPlanGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (answers: PlanAnswers) => void;
  daysUntilEvent: number;
  eventType: string;
}

export interface PlanAnswers {
  skillLevel: string;
  focusAreas: string[];
  timePerDay: number;
  goals: string;
  customDescription?: string;
  useCustomAI: boolean;
}

const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner", desc: "I'm new to public speaking" },
  { value: "intermediate", label: "Intermediate", desc: "I have some experience" },
  { value: "advanced", label: "Advanced", desc: "I'm quite confident already" },
];

const FOCUS_AREAS = [
  { value: "confidence", label: "Confidence", icon: "💪" },
  { value: "structure", label: "Clear Structure", icon: "📋" },
  { value: "voice", label: "Voice & Tone", icon: "🎵" },
  { value: "body", label: "Body Language", icon: "🤸" },
  { value: "stories", label: "Storytelling", icon: "📖" },
  { value: "answers", label: "Answering Questions", icon: "❓" },
  { value: "timing", label: "Pacing & Timing", icon: "⏱️" },
  { value: "flow", label: "Natural Flow", icon: "🌊" },
];

export function AIPlanGenerator({ isOpen, onClose, onGenerate, daysUntilEvent, eventType }: AIPlanGeneratorProps) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<PlanAnswers>({
    skillLevel: "",
    focusAreas: [],
    timePerDay: 5,
    goals: "",
    customDescription: "",
    useCustomAI: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleSkillSelect = (level: string) => {
    setAnswers({ ...answers, skillLevel: level });
  };

  const toggleFocusArea = (area: string) => {
    const newAreas = answers.focusAreas.includes(area)
      ? answers.focusAreas.filter(a => a !== area)
      : [...answers.focusAreas, area];
    setAnswers({ ...answers, focusAreas: newAreas });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setTimeout(() => {
      onGenerate(answers);
      setIsGenerating(false);
      onClose();
    }, 2000);
  };

  const eventTypeLabel = {
    interview: "interview",
    presentation: "presentation", 
    conference: "conference",
    wedding: "wedding",
    other: "event"
  }[eventType] || "event";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">AI Plan Generator</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 py-3 bg-muted/30 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {step === 1 && (
            <>
              <div className="text-center">
                <Brain className="h-12 w-12 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold text-lg">Your Experience Level</h3>
                <p className="text-sm text-muted-foreground mt-1">This helps us tailor the difficulty</p>
              </div>
              <div className="space-y-2">
                {SKILL_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => handleSkillSelect(level.value)}
                    className={cn(
                      "w-full p-4 rounded-xl border text-left transition-all",
                      answers.skillLevel === level.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="font-medium">{level.label}</div>
                    <div className="text-sm text-muted-foreground">{level.desc}</div>
                  </button>
                ))}
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!answers.skillLevel}
                className="w-full"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center">
                <Target className="h-12 w-12 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold text-lg">What Do You Want to Improve?</h3>
                <p className="text-sm text-muted-foreground mt-1">Select up to 3 areas</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FOCUS_AREAS.map((area) => (
                  <button
                    key={area.value}
                    onClick={() => toggleFocusArea(area.value)}
                    disabled={!answers.focusAreas.includes(area.value) && answers.focusAreas.length >= 3}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all text-sm",
                      answers.focusAreas.includes(area.value)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <span className="mr-1.5">{area.icon}</span>
                    {area.label}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => setStep(3)}
                disabled={answers.focusAreas.length === 0}
                className="w-full"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="text-center">
                <Zap className="h-12 w-12 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold text-lg">Your Goals</h3>
                <p className="text-sm text-muted-foreground mt-1">How much time per day? And describe your specific scenario</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 15].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setAnswers({ ...answers, timePerDay: mins })}
                      className={cn(
                        "p-2 rounded-lg border text-sm transition-all",
                        answers.timePerDay === mins
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <ClockIcon className="h-4 w-4 mx-auto mb-1" />
                      {mins} min
                    </button>
                  ))}
                </div>
                
                {/* Custom AI option */}
                <div className="p-3 rounded-xl border border-primary/30 bg-primary/5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={answers.useCustomAI}
                      onChange={(e) => setAnswers({ ...answers, useCustomAI: e.target.checked })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-sm">Generate custom prompts for my specific scenario</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Describe your specific interview, presentation topic, or situation
                      </p>
                    </div>
                  </label>
                  {answers.useCustomAI && (
                    <textarea
                      value={answers.customDescription || ""}
                      onChange={(e) => setAnswers({ ...answers, customDescription: e.target.value })}
                      placeholder="e.g., I have a Google interview for a product manager role next week, or I'm presenting about AI in healthcare at a medical conference..."
                      className="w-full p-3 rounded-lg border border-border bg-background resize-none mt-2"
                      rows={2}
                    />
                  )}
                </div>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    Generating your plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate My Plan
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border text-center text-xs text-muted-foreground">
          {daysUntilEvent} days until your {eventTypeLabel} • {answers.timePerDay} min/day
        </div>
      </div>
    </div>
  );
}