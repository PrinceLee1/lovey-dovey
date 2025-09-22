// src/pages/admin/AdminOverview.tsx
import { useEffect, useState } from "react";
import api from "../../libs/axios";

export default function AdminOverview() {
  const [m, setM] = useState<any>(null);
  useEffect(() => { (async ()=> {
    const { data } = await api.get('/admin/metrics');
    setM(data?.totals);
  })(); }, []);

  if (!m) return null;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Tile label="Total Users" value={m.totalUsers} />
      <Tile label="Active Users" value={m.activeUsers} />
      <Tile label="Deactivated" value={m.deactivated} />
      <Tile label="Total Games" value={m.totalGames} />
      <Tile label="Total XP" value={m.xpSum} />
    </div>
  );
}
function Tile({label, value}:{label:string; value:any}) {
  return (
    <div className="rounded-2xl bg-white border shadow-sm p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
