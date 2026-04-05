import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAllStock, createStockItem } from "@/lib/sheets";
import { generateItemId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const stock = await getAllStock();
    return NextResponse.json(stock);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengambil data stok" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "kasir") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { nama_barang, tanggal_masuk, jumlah_stok, notes, harga_jual, harga_modal } = body;

    if (!nama_barang || jumlah_stok === undefined || !harga_jual || !harga_modal) {
      return NextResponse.json({ error: "Field wajib tidak lengkap" }, { status: 400 });
    }
    if (parseInt(jumlah_stok) < 0) {
      return NextResponse.json({ error: "Jumlah stok tidak boleh negatif" }, { status: 400 });
    }

    const id_barang = generateItemId();
    await createStockItem({
      id_barang,
      nama_barang: nama_barang.trim(),
      tanggal_masuk: tanggal_masuk || new Date().toISOString().slice(0, 10),
      jumlah_stok: parseInt(jumlah_stok),
      notes: notes?.trim() || "",
      harga_jual: parseInt(harga_jual),
      harga_modal: parseInt(harga_modal),
      created_by: user.namaUser,
    });

    return NextResponse.json({ success: true, id_barang }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal menambah barang" }, { status: 500 });
  }
}
