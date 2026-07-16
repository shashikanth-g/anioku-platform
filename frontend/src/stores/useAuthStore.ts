// Zustand store holding the current user + auth status, shared across every
// component that calls the useAuth hook (src/hooks/useAuth.ts) so there's a
// single source of truth without prop drilling or a context provider.
import { create } from "zustand";

import { api, ApiError } from "@/lib/api";
import type { LoginRequest, SignupRequest, User } from "@/types";

export type AuthStatus =
  "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  initialize: () => Promise<void>;
  login: (payload: LoginRequest) => Promise<void>;
  signup: (payload: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  error: null,

  initialize: async () => {
    set({ status: "loading", error: null });
    try {
      const user = await api.auth.me();
      set({ user, status: "authenticated" });
    } catch {
      set({ user: null, status: "unauthenticated" });
    }
  },

  login: async (payload) => {
    set({ status: "loading", error: null });
    try {
      const { user } = await api.auth.login(payload);
      set({ user, status: "authenticated" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed";
      set({ status: "unauthenticated", error: message });
      throw err;
    }
  },

  signup: async (payload) => {
    set({ status: "loading", error: null });
    try {
      const { user } = await api.auth.signup(payload);
      set({ user, status: "authenticated" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Signup failed";
      set({ status: "unauthenticated", error: message });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.auth.logout();
    } finally {
      set({ user: null, status: "unauthenticated", error: null });
    }
  },
}));
