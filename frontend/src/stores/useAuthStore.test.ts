import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";

const mockUser = {
  id: "1",
  email: "a@b.com",
  name: "A",
  avatar_url: null,
  plan: "free" as const,
  created_at: "2026-01-01T00:00:00Z",
};

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: "idle", error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initialize() sets the user and authenticated status on success", async () => {
    vi.spyOn(api.auth, "me").mockResolvedValue(mockUser);

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("initialize() clears the user and marks unauthenticated on failure", async () => {
    vi.spyOn(api.auth, "me").mockRejectedValue(
      new ApiError(401, "Not authenticated"),
    );

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
  });

  it("login() sets the user and authenticated status on success", async () => {
    vi.spyOn(api.auth, "login").mockResolvedValue({ user: mockUser });

    await useAuthStore
      .getState()
      .login({ email: "a@b.com", password: "secret123" });

    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("login() records the error and rethrows on failure", async () => {
    vi.spyOn(api.auth, "login").mockRejectedValue(
      new ApiError(401, "Invalid email or password"),
    );

    await expect(
      useAuthStore.getState().login({ email: "a@b.com", password: "wrong" }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().error).toBe("Invalid email or password");
  });

  it("logout() clears the user even if the request fails", async () => {
    useAuthStore.setState({ user: mockUser, status: "authenticated" });
    vi.spyOn(api.auth, "logout").mockRejectedValue(new ApiError(500, "boom"));

    await expect(useAuthStore.getState().logout()).rejects.toBeInstanceOf(
      ApiError,
    );

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
  });
});
