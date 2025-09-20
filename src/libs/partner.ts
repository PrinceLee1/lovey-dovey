// src/lib/partner.ts
import { api } from "../libs/axios";

export const createInvite = async () => (await api.post("/partner/invite")).data;
export const lookupInvite  = async (code: string) => (await api.get(`/partner/lookup/${code}`)).data;
export const acceptInvite  = async (code: string) => (await api.post(`/partner/accept/${code}`)).data;
export const rejectInvite  = async (code: string) => (await api.post(`/partner/reject/${code}`)).data;
export const getPartnerStatus = async () => (await api.get("/partner/status")).data;
export const requestUnpair = async () => (await api.post("/partner/unpair/request")).data;
export const confirmUnpair = async () => (await api.post("/partner/unpair/confirm")).data;
export const cancelUnpair  = async () => (await api.post("/partner/unpair/cancel")).data;