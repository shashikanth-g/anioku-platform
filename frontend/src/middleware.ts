import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Coarse, edge-side gate: redirects to /login if neither JWT cookie is
// present. This does not verify the access token's signature/expiry — that's
// enforced by the backend on every request; the client-side useAuth hook
// handles the fine-grained case (access token expired but refresh token
// still valid) via lib/api.ts's automatic refresh-and-retry.
const PROTECTED_PREFIXES = ["/dashboard", "/workspace"];
const AUTH_PAGES = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated =
    request.cookies.has("access_token") || request.cookies.has("refresh_token");

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (AUTH_PAGES.includes(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/workspace/:path*", "/login", "/signup"],
};
