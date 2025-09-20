// src/lib/streaks.ts
import { api } from "../libs/axios";
export async function fetchStreaks() {
  const { data } = await api.get("/streaks");
  return data as {
    user: { current:number; longest:number; timezone:string };
    couple: null | { pair_id:number; current:number; longest:number };
  };
}
