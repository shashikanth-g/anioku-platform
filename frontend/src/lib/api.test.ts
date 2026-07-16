import { afterEach, describe, expect, it, vi } from "vitest";

import { api, ApiError } from "@/lib/api";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        id: "1",
        email: "a@b.com",
        name: "A",
        avatar_url: null,
        plan: "free",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = await api.auth.me();

    expect(user.email).toBe("a@b.com");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toContain("/api/v1/auth/me");
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      credentials: "include",
    });
  });

  it("treats a 204 response as no content", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.auth.logout()).resolves.toBeUndefined();
  });

  it("throws an ApiError with the backend's detail message on failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(409, { detail: "Email already registered" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      api.auth.signup({ email: "a@b.com", password: "x", name: "A" }),
    ).rejects.toMatchObject({
      status: 409,
      message: "Email already registered",
    });
  });

  it("refreshes the access token once on a 401 and retries the original request", async () => {
    const fetchMock = vi
      .fn()
      // First call: /auth/me -> 401
      .mockResolvedValueOnce(jsonResponse(401, { detail: "Not authenticated" }))
      // Second call: /auth/refresh -> 200
      .mockResolvedValueOnce(jsonResponse(200, { user: { id: "1" } }))
      // Third call: retried /auth/me -> 200
      .mockResolvedValueOnce(
        jsonResponse(200, {
          id: "1",
          email: "a@b.com",
          name: "A",
          avatar_url: null,
          plan: "free",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const user = await api.auth.me();

    expect(user.email).toBe("a@b.com");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]![0]).toContain("/auth/refresh");
  });

  it("throws the original 401 if the refresh attempt also fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { detail: "Not authenticated" }))
      .mockResolvedValueOnce(
        jsonResponse(401, { detail: "Invalid or expired refresh token" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.auth.me()).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not attempt a refresh loop on the login endpoint itself", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(401, { detail: "Invalid email or password" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      api.auth.login({ email: "a@b.com", password: "wrong" }),
    ).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
