import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, getHomeForRole, COOKIE_NAME } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets & API routes (API routes do their own auth check)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifySession(token) : null;

  // ── Public routes ────────────────────────────────────────────────────────────
  if (pathname === "/login") {
    if (user) {
      return NextResponse.redirect(
        new URL(getHomeForRole(user.role), request.url)
      );
    }
    return NextResponse.next();
  }

  // ── Protected routes ─────────────────────────────────────────────────────────
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // /dashboard → owner only
  if (pathname.startsWith("/dashboard") && user.role !== "owner") {
    return NextResponse.redirect(
      new URL(getHomeForRole(user.role), request.url)
    );
  }

  // /stock → owner & gudang only
  if (pathname.startsWith("/stock") && user.role === "kasir") {
    return NextResponse.redirect(new URL("/kasir", request.url));
  }

  // /histori → owner & gudang only
  if (pathname.startsWith("/histori") && user.role === "kasir") {
    return NextResponse.redirect(new URL("/kasir", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
