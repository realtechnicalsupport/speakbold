import { useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Edit display name. Friendships are keyed on user UUIDs (friendships.user_a /
// user_b), so a rename never breaks a friendship — we only need to write the
// new name everywhere it's *read*: auth metadata, profiles, and user_xp. Once
// those update, friends' lists and leaderboards show the new name.
export const EditProfileDialog = ({ userId, currentName }: { userId: string; currentName: string }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  const dirty = name.trim().length > 0 && name.trim() !== currentName;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) return;
    setSaving(true);
    try {
      // 1. Auth metadata — fires USER_UPDATED so the session name refreshes app-wide.
      const { error: authErr } = await supabase.auth.updateUser({ data: { display_name: trimmed } });
      if (authErr) throw authErr;

      // 2. profiles.display_name — what FriendsContext + leaderboards read.
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ display_name: trimmed })
        .eq("id", userId);
      if (profErr) throw profErr;

      // 3. user_xp.display_name — best-effort (row may not exist yet).
      await supabase.from("user_xp").update({ display_name: trimmed }).eq("user_id", userId);

      toast({ title: "Profile updated", description: "Your name is now visible to friends." });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Couldn't save", description: err?.message ?? "Try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setName(currentName); }}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 hover:text-primary transition-all">
          <Pencil className="h-3 w-3" /> Edit profile
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="speak-serif text-2xl italic">Edit profile</DialogTitle>
          <DialogDescription className="text-sm opacity-50">
            Your display name is how friends and the leaderboard see you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="display-name" className="text-xs font-bold uppercase tracking-widest opacity-40">
            Display name
          </Label>
          <Input
            id="display-name"
            value={name}
            maxLength={32}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && dirty && !saving) handleSave(); }}
            placeholder="Your name"
            className="h-12 rounded-2xl px-4"
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <button className="px-5 py-2.5 rounded-full border border-border/60 text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all">
              Cancel
            </button>
          </DialogClose>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="px-6 py-2.5 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest shadow-glow disabled:opacity-40 inline-flex items-center gap-2 transition-all"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
