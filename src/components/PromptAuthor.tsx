import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Download, Upload, Pencil, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export type Difficulty = "Easy" | "Medium" | "Hard";
export type Example = { label: string; text: string };
export type Prompt = {
  text: string;
  framework: string;
  points: string[];
  example: Example[];
};
export type CustomPrompt = Prompt & { id: string; difficulty: Difficulty };

type Props = {
  frameworks: { name: string; expanded: string }[];
  customPrompts: CustomPrompt[];
  onAdd: (p: CustomPrompt) => void;
  onDelete: (id: string) => void;
  onReplaceAll: (ps: CustomPrompt[]) => void;
  isOpen?: boolean;
  onOpen?: (open: boolean) => void;
};

const emptyBeat = (): Example => ({ label: "", text: "" });

export const PromptAuthor = ({ frameworks, customPrompts, onAdd, onDelete, onReplaceAll, isOpen, onOpen }: Props) => {
  const [open, setOpen] = useState(false);
  
  const handleSetOpen = (value: boolean) => {
    setOpen(value);
    onOpen?.(value);
  };
  
  useEffect(() => {
    if (isOpen !== undefined) {
      setOpen(isOpen);
    }
  }, [isOpen]);
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [text, setText] = useState("");
  const [framework, setFramework] = useState(frameworks[0]?.name ?? "PREP");
  const [points, setPoints] = useState<string[]>(["", "", ""]);
  const [example, setExample] = useState<Example[]>([emptyBeat(), emptyBeat(), emptyBeat()]);

  const reset = () => {
    setText("");
    setPoints(["", "", ""]);
    setExample([emptyBeat(), emptyBeat(), emptyBeat()]);
  };

  const save = () => {
    const cleanPoints = points.map((p) => p.trim()).filter(Boolean);
    const cleanExample = example
      .map((b) => ({ label: b.label.trim(), text: b.text.trim() }))
      .filter((b) => b.label && b.text);

    if (!text.trim()) return toast({ title: "Prompt text is required" });
    if (cleanPoints.length < 2) return toast({ title: "Add at least 2 talking points" });
    if (cleanExample.length < 2) return toast({ title: "Add at least 2 examples" });

    const entry: CustomPrompt = {
      id: crypto.randomUUID(),
      difficulty,
      text: text.trim(),
      framework,
      points: cleanPoints,
      example: cleanExample,
    };
    onAdd(entry);
    toast({ title: "Prompt added", description: `Saved to ${difficulty}` });
    reset();
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(customPrompts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "impromptu-prompts.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result));
        const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.prompts) ? raw.prompts : null;
        if (!arr) throw new Error("JSON must be an array of prompts (or { prompts: [...] }).");

        const allowed: Difficulty[] = ["Easy", "Medium", "Hard"];
        const errors: string[] = [];
        const cleaned: CustomPrompt[] = [];

        arr.forEach((p: any, i: number) => {
          const where = `#${i + 1}`;
          if (!p || typeof p !== "object") return errors.push(`${where}: not an object`);
          if (typeof p.text !== "string" || !p.text.trim()) return errors.push(`${where}: missing "text"`);
          const difficulty: Difficulty = allowed.includes(p.difficulty) ? p.difficulty : "Medium";
          const framework = typeof p.framework === "string" && p.framework.trim()
            ? p.framework
            : frameworks[0]?.name ?? "PREP";
          const points = Array.isArray(p.points)
            ? p.points.map((x: any) => String(x ?? "").trim()).filter(Boolean)
            : [];
          if (points.length < 2) return errors.push(`${where}: need at least 2 "points"`);
          const example = Array.isArray(p.example)
            ? p.example
                .map((b: any) => ({
                  label: String(b?.label ?? "").trim(),
                  text: String(b?.text ?? "").trim(),
                }))
                .filter((b: Example) => b.label && b.text)
            : [];
          if (example.length < 2) return errors.push(`${where}: need at least 2 "example" entries with label+text`);

          cleaned.push({
            id: typeof p.id === "string" && p.id ? p.id : crypto.randomUUID(),
            difficulty,
            text: p.text.trim(),
            framework,
            points,
            example,
          });
        });

        if (cleaned.length === 0) {
          throw new Error(errors[0] ?? "No valid prompts found in file.");
        }

        onReplaceAll(cleaned);
        toast({
          title: `Imported ${cleaned.length} prompt${cleaned.length === 1 ? "" : "s"}`,
          description: errors.length
            ? `${errors.length} skipped. First: ${errors[0]}`
            : "Replaced your custom prompt list.",
        });
      } catch (e: any) {
        console.error("[PromptAuthor] import failed:", e);
        toast({ title: "Import failed", description: e?.message ?? "Invalid JSON" });
      }
    };
reader.onerror = () => toast({ title: "Could not read file" });
    reader.readAsText(file);
  };

  const handleExport = () => {
    const data = JSON.stringify(customPrompts, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prompts.json";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported prompts", description: `${customPrompts.length} prompts saved to file` });
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          if (Array.isArray(imported)) {
            onReplaceAll(imported);
            toast({ title: "Imported prompts", description: `${imported.length} prompts loaded` });
          }
        } catch {
          toast({ title: "Error", description: "Invalid JSON file", variant: "destructive" });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleSetOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-semibold">
            Author a new prompt
          </DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={customPrompts.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <div className="flex gap-2">
                {(["Easy", "Medium", "Hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      difficulty === d
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Framework</Label>
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                {frameworks.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} — {f.expanded}
                  </option>
                ))}
              </select>
            </div>
          </div>
            </div>

            <div className="space-y-2">
        <Label>Prompt (the hook)</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Convince me that walking is an underrated skill."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Talking points</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPoints([...points, ""])}
          >
            <Plus className="h-4 w-4" /> Add point
          </Button>
        </div>
        <div className="space-y-2">
          {points.map((p, i) => (
            <div key={i} className="flex gap-2">
              <span className="font-mono text-primary text-sm pt-2.5 w-6">{i + 1}.</span>
              <Input
                value={p}
                onChange={(e) => {
                  const next = [...points];
                  next[i] = e.target.value;
                  setPoints(next);
                }}
                placeholder="Short hint for the speaker"
              />
              {points.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPoints(points.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Example</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExample([...example, emptyBeat()])}
          >
            <Plus className="h-4 w-4" /> Add example
          </Button>
        </div>
        <div className="space-y-3">
          {example.map((b, i) => (
            <div key={i} className="grid md:grid-cols-[160px_1fr_auto] gap-2">
              <Input
                value={b.label}
                onChange={(e) => {
                  const next = [...example];
                  next[i] = { ...next[i], label: e.target.value };
                  setExample(next);
                }}
                placeholder="Label (e.g. Point)"
              />
              <Textarea
                value={b.text}
                onChange={(e) => {
                  const next = [...example];
                  next[i] = { ...next[i], text: e.target.value };
                  setExample(next);
                }}
                placeholder="The sentence(s) for this beat"
                rows={2}
              />
              {example.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setExample(example.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="hero" onClick={save}>
          <Plus className="h-4 w-4" />
          Save prompt
        </Button>
      </div>

      {customPrompts.length > 0 && (
        <div className="border-t border-border pt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            Your custom prompts ({customPrompts.length})
          </p>
          <ul className="space-y-2 max-h-64 overflow-auto pr-2">
            {customPrompts.map((p) => (
              <li
                key={p.id}
                className="flex items-start gap-3 text-sm border border-border rounded-lg p-3"
              >
                <span className="text-xs font-mono text-primary shrink-0 mt-0.5">
                  {p.difficulty}
                </span>
                <span className="flex-1 text-foreground/85">{p.text}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      </DialogContent>
    </Dialog>
  );
};
