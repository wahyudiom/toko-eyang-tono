import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getExpenses, createExpense } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const expenses = await getExpenses();
    return NextResponse.json(expenses);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengambil data pengeluaran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { tanggal, kategori, kategori_lainnya, nominal, penerima_uang, notes } = body;

    if (!tanggal || !kategori || !nominal || !penerima_uang) {
      return NextResponse.json({ error: "Field wajib tidak lengkap" }, { status: 400 });
    }
    if (kategori === "Lainnya" && !kategori_lainnya?.trim()) {
      return NextResponse.json({ error: "Kategori lainnya wajib diisi" }, { status: 400 });
    }
    const nominalNum = parseFloat(nominal);
    if (isNaN(nominalNum) || nominalNum <= 0) {
      return NextResponse.json({ error: "Nominal harus lebih besar dari 0" }, { status: 400 });
    }

    const expense = await createExpense({
      tanggal,
      kategori,
      kategori_lainnya: kategori_lainnya || "",
      nominal: nominalNum,
      penerima_uang,
      notes: notes || "",
      created_by: user.namaUser,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal menyimpan pengeluaran" }, { status: 500 });
  }
}
