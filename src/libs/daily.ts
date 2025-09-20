// src/lib/daily.ts
import { api } from "../libs/axios";

export async function getDaily() {
  const { data } = await api.get("/daily-challenge");
  return data as {
    challenge: { kind:'solo'|'duo'; title:string; payload:{description:string; steps:string[]; duration_minutes:number; difficulty:string}; status:'pending'|'completed' };
    expires_at: string;
  };
}

export async function completeDaily(meta?: any) {
  const { data } = await api.post("/daily-challenge/complete", { success:true, meta });
  return data as { ok:boolean; xp_awarded:number; user:{ xp:number } };
}
