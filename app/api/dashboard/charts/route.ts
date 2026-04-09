import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { google } from "googleapis";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

function createSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "Parameter from dan to wajib diisi" }, { status: 400 });
  }

  const fromDate = new Date(from);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 });
  }
  if (fromDate > toDate) {
    return NextResponse.json({ error: "Tanggal awal tidak boleh lebih besar dari tanggal akhir" }, { status: 400 });
  }

  const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
  const groupByMonth = diffDays > 31;

  try {
    const sheets = createSheetsClient();
    const [transRes, stockRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "transaksi_penjualan!A:P",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "stock_barang!A:L",
      }),
    ]);

    const transRows = (transRes.data.values || []).slice(1).filter((r) => r[0]) as string[][];
    const stockRows = (stockRes.data.values || []).slice(1).filter((r) => r[0]) as string[][];

    // ── Omzet & Laba chart ─────────────────────────────────────────────────
    // Group transactions by day or month, deduplicate by id_transaksi for omzet
    const omzetMap = new Map<string, number>();
    const labaMap = new Map<string, number>();
    const seenTrx = new Set<string>();

    for (const r of transRows) {
      const rawDate = r[1]; // tanggal_transaksi
      if (!rawDate) continue;

      const txDate = new Date(rawDate);
      if (isNaN(txDate.getTime())) continue;
      if (txDate < fromDate || txDate > toDate) continue;

      const key = groupByMonth
        ? `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`
        : `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}-${String(txDate.getDate()).padStart(2, "0")}`;

      // Omzet: total_transaksi, only once per id_transaksi
      const idTrx = r[0];
      if (!seenTrx.has(idTrx)) {
        seenTrx.add(idTrx);
        const totalTrx = parseInt(r[8] || "0");
        omzetMap.set(key, (omzetMap.get(key) || 0) + totalTrx);
      }

      // Laba: (harga_jual - harga_modal) * qty — per row (per item)
      const qty = parseInt(r[4] || "0");
      const hargaJual = parseInt(r[5] || "0");
      const hargaModal = parseInt(r[6] || "0");
      const labaItem = (hargaJual - hargaModal) * qty;
      labaMap.set(key, (labaMap.get(key) || 0) + labaItem);
    }

    // Fill in missing dates/months in range with 0
    const trendData: { label: string; omzet: number; laba: number }[] = [];
    if (groupByMonth) {
      const cur = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
      const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
      while (cur <= end) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
        trendData.push({
          label: cur.toLocaleDateString("id-ID", { month: "short", year: "numeric" }),
          omzet: omzetMap.get(key) || 0,
          laba: labaMap.get(key) || 0,
        });
        cur.setMonth(cur.getMonth() + 1);
      }
    } else {
      const cur = new Date(fromDate);
      while (cur <= toDate) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        trendData.push({
          label: cur.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
          omzet: omzetMap.get(key) || 0,
          laba: labaMap.get(key) || 0,
        });
        cur.setDate(cur.getDate() + 1);
      }
    }

    // ── Stok barang chart ──────────────────────────────────────────────────
    const stokData = stockRows.map((r) => ({
      nama: r[1] || "",
      stok: parseInt(r[3] || "0"),
      status: r[4] || "out of stock",
    }));

    return NextResponse.json({ trendData, stokData, groupByMonth });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengambil data chart" }, { status: 500 });
  }
}
