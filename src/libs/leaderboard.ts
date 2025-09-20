// src/lib/leaderboard.ts
import { api } from "../libs/axios";

export type LbEntry = { rank:number; pair_id:number; duo_name:string; xp:number; users:{id:number}[] };
export type LbResponse = { scope:string; top:LbEntry[]; me: {
  users: never[];rank:number; pair_id:number; duo_name:string; xp:number
} | null };

export async function fetchLeaderboard(scope: "all_time"|"weekly"|"monthly" = "all_time") {
  const { data } = await api.get<LbResponse>("/leaderboard", { params: { scope } });
  return data;
}
