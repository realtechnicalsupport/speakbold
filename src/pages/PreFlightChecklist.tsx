import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Module = "bodyLanguage" | "interview" | "publicSpeaking";

interface ChecklistItem {
  id: string;
  text: string;
  module?: Module;
}

const CHECKLISTS: Record<Module, ChecklistItem[]> = {
  bodyLanguage: [
    { id: "bl-1", text: "Did posture check in mirror or on camera", module: "bodyLanguage" },
    { id: "bl-2", text: "Recorded 30 seconds of yourself speaking", module: "bodyLanguage" },
    { id: "bl-3", text: "Practiced each of the four gestures once", module: "bodyLanguage" },
  ],
  interview: [
    { id: "int-1", text: "Recorded your answer to the question you'll face", module: "interview" },
    { id: "int-2", text: "Listened back for fillers ('um', 'like')", module: "interview" },
    { id: "int-3", text: "Did a STAR framework walkthrough", module: "interview" },
  ],
  publicSpeaking: [
    { id: "ps-1", text: "Ran the hook drill for your opening line", module: "publicSpeaking" },
    { id: "ps-2", text: "Practiced one full pause in your key moment", module: "publicSpeaking" },
    { id: "ps-3", text: "Recorded your closing line — does it land?", module: "publicSpeaking" },
  ],
};

const GENERAL = [
  { id: "gen-1", text: "Did box breathing or grounding exercise (optional)" },
  { id: "gen-2", text: "Reviewed 'gotchas' section for body language" },
  { id: "gen-3", text: "Set a timer: arrive 10 minutes early" },
];

const PreFlightChecklist = () => {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Module | "general">("general");

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allChecked = (items: ChecklistItem[]) => items.every((i) => checked.has(i.id));

  const currentItems = activeTab === "general" ? GENERAL : CHECKLISTS[activeTab as Module];

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Pre-flight checklist</p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-4">
            Before you go <em className="text-primary not-italic">live.</em>
          </h1>
          <p className="text-lg text-muted-foreground">
            Final prep before your interview, presentation, or high-stakes conversation. Run through what matters.
          </p>
        </div>

        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 mb-8">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm text-foreground/90">
            This ties all three modules together. Pick the tabs that apply to your situation.
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "general", label: "General" },
            { id: "bodyLanguage", label: "Body Language" },
            { id: "interview", label: "Interview" },
            { id: "publicSpeaking", label: "Public Speaking" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:border-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="border border-border rounded-3xl p-6 md:p-8">
          {activeTab !== "general" && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {activeTab === "bodyLanguage" && "Body Language"}
                {activeTab === "interview" && "Interview"}
                {activeTab === "publicSpeaking" && "Public Speaking"}
              </p>
              {allChecked(CHECKLISTS[activeTab as Module]) && (
                <span className="text-xs text-primary font-semibold flex items-center gap-1">
                  <Check className="h-4 w-4" /> Complete
                </span>
              )}
            </div>
          )}

          <ul className="space-y-4">
            {currentItems.map((item) => {
              const isChecked = checked.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    onClick={() => toggle(item.id)}
                    className="w-full flex items-start gap-4 text-left group"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid place-items-center h-6 w-6 rounded-full border-2 transition-colors shrink-0",
                        isChecked
                          ? "bg-primary border-primary"
                          : "border-muted-foreground group-hover:border-foreground"
                      )}
                    >
                      {isChecked && <Check className="h-4 w-4 text-primary-foreground" />}
                    </span>
                    <span className={cn("text-lg pt-0.5", isChecked && "line-through text-muted-foreground")}>
                      {item.text}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {activeTab !== "general" && (
            <div className="mt-6 pt-6 border-t border-border">
              <Link
                to={
                  activeTab === "bodyLanguage"
                    ? "/tracks/body-language"
                    : activeTab === "interview"
                    ? "/tracks/interviews"
                    : "/tracks/public-speaking"
                }
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Open {activeTab === "bodyLanguage" ? "Body Language" : activeTab === "interview" ? "Interviews" : "Public Speaking"} module
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        {checked.size > 0 && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            {checked.size} item{checked.size !== 1 ? "s" : ""} checked
          </p>
        )}

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Quick links</p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/tracks/body-language"
              className="px-4 py-2 bg-card border border-border rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Body Language
            </Link>
            <Link
              to="/tracks/interviews"
              className="px-4 py-2 bg-card border border-border rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Interviews
            </Link>
            <Link
              to="/tracks/public-speaking"
              className="px-4 py-2 bg-card border border-border rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Public Speaking
            </Link>
            <Link
              to="/tracks/impromptu"
              className="px-4 py-2 bg-card border border-border rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Impromptu
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreFlightChecklist;