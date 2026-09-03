import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  withCredentials: true,
  timeout: 20_000,
  headers: { Accept: "application/json" },
});

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(". ");
    if (message) return message;
    if (error.code === "ECONNABORTED") return "DreamDEX took too long to respond. Try again.";
    if (!error.response) return "Credence API is unavailable. Check that the backend is running.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
