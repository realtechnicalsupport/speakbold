import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { Flame, Trophy, Mic, Calendar, Sparkles, Target, Lock, Check, ArrowRight, Zap, Play, ShieldCheck, Microscope, FileText } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useSyncedStreak, useRecordings, usePracticeDays } from "@/hooks/useRecordings";
import { useMyXp } from "@/hooks/useLeaderboard";
import { getLevel } from "@/lib/xp-system";
import { cn } from "@/lib/utils";
import { DailyChallenges } from "@/components/DailyChallenges";
import { TailoredPlanCard } from "@/components/TailoredPlanCard";
import { FriendsCompare } from "@/components/FriendsCompare";
import { EditProfileDialog } from "@/components/EditProfileDialog";

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
  // `best` is now DB-backed (streaks.best_count) — survives browser clears and
  // device switches, and is what friends compare against.
  const { count: streak, practicedToday, best: bestStreak } = useSyncedStreak();
  const { items } = useRecordings();
  const { xp: userXP } = useMyXp();
  // Activity chart + "days practiced" both read the practice log — same source
  // as the streak — so they can't disagree with the streak counter.
  const { days: practiceDays, count: practiceDayCount } = usePracticeDays();
  const level = getLevel(userXP ?? 0);

  const stats = useMemo(() => {
    const totalMs = items.reduce((acc, r) => acc + (r.duration_ms ?? 0), 0);
    return { recordings: items.length, minutes: Math.round(totalMs / 60000) };
  }, [items]);

  const valueFor = (m: Challenge["metric"]) =>
    m === "recordings" ? stats.recordings : m === "streak" ? Math.max(streak, bestStreak) : practiceDayCount;

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();
  const displayName = (user?.user_metadata as any)?.display_name ?? user?.email?.split("@")[0] ?? "Speaker";

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const hit = practiceDays.has(key);
    return { key, hit, label: d.toLocaleDateString(undefined, { weekday: "short" })[0] };
  });

  const completed = CHALLENGES.filter((c) => valueFor(c.metric) >= c.goal).length;

  return (
    <main className="min-h-[100dvh] bg-background relative overflow-x-hidden">
      <SiteHeader />

      {/* Background Motion */}
      <div className="absolute top-[10%] right-[-5%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-primary/5 rounded-full blur-[150px] animate-float opacity-30 pointer-events-none will-change-transform" />
      <div className="absolute bottom-[20%] left-[-10%] w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-accent/5 rounded-full blur-[130px] animate-float opacity-20 pointer-events-none will-change-transform" style={{ animationDelay: "-4s" }} />

      <div id="profile-stats" className="container relative z-10 pt-20 md:pt-32 pb-32 lg:pb-20">

        {/* ── Hero Banner ── */}
        <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-16 mb-10 md:mb-20">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-24 w-24 md:h-40 md:w-40 rounded-[2rem] md:rounded-[3.5rem] bg-muted/10 border border-border/60 flex items-center justify-center relative overflow-hidden group shadow-soft">
              <span className="speak-serif text-4xl md:text-7xl text-primary relative z-10 italic">{initials}</span>
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
            {practicedToday && (
              <div className="absolute -bottom-2 -right-2 h-10 w-10 md:h-14 md:w-14 rounded-full bg-background border-2 border-primary flex items-center justify-center shadow-glow shadow-primary/20">
                <Check className="h-4 w-4 md:h-6 md:w-6 text-primary" strokeWidth={3} />
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0 space-y-4 md:space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-primary">
                <ShieldCheck className="h-4 w-4" />
                Active member
              </div>
              <EditProfileDialog userId={user.id} currentName={displayName} />
            </div>
            <h1 className="speak-serif text-3xl md:text-6xl lg:text-8xl leading-[0.9] tracking-tighter">
              Hello, <span className="text-primary italic">{displayName}</span>.
            </h1>
            <p className="text-sm md:text-lg font-medium tracking-tight opacity-40 max-w-xl leading-relaxed">
              {practicedToday
                ? "Daily session complete. Your stats are looking good!"
                : "Ready for your next drill?"}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/tracks/impromptu" className="button-pill px-6 py-3 md:px-10 md:py-4 bg-primary text-white shadow-glow group inline-flex items-center gap-2">
                <span className="text-xs md:text-xs font-black uppercase tracking-[0.2em]">START PRACTICE</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/report" className="button-pill px-6 py-3 md:px-10 md:py-4 border border-border/60 hover:border-primary/40 transition-all group inline-flex items-center gap-2">
                <FileText className="h-4 w-4 opacity-40 group-hover:opacity-100" />
                <span className="text-xs md:text-xs font-black uppercase tracking-[0.2em]">VIEW PROGRESS REPORT</span>
              </Link>
              {userXP !== undefined && (
                <div className="flex flex-col gap-1.5 min-w-[180px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] md:text-xs font-black uppercase tracking-[0.2em]">
                      <span className="text-primary">Lv {level.level}</span>
                      <span className="opacity-40"> · {level.title}</span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-30 tabular-nums">{userXP} XP</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/60">
                    <div
                      className="h-full bg-primary shadow-glow shadow-primary/40 transition-all duration-700"
                      style={{ width: `${level.progressPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">
                    {level.isMax ? "Max level reached" : `${level.xpToNext} XP to Lv ${level.level + 1}`}
                  </span>
                </div>
              )}
            </div>

            {/* Dev tools — destructive (account reset), so DEV builds only. */}
            {import.meta.env.DEV && (
              <div className="pt-6 flex flex-wrap items-center gap-4 border-t border-border/40">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-20 w-full mb-2">Dev tools</p>
                <button
                  onClick={() => (window as any).resetOnboarding?.()}
                  className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 hover:opacity-100 hover:text-primary transition-all flex items-center gap-2"
                >
                  <Zap className="h-3 w-3" />
                  RESET ONBOARDING & PATHWAY
                </button>
                <button
                  onClick={() => (window as any).startTutorial?.()}
                  className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 hover:opacity-100 hover:text-primary transition-all flex items-center gap-2"
                >
                  <Sparkles className="h-3 w-3" />
                  REPLAY TUTORIAL
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-10 md:mb-20">
          {[
            { label: "Current Streak", value: streak, suffix: "DAYS", icon: Flame, color: "text-orange-500" },
            { label: "Best Streak", value: bestStreak, suffix: "DAYS", icon: Trophy, color: "text-amber-500" },
            { label: "Total Recordings", value: stats.recordings, suffix: "DONE", icon: Mic, color: "text-primary" },
            { label: "Practice Time", value: stats.minutes, suffix: "MINS", icon: Calendar, color: "text-blue-500" },
          ].map((s) => (
            <div
              key={s.label}
              className="glass-card rounded-2xl md:rounded-[2.5rem] p-4 md:p-8 space-y-3 md:space-y-6 group relative overflow-hidden"
            >
              <s.icon className={cn("h-4 w-4 md:h-5 md:w-5 opacity-20 group-hover:opacity-100 transition-all duration-500", s.color)} />
              <div className="space-y-1">
                <div className="speak-serif text-2xl md:text-4xl font-bold tabular-nums tracking-tighter italic">
                  {s.value}
                  <span className="ml-1 md:ml-2 text-[11px] md:text-xs font-black opacity-30 uppercase tracking-[0.3em] not-italic">{s.suffix}</span>
                </div>
                <p className="text-[11px] md:text-xs font-black uppercase tracking-[0.3em] opacity-30">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tailored plan (performance-based) ── */}
        <TailoredPlanCard />

        {/* ── Tabs ── */}
        <Tabs defaultValue="daily" className="w-full">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 md:mb-14 border-b border-border/60 pb-6">
            <div className="overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
              <TabsList className="glass p-1.5 rounded-full h-auto flex flex-nowrap gap-1 w-max min-w-full">
                {["daily", "streak", "recordings", "achievements"].map(v => (
                  <TabsTrigger
                    key={v}
                    value={v}
                    id={v === "recordings" ? "profile-recordings-tab" : undefined}
                    className="rounded-full px-4 md:px-8 py-2.5 md:py-3 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-glow transition-all text-[11px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em] opacity-40 data-[state=active]:opacity-100 whitespace-nowrap"
                  >
                    {v}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="hidden md:flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] opacity-20">
              <Microscope className="h-4 w-4" />
              DETAILED STATS
            </div>
          </div>

          {/* ─ DAILY TAB ─ */}
          <TabsContent value="daily" className="focus-visible:ring-0 focus-visible:outline-none animate-in fade-in duration-300">
            <DailyChallenges />
          </TabsContent>

          {/* ─ STREAK TAB ─ */}
          <TabsContent value="streak" className="space-y-8 focus-visible:ring-0 focus-visible:outline-none animate-in fade-in duration-300">
            <div className="grid lg:grid-cols-[1fr_2fr] gap-6 md:gap-10">
              {/* Streak counter */}
              <div className="glass-card rounded-[2.5rem] p-6 md:p-12 space-y-6 md:space-y-10 relative overflow-hidden">
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-[0.5em] opacity-40">STREAK</p>
                  <div className="flex items-baseline gap-4">
                    <span className="speak-serif text-5xl md:text-[7rem] font-bold tracking-tighter text-primary leading-none italic">{streak}</span>
                    <span className="text-base md:text-xl font-black uppercase tracking-[0.4em] opacity-20 italic">Days</span>
                  </div>
                </div>
                <p className="text-sm font-medium tracking-tight opacity-40 leading-relaxed italic border-l border-primary/20 pl-6">
                  {streak === 0
                    ? "Your streak has ended. Record today to start again!"
                    : "Keep it up! You're building a great habit."}
                </p>
              </div>

              {/* 7-day chart */}
              <div className="glass-card rounded-[2.5rem] p-6 md:p-12 space-y-6 md:space-y-10 relative overflow-hidden">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.5em] opacity-40">PAST 7 DAYS</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">7-DAY ACTIVITY</span>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2 md:gap-4 h-32 md:h-52">
                  {last7.map((d) => (
                    <div key={d.key} className="flex flex-col items-center gap-3 flex-1 h-full justify-end group">
                      <div
                        className={cn(
                          "w-full rounded-lg transition-all duration-500",
                          d.hit ? "bg-primary shadow-glow shadow-primary/20" : "bg-muted"
                        )}
                        style={{ height: d.hit ? "100%" : "8px" }}
                      />
                      <span className={cn(
                        "text-[11px] md:text-xs font-black uppercase tracking-[0.3em] transition-colors duration-500",
                        d.hit ? "text-primary" : "opacity-20 group-hover:opacity-40"
                      )}>
                        {d.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Social comparison — how your streak stacks up against friends. */}
            <FriendsCompare defaultMetric="streak" />
          </TabsContent>

          {/* ─ RECORDINGS TAB ─ */}
          <TabsContent value="recordings" className="focus-visible:ring-0 focus-visible:outline-none animate-in fade-in duration-300">
            {items.length === 0 ? (
              <div className="py-16 md:py-32 text-center space-y-6 border border-dashed border-border/60 rounded-[2.5rem] relative overflow-hidden">
                <Mic className="h-16 w-16 md:h-24 md:w-24 opacity-5 mx-auto" />
                <div className="space-y-3">
                  <p className="speak-serif text-2xl md:text-3xl italic opacity-20">Your vault is empty.</p>
                  <p className="text-xs font-black uppercase tracking-[0.5em] opacity-40">START YOUR FIRST SESSION</p>
                </div>
                <Link to="/tracks/impromptu" className="button-pill px-8 py-3 md:px-14 md:py-4 inline-flex">
                  <span className="text-xs font-black uppercase tracking-[0.2em]">START PRACTICE</span>
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                {items.map((r) => {
                  const date = new Date(r.created_at);
                  const mins = Math.floor((r.duration_ms ?? 0) / 60000);
                  const secs = Math.floor(((r.duration_ms ?? 0) % 60000) / 1000);
                  return (
                    <div
                      key={r.id}
                      className="glass-card rounded-2xl md:rounded-[2.5rem] p-5 md:p-8 group relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4 md:mb-6">
                        <div className="space-y-2 flex-1 min-w-0">
                          <p className="speak-serif text-lg md:text-2xl italic truncate group-hover:text-primary transition-colors">
                            {r.prompt_text ?? "FREE PRACTICE"}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] md:text-xs font-black uppercase tracking-[0.3em] opacity-30 group-hover:opacity-50 transition-opacity">
                            <span>{date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                            <span className="h-1 w-1 rounded-full bg-primary" />
                            <span>{mins}:{String(secs).padStart(2, "0")} DURATION</span>
                          </div>
                        </div>
                        <div className="shrink-0 h-10 w-10 md:h-14 md:w-14 rounded-full border border-border/60 flex items-center justify-center opacity-40 group-hover:opacity-100 group-hover:bg-primary/10 group-hover:border-primary transition-all duration-500">
                          <Play className="h-4 w-4 md:h-5 md:w-5" fill="currentColor" />
                        </div>
                      </div>
                      {r.signedUrl && (
                        <div className="bg-muted/10 rounded-full p-2 border border-border/60 group-hover:border-primary/20 transition-all duration-500">
                          <audio controls className="w-full h-8 md:h-10" src={r.signedUrl} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─ ACHIEVEMENTS TAB ─ */}
          <TabsContent value="achievements" className="space-y-10 md:space-y-16 focus-visible:ring-0 focus-visible:outline-none animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8">
              <div className="space-y-3 md:space-y-4">
                <p className="text-xs font-black uppercase tracking-[0.6em] text-primary">ACHIEVEMENTS</p>
                <h2 className="speak-serif text-3xl md:text-6xl leading-none tracking-tighter">
                  {completed} <span className="opacity-20">/ {CHALLENGES.length}</span> <span className="text-primary italic">Earned</span>.
                </h2>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {CHALLENGES.map((c) => {
                const value = valueFor(c.metric);
                const pct = Math.min(100, Math.round((value / c.goal) * 100));
                const done = value >= c.goal;
                const Icon = c.icon;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "relative glass-card rounded-2xl md:rounded-[2.5rem] p-5 md:p-8 flex items-start gap-4 md:gap-8 transition-all duration-500 group overflow-hidden",
                      done ? "border-primary/30 bg-primary/[0.03]" : "grayscale opacity-50"
                    )}
                  >
                    <div className={cn(
                      "h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500",
                      done ? "bg-primary text-white shadow-glow shadow-primary/20" : "bg-muted"
                    )}>
                      {done ? <Icon className="h-6 w-6 md:h-8 md:w-8" /> : <Lock className="h-5 w-5 md:h-6 md:w-6 opacity-10" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-4 md:space-y-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="speak-serif text-lg md:text-2xl italic group-hover:text-primary transition-colors">{c.title}</h3>
                          {done && <Check className="h-5 w-5 text-primary shrink-0" strokeWidth={3} />}
                        </div>
                        <p className="text-xs md:text-sm font-medium opacity-40 leading-relaxed tracking-tight">{c.detail}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] md:text-xs font-black uppercase tracking-[0.3em]">
                          <span className={done ? "text-primary" : "opacity-30"}>{Math.min(value, c.goal)} / {c.goal} ACHIEVED</span>
                          <span className="opacity-20 hidden md:inline">{c.reward}</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/60">
                          <div
                            className={cn("h-full rounded-full transition-all duration-700", done ? "bg-primary" : "bg-foreground/10")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default Profile;
