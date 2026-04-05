import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAllTransactions, createTransaction } from "@/lib/sheets";
import { generateTransactionId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "kasir") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const transactions = await getAllTransactions();
    return NextResponse.json(transactions);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengambil histori transaksi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "gudang") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { items, nama_pembeli, no_hp_pembeli, metode_pembayaran } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Tidak ada item transaksi" }, { status: 400 });
    }
    if (!nama_pembeli || !metode_pembayaran) {
      return NextResponse.json({ error: "Data pembeli dan metode pembayaran wajib diisi" }, { status: 400 });
    }

    // Validate each item
    for (const item of items) {
      if (!item.id_barang || !item.qty || item.qty <= 0) {
        return NextResponse.json({ error: "Data item tidak valid" }, { status: 400 });
      }
    }

    const total_transaksi = items.reduce(
      (sum: number, item: { total_item: number }) => sum + item.total_item,
      0
    );

    const id_transaksi = generateTransactionId();
    const tanggal_transaksi = new Date().toISOString();

    await createTransaction({
      id_transaksi,
      tanggal_transaksi,
      items,
      total_transaksi,
      metode_pembayaran,
      nama_pembeli: nama_pembeli.trim(),
      no_hp_pembeli: no_hp_pembeli?.trim() || "",
      created_by: user.namaUser,
    });

    return NextResponse.json({ success: true, id_transaksi }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menyimpan transaksi";
    console.error(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
