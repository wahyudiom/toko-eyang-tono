import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDashboardData } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengambil data dashboard" }, { status: 500 });
  }
}
