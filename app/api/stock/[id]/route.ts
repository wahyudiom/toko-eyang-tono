import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { updateStockItem, deleteStockItem } from "@/lib/sheets";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "kasir") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { nama_barang, tanggal_masuk, jumlah_stok, notes, harga_jual, harga_modal } = body;

    await updateStockItem(params.id, {
      nama_barang: nama_barang?.trim(),
      tanggal_masuk,
      jumlah_stok: jumlah_stok !== undefined ? parseInt(jumlah_stok) : undefined,
      notes: notes?.trim(),
      harga_jual: harga_jual !== undefined ? parseInt(harga_jual) : undefined,
      harga_modal: harga_modal !== undefined ? parseInt(harga_modal) : undefined,
      updated_by: user.namaUser,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal mengupdate barang";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "kasir") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await deleteStockItem(params.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus barang";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
