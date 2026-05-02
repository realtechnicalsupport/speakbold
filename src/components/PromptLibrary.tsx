import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Pencil,
  Trash2,
  X,
  Save,
  RotateCcw,
  Plus,
  Library,
  Search,
  EyeOff,
  Eye,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { CustomPrompt, Difficulty, ExampleBeat, Prompt } from "./PromptAuthor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type LibraryEntry = {
  id: string;
  source: "builtin" | "custom";
  difficulty: Difficulty;
  prompt: Prompt;
  enabled: boolean;
  edited: boolean;
};

type Props = {
  frameworks: { name: string; expanded: string }[];
  entries: LibraryEntry[];
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (id: string, next: { difficulty: Difficulty; prompt: Prompt }) => void;
  onResetBuiltin: (id: string) => void;
  onDeleteCustom: (id: string) => void;
  onResetAll: () => void;
  onOpenAuthor?: () => void;
};

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

export const PromptLibrary = ({
  frameworks,
  entries,
  onToggle,
  onEdit,
  onResetBuiltin,
  onDeleteCustom,
  onResetAll,
  onOpenAuthor,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled" | "edited" | "custom">("all");
  const [query, setQuery] = useState("");

  const enabledCount = entries.filter((e) => e.enabled).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter === "enabled" && !e.enabled) return false;
      if (filter === "disabled" && e.enabled) return false;
      if (filter === "edited" && !e.edited) return false;
      if (filter === "custom" && e.source !== "custom") return false;
      if (q && !e.prompt.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, filter, query]);

  const grouped: Record<Difficulty, LibraryEntry[]> = useMemo(() => {
    const g: Record<Difficulty, LibraryEntry[]> = { Easy: [], Medium: [], Hard: [] };
    filtered.forEach((e) => g[e.difficulty].push(e));
    return g;
  }, [filtered]);

  return (
    <>
      <div className="border border-dashed border-border rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap bg-muted/20">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">
            Your prompt library
          </p>
          <p className="text-sm text-foreground/85">
            Pick which prompts you want, edit any of them, or hide ones you don't like.{" "}
            <span className="text-muted-foreground">
              {enabledCount}/{entries.length} active
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenAuthor?.()}>
            <Plus className="h-4 w-4" />
            Add prompt
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Library className="h-4 w-4" />
            Manage
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-semibold">
              Manage prompts
            </DialogTitle>
          </DialogHeader>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">
            Your prompt library
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Toggle prompts on/off, edit text or hints, or remove ones that don't fit.
            Saved locally in your browser.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onResetAll}>
            <RotateCcw className="h-4 w-4" />
            Reset all
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prompts…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["all", "enabled", "disabled", "edited", "custom"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors capitalize ${
                filter === f
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 max-h-[60vh] overflow-auto pr-1">
        {DIFFICULTIES.map((d) => {
          const list = grouped[d];
          if (list.length === 0) return null;
          return (
            <div key={d} className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                {d} · {list.filter((e) => e.enabled).length}/{list.length} active
              </p>
              <ul className="space-y-2">
                {list.map((entry) =>
                  editingId === entry.id ? (
                    <EditCard
                      key={entry.id}
                      entry={entry}
                      frameworks={frameworks}
                      onCancel={() => setEditingId(null)}
                      onSave={(next) => {
                        onEdit(entry.id, next);
                        setEditingId(null);
                        toast({ title: "Prompt updated" });
                      }}
                    />
                  ) : (
                    <li
                      key={entry.id}
                      className={`border rounded-lg p-3 flex items-start gap-3 ${
                        entry.enabled ? "border-border" : "border-border/50 bg-muted/20 opacity-70"
                      }`}
                    >
                      <Switch
                        checked={entry.enabled}
                        onCheckedChange={(v) => onToggle(entry.id, v)}
                        aria-label={entry.enabled ? "Disable prompt" : "Enable prompt"}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground/90 leading-snug">
                          {entry.prompt.text}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                            {entry.prompt.framework}
                          </span>
                          {entry.source === "custom" && (
                            <span className="text-[10px] font-mono uppercase tracking-wider text-primary">
                              Custom
                            </span>
                          )}
                          {entry.edited && entry.source === "builtin" && (
                            <span className="text-[10px] font-mono uppercase tracking-wider text-warm">
                              Edited
                            </span>
                          )}
                          {!entry.enabled && (
                            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                              <EyeOff className="h-3 w-3" /> Hidden
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingId(entry.id)}
                          aria-label="Edit prompt"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {entry.source === "builtin" && entry.edited && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              onResetBuiltin(entry.id);
                              toast({ title: "Reset to original" });
                            }}
                            aria-label="Reset to original"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {entry.source === "custom" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              onDeleteCustom(entry.id);
                              toast({ title: "Prompt deleted" });
                            }}
                            aria-label="Delete prompt"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                )}
              </ul>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No prompts match this filter.
          </p>
        )}
      </div>
      </DialogContent>
      </Dialog>
    </>
  );
};

const EditCard = ({
  entry,
  frameworks,
  onSave,
  onCancel,
}: {
  entry: LibraryEntry;
  frameworks: { name: string; expanded: string }[];
  onSave: (next: { difficulty: Difficulty; prompt: Prompt }) => void;
  onCancel: () => void;
}) => {
  const [difficulty, setDifficulty] = useState<Difficulty>(entry.difficulty);
  const [text, setText] = useState(entry.prompt.text);
  const [framework, setFramework] = useState(entry.prompt.framework);
  const [points, setPoints] = useState<string[]>(entry.prompt.points);
  const [example, setExample] = useState<ExampleBeat[]>(entry.prompt.example);

  const save = () => {
    const cleanPoints = points.map((p) => p.trim()).filter(Boolean);
    const cleanExample = example
      .map((b) => ({ label: b.label.trim(), text: b.text.trim() }))
      .filter((b) => b.label && b.text);
    if (!text.trim()) return toast({ title: "Prompt text is required" });
    if (cleanPoints.length < 2) return toast({ title: "Add at least 2 talking points" });
    if (cleanExample.length < 2) return toast({ title: "Add at least 2 example beats" });

    onSave({
      difficulty,
      prompt: { text: text.trim(), framework, points: cleanPoints, example: cleanExample },
    });
  };

  return (
    <li className="border border-primary/40 rounded-lg p-4 space-y-4 bg-background">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
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
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            {frameworks.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Prompt</Label>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Talking points</Label>
          <Button type="button" variant="ghost" size="sm" onClick={() => setPoints([...points, ""])}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {points.map((p, i) => (
          <div key={i} className="flex gap-2">
            <span className="font-mono text-primary text-sm pt-2 w-6">{i + 1}.</span>
            <Input
              value={p}
              onChange={(e) => {
                const n = [...points];
                n[i] = e.target.value;
                setPoints(n);
              }}
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Example beats</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExample([...example, { label: "", text: "" }])}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {example.map((b, i) => (
          <div key={i} className="grid md:grid-cols-[140px_1fr_auto] gap-2">
            <Input
              value={b.label}
              onChange={(e) => {
                const n = [...example];
                n[i] = { ...n[i], label: e.target.value };
                setExample(n);
              }}
              placeholder="Label"
            />
            <Textarea
              value={b.text}
              onChange={(e) => {
                const n = [...example];
                n[i] = { ...n[i], text: e.target.value };
                setExample(n);
              }}
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

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="hero" size="sm" onClick={save}>
          <Save className="h-4 w-4" />
          Save changes
        </Button>
      </div>
    </li>
  );
};

// re-export so consumers don't need a second import
export type { CustomPrompt, Difficulty, Prompt };
