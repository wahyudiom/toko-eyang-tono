import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { google } from "googleapis";
import { getAllStock } from "@/lib/sheets";

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
    const [transRes, stockItems, expenseRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "transaksi_penjualan!A:P",
      }),
      getAllStock(),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "expense!A:K",
      }),
    ]);

    const transRows = (transRes.data.values || []).slice(1).filter((r) => r[0]) as string[][];
    const expenseRows = (expenseRes.data.values || []).slice(1).filter((r) => r[0]) as string[][];

    const getBucketKey = (date: Date) =>
      groupByMonth
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const omzetMap = new Map<string, number>();
    const labaKotorMap = new Map<string, number>();
    const pengeluaranMap = new Map<string, number>();
    const seenTrx = new Set<string>();

    for (const r of transRows) {
      const rawDate = r[1];
      if (!rawDate) continue;

      const txDate = new Date(rawDate);
      if (isNaN(txDate.getTime())) continue;
      if (txDate < fromDate || txDate > toDate) continue;

      const key = getBucketKey(txDate);
      const idTrx = r[0];
      if (!seenTrx.has(idTrx)) {
        seenTrx.add(idTrx);
        const totalTrx = parseInt(r[8] || "0");
        omzetMap.set(key, (omzetMap.get(key) || 0) + totalTrx);
      }

      const qty = parseInt(r[4] || "0");
      const hargaJual = parseInt(r[5] || "0");
      const hargaModal = parseInt(r[6] || "0");
      const labaItem = (hargaJual - hargaModal) * qty;
      labaKotorMap.set(key, (labaKotorMap.get(key) || 0) + labaItem);
    }

    for (const r of expenseRows) {
      const rawDate = r[1];
      if (!rawDate) continue;

      const expenseDate = new Date(rawDate);
      if (isNaN(expenseDate.getTime())) continue;
      if (expenseDate < fromDate || expenseDate > toDate) continue;

      const key = getBucketKey(expenseDate);
      const nominal = parseFloat(r[4] || "0");
      pengeluaranMap.set(key, (pengeluaranMap.get(key) || 0) + nominal);
    }

    const trendData: { label: string; omzet: number; pengeluaran: number; laba: number }[] = [];
    if (groupByMonth) {
      const cur = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
      const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
      while (cur <= end) {
        const key = getBucketKey(cur);
        const pengeluaran = pengeluaranMap.get(key) || 0;
        const labaKotor = labaKotorMap.get(key) || 0;
        trendData.push({
          label: cur.toLocaleDateString("id-ID", { month: "short", year: "numeric" }),
          omzet: omzetMap.get(key) || 0,
          pengeluaran,
          laba: labaKotor - pengeluaran,
        });
        cur.setMonth(cur.getMonth() + 1);
      }
    } else {
      const cur = new Date(fromDate);
      while (cur <= toDate) {
        const key = getBucketKey(cur);
        const pengeluaran = pengeluaranMap.get(key) || 0;
        const labaKotor = labaKotorMap.get(key) || 0;
        trendData.push({
          label: cur.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
          omzet: omzetMap.get(key) || 0,
          pengeluaran,
          laba: labaKotor - pengeluaran,
        });
        cur.setDate(cur.getDate() + 1);
      }
    }

    const stokData = stockItems.map((item) => ({
      nama: item.nama_barang,
      stok: item.jumlah_stok,
      status: item.status_barang,
    }));

    const penjualanMap = new Map<string, number>();
    for (const r of transRows) {
      const rawDate = r[1];
      if (!rawDate) continue;
      const txDate = new Date(rawDate);
      if (isNaN(txDate.getTime())) continue;
      if (txDate < fromDate || txDate > toDate) continue;
      const idBarang = r[2] || "";
      const qty = parseInt(r[4] || "0");
      penjualanMap.set(idBarang, (penjualanMap.get(idBarang) || 0) + qty);
    }

    const penjualanData = stockItems
      .map((item) => ({
        nama: item.nama_barang,
        qty: penjualanMap.get(item.id_barang) || 0,
      }))
      .sort((a, b) => b.qty - a.qty);

    return NextResponse.json({ trendData, stokData, penjualanData, groupByMonth });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengambil data chart" }, { status: 500 });
  }
}
