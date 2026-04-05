import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const getSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-min-32-chars-long!");

export const COOKIE_NAME = "session";

export interface SessionUser {
  userId: string;
  namaUser: string;
  role: "owner" | "kasir" | "gudang";
  loginId: string;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function getHomeForRole(role: string): string {
  switch (role) {
    case "owner":
      return "/dashboard";
    case "gudang":
      return "/stock";
    case "kasir":
      return "/kasir";
    default:
      return "/login";
  }
}
