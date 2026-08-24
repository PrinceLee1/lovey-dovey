// src/libs/auth.ts
import { api } from "../libs/axios";

export const requestPasswordReset = async (email: string) =>
  (await api.post("/forgot-password", { email })).data;

export const resetPassword = async (payload: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}) => (await api.post("/reset-password", payload)).data;
