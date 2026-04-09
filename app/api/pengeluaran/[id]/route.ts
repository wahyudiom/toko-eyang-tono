import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { updateExpense, deleteExpense } from "@/lib/sheets";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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

    await updateExpense(params.id, {
      tanggal,
      kategori,
      kategori_lainnya: kategori_lainnya || "",
      nominal: nominalNum,
      penerima_uang,
      notes: notes || "",
      updated_by: user.namaUser,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengupdate pengeluaran" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await deleteExpense(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal menghapus pengeluaran" }, { status: 500 });
  }
}
