import { useEffect, useState } from "react";
import { api } from "../libs/axios";

export type PartnerStatus = {
  partner: { id:number; name:string } | null;
  link: { status: "active" | "pending_unpair" | "ended"; unpair_requested_by?: number } | null;
  shared: any;
};

export function usePartner() {
  const [data, setData] = useState<PartnerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const { data } = await api.get("/partner/status");
      setData(data);
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);
  return { partner: data?.partner ?? null, link: data?.link ?? null, loading, refresh };
}
