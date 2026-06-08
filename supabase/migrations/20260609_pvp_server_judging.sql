-- ─────────────────────────────────────────────────────────────────────────────
-- Server-authoritative PvP judging.
--
-- Replaces the old host-authoritative, client-side judging where one player's
-- browser collected both transcripts over a best-effort realtime broadcast,
-- ran the AI judge locally, and broadcast the verdict. That design lost the
-- verdict whenever the host backgrounded the tab, disconnected, or a broadcast
-- message dropped ("no speech detected for the opponent", the 2500ms timing
-- races, etc.).
--
-- New design: each participant writes their OWN side (complete transcript +
-- metadata) to pvp_match_sides. The judge-match edge function reads BOTH sides
-- from the DB (durable — no realtime dependency), runs the AI judge server-side
-- exactly once, computes ELO for both players, and writes ONE authoritative
-- result to pvp_match_verdicts (+ the arena_battles row + profiles.elo). Both
-- clients poll pvp_match_verdicts for the outcome.
-- ─────────────────────────────────────────────────────────────────────────────

-- Each player's submitted side. One row per (duel, user).
create table if not exists public.pvp_match_sides (
  duel_id    text not null,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  -- 'creator' = the duel creator (becomes arena_battles.challenger);
  -- 'joiner'  = the player who joined  (becomes arena_battles.opponent).
  seat       text not null check (seat in ('creator', 'joiner')),
  gamemode   text not null,
  prompt     text not null default '',
  -- Mode-specific content: debate → { opening, rebuttal, stand };
  -- blitz/standard/pitch → { transcript, wpm, fillers }. Plus name/elo/avatar.
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (duel_id, user_id)
);

alter table public.pvp_match_sides enable row level security;

-- A player may only write and read their OWN side. The edge function uses the
-- service role to read both sides when judging.
create policy "pvp_sides_insert_own" on public.pvp_match_sides
  for insert with check (auth.uid() = user_id);
create policy "pvp_sides_update_own" on public.pvp_match_sides
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pvp_sides_select_own" on public.pvp_match_sides
  for select using (auth.uid() = user_id);

create index if not exists idx_pvp_match_sides_duel on public.pvp_match_sides(duel_id);

-- The authoritative judged result. One row per duel. Stored CREATOR-oriented
-- (challenger = creator); each client flips for its own perspective on read.
-- `status` lets the judging invocation claim the duel atomically via an
-- insert-once guard so two near-simultaneous submits can't both judge.
create table if not exists public.pvp_match_verdicts (
  duel_id               text primary key,
  gamemode              text not null,
  prompt                text not null default '',
  challenger_id         uuid not null,   -- duel creator
  opponent_id           uuid not null,   -- joiner
  status                text not null default 'judging' check (status in ('judging', 'done')),
  challenger_score      int,
  opponent_score        int,
  winner_id             uuid,            -- null = tie
  feedback              text,            -- to the creator
  opp_feedback          text,            -- to the joiner
  strengths             text,            -- creator's
  opp_strengths         text,            -- joiner's
  example_speech        text,            -- model answer for the creator
  challenger_elo_change int  not null default 0,
  opponent_elo_change   int  not null default 0,
  challenger_new_elo    int,
  opponent_new_elo      int,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.pvp_match_verdicts enable row level security;

-- Either participant may read the verdict. No client writes — only the
-- judge-match edge function (service role) inserts/updates here.
create policy "pvp_verdicts_select_participant" on public.pvp_match_verdicts
  for select using (auth.uid() = challenger_id or auth.uid() = opponent_id);
