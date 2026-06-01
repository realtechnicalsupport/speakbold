import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Users, Search, Bell, Link2, Clock, X, Plus, ChevronRight, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { FriendCard } from "@/components/FriendCard";
import { FriendRequestRow } from "@/components/FriendRequestRow";
import { useFriends } from "@/hooks/useFriends";
import { useFriendSearch } from "@/hooks/useFriendSearch";
import { useFriendInvite } from "@/hooks/useFriendInvite";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useArena } from "@/hooks/useArena";
import { getRankFromElo, getRankColor } from "@/hooks/arenaUtils";
import { RankEmblem } from "@/components/RankEmblem";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Tab = "friends" | "requests" | "invite";

export default function Friends() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    sendRequest,
  } = useFriends();

  const { results: searchResults, loading: searchLoading } = useFriendSearch(searchQuery);
  const { myInvites, generateInvite, revokeInvite } = useFriendInvite();

  const handleSendRequest = async (targetId: string, displayName: string) => {
    await sendRequest(targetId);
    toast({ title: "Request sent", description: `Friend request sent to ${displayName}.` });
    setSearchQuery("");
  };

  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    try {
      const url = await generateInvite();
      await navigator.clipboard.writeText(url);
      toast({ title: "Invite link copied!", description: "Send it to anyone — they'll be auto-friended on sign-up." });
    } catch (err: any) {
      toast({ title: "Couldn't generate invite", description: err.message });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = async (token: string) => {
    const url = `${window.location.origin}/friends/invite/${token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Copied!", description: "Invite link copied to clipboard." });
  };

  const pendingCount = incomingRequests.length;
  const existingIds = new Set([
    ...friends.map((f) => f.id),
    ...incomingRequests.map((f) => f.id),
    ...outgoingRequests.map((f) => f.id),
  ]);

  const { rows: leaderRows, loading: lbLoading } = useLeaderboard(5);
  const { profile } = useArena();
  const myRank = getRankFromElo(profile.elo);
  const myRankColor = getRankColor(myRank);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container max-w-6xl pt-28 pb-32 lg:pb-12 px-4">
      <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-12 lg:items-start">
        <div>{/* main content column */}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="speak-serif text-4xl tracking-tight">Friends</h1>
            <p className="text-sm text-muted-foreground mt-1 opacity-60">
              {friends.length} {friends.length === 1 ? "friend" : "friends"}
            </p>
          </div>
          <button
            onClick={() => setTab("invite")}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/40 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
          >
            <Plus className="h-3 w-3" /> Invite
          </button>
        </div>

        {/* Incoming requests banner */}
        {pendingCount > 0 && tab !== "requests" && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setTab("requests")}
            className="w-full flex items-center gap-3 glass-card p-3 mb-6 border-primary/20 hover:border-primary/40 transition-all"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <span className="flex-1 text-sm font-semibold text-left">
              {pendingCount} pending friend {pendingCount === 1 ? "request" : "requests"}
            </span>
            <ChevronRight className="h-4 w-4 opacity-40" />
          </motion.button>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/20 rounded-2xl mb-6">
          {(["friends", "requests", "invite"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                tab === t
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "requests" && pendingCount > 0
                ? `Requests (${pendingCount})`
                : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Friends tab */}
        {tab === "friends" && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
              <input
                type="text"
                placeholder="Search by username…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 rounded-2xl bg-muted/20 border border-border/60 pl-11 pr-4 text-sm focus:outline-none focus:border-primary/40 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Search results */}
            <AnimatePresence>
              {searchQuery && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 mb-4 overflow-hidden"
                >
                  {searchLoading ? (
                    <p className="text-xs text-muted-foreground px-2 py-3 animate-pulse">Searching…</p>
                  ) : searchResults.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-3 opacity-60">No users found</p>
                  ) : (
                    searchResults.map((result: any) => (
                      <div
                        key={result.id}
                        className="flex items-center gap-3 glass-card p-3"
                      >
                        <div className="h-9 w-9 rounded-full bg-muted/30 flex items-center justify-center shrink-0 font-bold text-sm">
                          {result.display_name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{result.display_name}</p>
                          <p className="text-xs text-muted-foreground">{result.elo} ELO</p>
                        </div>
                        {existingIds.has(result.id) ? (
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 px-3">
                            Added
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(result.id, result.display_name)}
                            className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/30 text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Friend list */}
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-muted/20 animate-pulse" />
                ))}
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                <p className="text-sm font-semibold opacity-40">No friends yet</p>
                <p className="text-xs text-muted-foreground opacity-40">
                  Search for users above or share an invite link.
                </p>
                <button
                  onClick={() => setTab("invite")}
                  className="mt-4 px-6 py-2.5 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest shadow-glow hover:scale-105 transition-all"
                >
                  Get invite link
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 px-1 pb-1">
                  Your friends ({friends.length})
                </p>
                {friends.map((f) => (
                  <FriendCard key={f.id} friend={f} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requests tab */}
        {tab === "requests" && (
          <div className="space-y-6">
            {incomingRequests.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 px-1">
                  Incoming ({incomingRequests.length})
                </p>
                <AnimatePresence>
                  {incomingRequests.map((f) => (
                    <FriendRequestRow key={f.id} friend={f} />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {outgoingRequests.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 px-1">
                  Sent ({outgoingRequests.length})
                </p>
                {outgoingRequests.map((f) => (
                  <div key={f.id} className="glass-card p-4 flex items-center gap-4 opacity-60">
                    <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center shrink-0 font-bold">
                      {f.display_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{f.display_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Pending
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
              <div className="text-center py-16">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-sm font-semibold opacity-40">No pending requests</p>
              </div>
            )}
          </div>
        )}

        {/* Invite tab */}
        {tab === "invite" && (
          <div className="space-y-6">
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm">Invite link</p>
                  <p className="text-xs text-muted-foreground opacity-60">
                    Anyone with the link becomes your friend on sign-up. Expires in 14 days.
                  </p>
                </div>
              </div>
              <button
                onClick={handleGenerateInvite}
                disabled={inviteLoading}
                className="w-full py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {inviteLoading ? "Generating…" : "Generate & Copy Link"}
              </button>
            </div>

            {myInvites.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 px-1">
                  Your invites
                </p>
                {myInvites.map((invite) => (
                  <div key={invite.token} className="glass-card p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-muted-foreground truncate opacity-60">
                        …/invite/{invite.token.slice(0, 12)}…
                      </p>
                      {invite.claimed_by ? (
                        <p className="text-xs text-green-500 font-semibold mt-0.5">Claimed ✓</p>
                      ) : (
                        <p className="text-xs text-muted-foreground opacity-40 mt-0.5">
                          Expires {new Date(invite.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!invite.claimed_by && (
                        <button
                          onClick={() => handleCopyInvite(invite.token)}
                          className="px-3 py-1.5 rounded-lg border border-border/60 text-[10px] font-black uppercase tracking-widest hover:bg-muted/20 transition-colors"
                        >
                          Copy
                        </button>
                      )}
                      {!invite.claimed_by && (
                        <button
                          onClick={() => revokeInvite(invite.token)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors opacity-40 hover:opacity-100"
                          aria-label="Revoke"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>{/* end main content column */}

        {/* ── Desktop-only sidebar ──────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col gap-6 sticky top-28 self-start">

          {/* My rank card */}
          <div className={cn("glass-card p-5 border", myRankColor.split(" ").filter(c => c.startsWith("border")).join(" "))}>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-3">Your Rank</p>
            <div className="flex items-center gap-3">
              <RankEmblem rank={myRank} size="md" />
              <div>
                <p className={cn("text-base font-black", myRankColor.split(" ")[0])}>
                  {myRank.name} {myRank.tier}
                </p>
                <p className="text-xs opacity-40 tabular-nums">{profile.elo} ELO</p>
              </div>
            </div>
          </div>

          {/* Mini leaderboard */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Top Speakers</p>
              <Link to="/leaderboard" className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1">
                All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {lbLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 rounded-lg bg-muted/20 animate-pulse" />
                ))
              ) : leaderRows.length === 0 ? (
                <p className="text-xs opacity-30 text-center py-3">No ranked players yet</p>
              ) : (
                leaderRows.slice(0, 5).map((row, i) => {
                  const r = getRankFromElo(row.elo);
                  const medals = ["🏆", "🥈", "🥉"];
                  return (
                    <div key={row.id} className="flex items-center gap-2.5">
                      <span className="w-5 text-center text-sm shrink-0">
                        {medals[i] ?? <span className="text-[10px] font-black opacity-30">#{i + 1}</span>}
                      </span>
                      <RankEmblem rank={r} size="xs" />
                      <p className="text-xs font-semibold truncate flex-1 min-w-0">{row.display_name}</p>
                      <p className="text-[10px] font-black opacity-30 tabular-nums shrink-0">{row.elo}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Friend count stat */}
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-black tabular-nums">{friends.length}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                {friends.length === 1 ? "Friend" : "Friends"}
              </p>
            </div>
          </div>
        </aside>

      </div>{/* end lg:grid */}
      </main>
    </div>
  );
}
