import { useArenaContext } from "@/context/ArenaContext";

export { GAMEMODES, getRankFromElo, getRankColor } from "@/hooks/arenaUtils";
export type { Gamemode, Duel, UserProfile, Rank, RankName, RankTier, DuelPlayer } from "@/context/ArenaContext";

export const useArena = () => {
  return useArenaContext();
};
