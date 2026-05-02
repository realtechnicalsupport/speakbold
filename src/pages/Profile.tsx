import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Flame, Trophy, Mic, Calendar, Sparkles, Target, Lock, Check, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useSyncedStreak, useRecordings } from "@/hooks/useRecordings";
import { cn } from "@/lib/utils";

type Challenge = {
  id: string;
  title: string;
  detail: string;
  goal: number;
  metric: "recordings" | "streak" | "days";
  icon: typeof Trophy;
  reward: string;
};

const CHALLENGES: Challenge[] = [
  { id: "first-take", title: "First take", detail: "Record your very first attempt.", goal: 1, metric: "recordings", icon: Mic, reward: "Bronze badge" },
  { id: "warm-up", title: "Warming up", detail: "Bank 5 recorded attempts.", goal: 5, metric: "recordings", icon: Sparkles, reward: "Silver badge" },
  { id: "ten-tape", title: "Ten on tape", detail: "Reach 10 recorded attempts.", goal: 10, metric: "recordings", icon: Trophy, reward: "Gold badge" },
  { id: "spark", title: "Spark", detail: "Practice 3 days in a row.", goal: 3, metric: "streak", icon: Flame, reward: "Streak emblem" },
  { id: "blaze", title: "Blaze", detail: "Hit a 7-day streak.", goal: 7, metric: "streak", icon: Flame, reward: "Weekly emblem" },
  { id: "wildfire", title: "Wildfire", detail: "Hit a 30-day streak.", goal: 30, metric: "streak", icon: Flame, reward: "Legendary emblem" },
  { id: "regular", title: "The regular", detail: "Practice on 14 different days.", goal: 14, metric: "days", icon: Calendar, reward: "Habit ribbon" },
  { id: "veteran", title: "Veteran", detail: "Practice on 50 different days.", goal: 50, metric: "days", icon: Target, reward: "Master ribbon" },
];

const Profile = () => {
  const { user, loading } = useAuth();
  const { count: streak, practicedToday } = useSyncedStreak();
  const { items } = useRecordings();
  const [bestStreak, setBestStreak] = useState<number>(0);

  // Track best streak locally
  useEffect(() => {
    const key = "speakbold.bestStreak";
    const stored = Number(localStorage.getItem(key) ?? "0");
    const best = Math.max(stored, streak);
    if (best !== stored) localStorage.setItem(key, String(best));
    setBestStreak(best);
  }, [streak]);

  const stats = useMemo(() => {
    const days = new Set(items.map((r) => r.created_at.slice(0, 10))).size;
    const totalMs = items.reduce((acc, r) => acc + (r.duration_ms ?? 0), 0);
    return { recordings: items.length, days, minutes: Math.round(totalMs / 60000) };
  }, [items]);

  const valueFor = (m: Challenge["metric"]) =>
    m === "recordings" ? stats.recordings : m === "streak" ? Math.max(streak, bestStreak) : stats.days;

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();
  const displayName = (user?.user_metadata as any)?.display_name ?? user?.email?.split("@")[0] ?? "Speaker";

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  // Last 7 days streak grid
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const hit = items.some((r) => r.created_at.slice(0, 10) === key);
    return { key, hit, label: d.toLocaleDateString(undefined, { weekday: "short" })[0] };
  });

  const completed = CHALLENGES.filter((c) => valueFor(c.metric) >= c.goal).length;

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      {/* Decorated banner */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-spotlight opacity-70" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute -top-32 -left-20 h-80 w-80 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-accent/15 blur-[120px]" />

        <div className="container relative py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-end gap-8">
            {/* Avatar */}
            <div className="relative">
              <div className="h-28 w-28 md:h-36 md:w-36 rounded-3xl bg-warm grid place-items-center font-display text-4xl md:text-5xl font-semibold text-primary-foreground shadow-glow">
                {initials}
              </div>
              {practicedToday && (
                <span className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-background border-2 border-primary grid place-items-center">
                  <Check className="h-4 w-4 text-primary" />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.25em] uppercase mb-3">
                <span className="h-px w-10 bg-primary" />
                Your stage
              </div>
              <h1 className="font-display text-4xl md:text-6xl font-semibold leading-tight text-balance">
                Hello, <em className="not-italic text-primary">{displayName}</em>.
              </h1>
              <p className="text-muted-foreground mt-3 max-w-xl">
                {practicedToday
                  ? "You've already shown up today. The room is warming."
                  : "Five honest minutes today keeps the streak — and the muscle — alive."}
              </p>
            </div>

            <div className="flex md:flex-col gap-3 md:items-end">
              <Button variant="hero" size="lg" asChild>
                <Link to="/tracks/impromptu">
                  Practice now <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mt-12">
            {[
              { label: "Current streak", value: streak, suffix: "days", icon: Flame, accent: true },
              { label: "Best streak", value: bestStreak, suffix: "days", icon: Trophy },
              { label: "Recordings", value: stats.recordings, suffix: "saved", icon: Mic },
              { label: "Practice time", value: stats.minutes, suffix: "min", icon: Calendar },
            ].map((s) => (
              <div
                key={s.label}
                className={cn(
                  "relative bg-card-gradient border border-border rounded-2xl p-5",
                  s.accent && "border-primary/40",
                )}
              >
                <s.icon className={cn("h-5 w-5 mb-3", s.accent ? "text-primary" : "text-muted-foreground")} />
                <div className="font-display text-3xl md:text-4xl font-semibold tabular-nums">
                  {s.value}
                  <span className="ml-2 text-sm text-muted-foreground font-sans font-normal">{s.suffix}</span>
                </div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="container py-12 md:py-16">
        <Tabs defaultValue="streaks" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3 mb-10">
            <TabsTrigger value="streaks">
              <Flame className="h-4 w-4 mr-2" /> Streaks
            </TabsTrigger>
            <TabsTrigger value="recordings">
              <Mic className="h-4 w-4 mr-2" /> Recordings
            </TabsTrigger>
            <TabsTrigger value="challenges">
              <Trophy className="h-4 w-4 mr-2" /> Achievements
            </TabsTrigger>
          </TabsList>

          {/* STREAKS TAB */}
          <TabsContent value="streaks" className="space-y-10">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Big flame card */}
              <div className="relative lg:col-span-1 bg-card-gradient border border-border rounded-3xl p-8 overflow-hidden">
                <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
                <Flame className="h-10 w-10 text-primary relative" />
                <div className="font-display text-7xl font-semibold mt-4 tabular-nums relative">{streak}</div>
                <p className="text-sm uppercase tracking-widest text-muted-foreground mt-1 relative">
                  day{streak === 1 ? "" : "s"} on fire
                </p>
                <p className="text-sm text-muted-foreground mt-6 relative leading-relaxed">
                  {streak === 0
                    ? "Your streak resets when a day passes without practice. Today's the day to relight it."
                    : practicedToday
                    ? "You're locked in for today. Come back tomorrow to keep it burning."
                    : "Don't let it go out — finish a quick drill before midnight."}
                </p>
              </div>

              {/* Last 7 days */}
              <div className="lg:col-span-2 bg-card-gradient border border-border rounded-3xl p-8">
                <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-6">
                  The last 7 days
                </p>
                <div className="flex items-end justify-between gap-2 md:gap-4 h-40">
                  {last7.map((d, i) => (
                    <div key={d.key} className="flex flex-col items-center gap-2 flex-1">
                      <div className="flex-1 w-full flex items-end">
                        <div
                          className={cn(
                            "w-full rounded-t-lg transition-all",
                            d.hit ? "bg-warm h-full" : "bg-muted h-3",
                          )}
                          style={{ minHeight: d.hit ? "60%" : "12px" }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-xs font-mono",
                          d.hit ? "text-foreground" : "text-muted-foreground",
                          i === 6 && "text-primary font-semibold",
                        )}
                      >
                        {d.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-6 text-sm text-muted-foreground">
                  <span>{last7.filter((d) => d.hit).length} of 7 days hit</span>
                  <span>{stats.days} total practice days</span>
                </div>
              </div>
            </div>

            {/* Streak rules */}
            <div className="border border-dashed border-border rounded-2xl p-6 bg-muted/20">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                How streaks work
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>· One drill, one prompt, one recording — anything that finishes counts.</li>
                <li>· You get one full day of grace; miss two and the count resets.</li>
                <li>· Streaks sync across every device you sign into.</li>
              </ul>
            </div>
          </TabsContent>

          {/* RECORDINGS TAB */}
          <TabsContent value="recordings" className="space-y-6">
            {items.length === 0 ? (
              <div className="text-center py-16">
                <Mic className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg mb-2">No recordings yet</p>
                <p className="text-muted-foreground/70 text-sm">Complete a practice session to see your recordings here.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 max-sm:w-full">
                {items.map((r) => {
                  const date = new Date(r.created_at);
                  const mins = Math.floor((r.duration_ms ?? 0) / 60000);
                  const secs = Math.floor(((r.duration_ms ?? 0) % 60000) / 1000);
                  return (
                    <div
                      key={r.id}
                      className="bg-card-gradient border border-border rounded-2xl p-5 overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">
                            {r.prompt_text ?? "Untitled recording"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {mins}:{String(secs).padStart(2, "0")}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1 bg-muted rounded">
                            {r.difficulty ?? "—"}
                          </span>
                        </div>
                      </div>
                      {r.signedUrl && (
                        <audio controls className="w-full h-6 mt-2 max-sm:max-w-full" src={r.signedUrl} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* CHALLENGES TAB */}
          <TabsContent value="challenges" className="space-y-8">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-semibold">
                  <em className="text-primary not-italic">{completed}</em>
                  <span className="text-muted-foreground"> / {CHALLENGES.length}</span> complete
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Small wins that prove you're actually doing the work.
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <Sparkles className="h-4 w-4 text-accent" /> Earn badges as you go
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {CHALLENGES.map((c) => {
                const value = valueFor(c.metric);
                const pct = Math.min(100, Math.round((value / c.goal) * 100));
                const done = value >= c.goal;
                const Icon = c.icon;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "relative bg-card-gradient border rounded-3xl p-6 overflow-hidden transition-all",
                      done ? "border-primary/50 shadow-glow" : "border-border hover:border-primary/30",
                    )}
                  >
                    {done && (
                      <div className="absolute top-4 right-4 flex items-center gap-1 text-xs font-semibold text-primary uppercase tracking-widest">
                        <Check className="h-3 w-3" /> Done
                      </div>
                    )}
                    <div
                      className={cn(
                        "h-12 w-12 rounded-2xl grid place-items-center mb-4",
                        done ? "bg-warm" : "bg-muted border border-border",
                      )}
                    >
                      {done ? (
                        <Icon className="h-5 w-5 text-primary-foreground" />
                      ) : value === 0 ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Icon className="h-5 w-5 text-foreground" />
                      )}
                    </div>
                    <h3 className="font-display text-xl font-semibold leading-tight">{c.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-5">{c.detail}</p>

                    {/* Progress */}
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className={cn(done ? "text-primary" : "text-muted-foreground")}>
                        {Math.min(value, c.goal)} / {c.goal}
                      </span>
                      <span className="text-muted-foreground uppercase tracking-widest">
                        {c.reward}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          done ? "bg-warm" : "bg-primary/70",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
};

export default Profile;