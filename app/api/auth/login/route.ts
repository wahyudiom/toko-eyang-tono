import { NextRequest, NextResponse } from "next/server";
import { findUserByLoginId } from "@/lib/sheets";
import { createSessionToken, COOKIE_NAME, getHomeForRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { login_id, password } = await req.json();

    if (!login_id || !password) {
      return NextResponse.json(
        { error: "ID dan password wajib diisi" },
        { status: 400 }
      );
    }

    const user = await findUserByLoginId(login_id.trim());

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "ID atau password salah" },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      userId: user.user_id,
      namaUser: user.nama_user,
      role: user.role,
      loginId: user.login_id,
    });

    const response = NextResponse.json({
      success: true,
      redirect: getHomeForRole(user.role),
      user: { namaUser: user.nama_user, role: user.role },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 jam
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan, coba lagi" },
      { status: 500 }
    );
  }
}
