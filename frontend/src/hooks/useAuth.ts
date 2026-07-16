"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/stores/useAuthStore";

// Thin hook over useAuthStore: triggers a single GET /auth/me check the first
// time any component mounts it (subsequent mounts see status !== "idle" and
// skip re-checking), and exposes the shared auth state + actions.
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const initialize = useAuthStore((s) => s.initialize);
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (useAuthStore.getState().status === "idle") {
      void initialize();
    }
  }, [initialize]);

  return {
    user,
    status,
    error,
    isLoading: status === "idle" || status === "loading",
    isAuthenticated: status === "authenticated",
    login,
    signup,
    logout,
  };
}
