// src/lib/progress.ts
import { api } from "../libs/axios";

export type ProgressRes = {
  xp: { total:number; level:number; into_level:number; to_next:number; percent:number };
  weekly: { active_days:number; goal_days:number; percent:number; week_start:string; week_end:string };
};

export async function fetchProgress() {
  const { data } = await api.get<ProgressRes>("/me/progress");
  return data;
}
