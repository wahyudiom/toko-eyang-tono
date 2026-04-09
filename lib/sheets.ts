import { google } from "googleapis";
import { nowISO } from "./utils";

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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockItem {
  id_barang: string;
  nama_barang: string;
  tanggal_masuk: string;
  jumlah_stok: number;
  status_barang: string;
  notes: string;
  harga_jual: number;
  harga_modal: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface TransactionItem {
  id_barang: string;
  nama_barang: string;
  qty: number;
  harga_jual: number;
  harga_modal: number;
  total_item: number;
}

export interface Transaction {
  id_transaksi: string;
  tanggal_transaksi: string;
  items: TransactionItem[];
  total_transaksi: number;
  metode_pembayaran: string;
  nama_pembeli: string;
  no_hp_pembeli: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToStock(row: string[]): StockItem {
  return {
    id_barang: row[0] || "",
    nama_barang: row[1] || "",
    tanggal_masuk: row[2] || "",
    jumlah_stok: parseInt(row[3] || "0"),
    status_barang: row[4] || "out of stock",
    notes: row[5] || "",
    harga_jual: parseInt(row[6] || "0"),
    harga_modal: parseInt(row[7] || "0"),
    created_at: row[8] || "",
    updated_at: row[9] || "",
    created_by: row[10] || "",
    updated_by: row[11] || "",
  };
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function findUserByLoginId(loginId: string) {
  const sheets = createSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "users!A:H",
  });
  const rows = res.data.values || [];
  const row = rows
    .slice(1)
    .find((r) => r[3] === loginId && r[7]?.toLowerCase() === "aktif");
  if (!row) return null;
  return {
    user_id: row[0],
    nama_user: row[1],
    role: row[2] as "owner" | "kasir" | "gudang",
    login_id: row[3],
    password: row[4],
    created_at: row[5],
    updated_at: row[6],
    status_aktif: row[7],
  };
}

// ─── Stock ────────────────────────────────────────────────────────────────────

export async function getAllStock(): Promise<StockItem[]> {
  const sheets = createSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "stock_barang!A:L",
  });
  const rows = res.data.values || [];
  return rows
    .slice(1)
    .filter((r) => r[0])
    .map((r) => rowToStock(r as string[]));
}

export async function createStockItem(data: {
  id_barang: string;
  nama_barang: string;
  tanggal_masuk: string;
  jumlah_stok: number;
  notes: string;
  harga_jual: number;
  harga_modal: number;
  created_by: string;
}): Promise<void> {
  const sheets = createSheetsClient();
  const status = data.jumlah_stok > 0 ? "tersedia" : "out of stock";
  const ts = nowISO();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "stock_barang!A:L",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          data.id_barang,
          data.nama_barang,
          data.tanggal_masuk,
          data.jumlah_stok,
          status,
          data.notes,
          data.harga_jual,
          data.harga_modal,
          ts,
          ts,
          data.created_by,
          data.created_by,
        ],
      ],
    },
  });
}

export async function updateStockItem(
  id_barang: string,
  data: {
    nama_barang?: string;
    tanggal_masuk?: string;
    jumlah_stok?: number;
    notes?: string;
    harga_jual?: number;
    harga_modal?: number;
    updated_by: string;
  }
): Promise<void> {
  const sheets = createSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "stock_barang!A:L",
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === id_barang);
  if (rowIndex === -1) throw new Error("Barang tidak ditemukan");

  const cur = rows[rowIndex] as string[];
  const jumlah_stok =
    data.jumlah_stok !== undefined ? data.jumlah_stok : parseInt(cur[3] || "0");
  const status = jumlah_stok > 0 ? "tersedia" : "out of stock";
  const ts = nowISO();

  const sheetRow = rowIndex + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `stock_barang!A${sheetRow}:L${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          cur[0],
          data.nama_barang ?? cur[1],
          data.tanggal_masuk ?? cur[2],
          jumlah_stok,
          status,
          data.notes !== undefined ? data.notes : cur[5],
          data.harga_jual !== undefined ? data.harga_jual : parseInt(cur[6] || "0"),
          data.harga_modal !== undefined ? data.harga_modal : parseInt(cur[7] || "0"),
          cur[8],
          ts,
          cur[10],
          data.updated_by,
        ],
      ],
    },
  });
}

export async function deleteStockItem(id_barang: string): Promise<void> {
  const sheets = createSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "stock_barang!A:A",
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === id_barang);
  if (rowIndex === -1) throw new Error("Barang tidak ditemukan");

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === "stock_barang"
  );
  if (!sheet) throw new Error("Sheet stock_barang tidak ditemukan");

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties?.sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getAllTransactions(): Promise<Transaction[]> {
  const sheets = createSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "transaksi_penjualan!A:P",
  });
  const rows = (res.data.values || []).slice(1).filter((r) => r[0]);
  return groupTransactionRows(rows as string[][]);
}

function groupTransactionRows(rows: string[][]): Transaction[] {
  const map = new Map<string, Transaction>();
  for (const r of rows) {
    const id = r[0];
    const item: TransactionItem = {
      id_barang: r[2],
      nama_barang: r[3],
      qty: parseInt(r[4] || "0"),
      harga_jual: parseInt(r[5] || "0"),
      harga_modal: parseInt(r[6] || "0"),
      total_item: parseInt(r[7] || "0"),
    };
    if (!map.has(id)) {
      map.set(id, {
        id_transaksi: id,
        tanggal_transaksi: r[1],
        items: [],
        total_transaksi: parseInt(r[8] || "0"),
        metode_pembayaran: r[9] || "",
        nama_pembeli: r[10] || "",
        no_hp_pembeli: r[11] || "",
        created_at: r[12] || "",
        updated_at: r[13] || "",
        created_by: r[14] || "",
        updated_by: r[15] || "",
      });
    }
    map.get(id)!.items.push(item);
  }
  return Array.from(map.values()).reverse();
}

export async function createTransaction(data: {
  id_transaksi: string;
  tanggal_transaksi: string;
  items: TransactionItem[];
  total_transaksi: number;
  metode_pembayaran: string;
  nama_pembeli: string;
  no_hp_pembeli: string;
  created_by: string;
}): Promise<void> {
  const sheets = createSheetsClient();

  // Load current stock
  const stockRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "stock_barang!A:L",
  });
  const stockRows = stockRes.data.values || [];

  // Validate stock for all items
  for (const item of data.items) {
    const stockRow = stockRows.find((r, i) => i > 0 && r[0] === item.id_barang) as
      | string[]
      | undefined;
    if (!stockRow) throw new Error(`Barang "${item.nama_barang}" tidak ditemukan`);
    const currentStok = parseInt(stockRow[3] || "0");
    if (currentStok < item.qty) {
      throw new Error(
        `Stok "${item.nama_barang}" tidak mencukupi (tersedia: ${currentStok}, diminta: ${item.qty})`
      );
    }
  }

  const ts = nowISO();

  // Append transaction rows (one row per item)
  const transactionRows = data.items.map((item) => [
    data.id_transaksi,
    data.tanggal_transaksi,
    item.id_barang,
    item.nama_barang,
    item.qty,
    item.harga_jual,
    item.harga_modal,
    item.total_item,
    data.total_transaksi,
    data.metode_pembayaran,
    data.nama_pembeli,
    data.no_hp_pembeli,
    ts,
    ts,
    data.created_by,
    data.created_by,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "transaksi_penjualan!A:P",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: transactionRows },
  });

  // Update stock for each item
  const batchData: { range: string; values: (string | number)[][] }[] = [];
  for (const item of data.items) {
    const rowIndex = stockRows.findIndex(
      (r, i) => i > 0 && r[0] === item.id_barang
    );
    if (rowIndex === -1) continue;
    const cur = stockRows[rowIndex] as string[];
    const newStok = parseInt(cur[3] || "0") - item.qty;
    const newStatus = newStok > 0 ? "tersedia" : "out of stock";
    const sheetRow = rowIndex + 1;
    batchData.push(
      { range: `stock_barang!D${sheetRow}:E${sheetRow}`, values: [[newStok, newStatus]] },
      { range: `stock_barang!J${sheetRow}`, values: [[ts]] },
      { range: `stock_barang!L${sheetRow}`, values: [[data.created_by]] }
    );
  }

  if (batchData.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: "USER_ENTERED", data: batchData },
    });
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardData() {
  const sheets = createSheetsClient();
  const [stockRes, transRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "stock_barang!A:L",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "transaksi_penjualan!A:P",
    }),
  ]);

  const stockRows = (stockRes.data.values || [])
    .slice(1)
    .filter((r) => r[0]) as string[][];
  const transRows = (transRes.data.values || [])
    .slice(1)
    .filter((r) => r[0]) as string[][];

  const totalStokAktif = stockRows.filter((r) => r[4] === "tersedia").length;
  const totalBarangMasuk = stockRows.length;
  const totalBarangTerjual = transRows.reduce(
    (sum, r) => sum + parseInt(r[4] || "0"),
    0
  );

  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = now.getMonth();
  const todayD = now.getDate();

  const seenTrx = new Set<string>();
  const seenTrxHariIni = new Set<string>();
  const seenTrxBulanIni = new Set<string>();
  let omzet = 0;
  let omzetHariIni = 0;
  let omzetBulanIni = 0;
  let labaHariIni = 0;
  let labaBulanIni = 0;
  let terjualHariIni = 0;
  let terjualBulanIni = 0;

  for (const r of transRows) {
    const idTrx = r[0];
    const total = parseInt(r[8] || "0");
    const qty = parseInt(r[4] || "0");
    const labaItem = (parseInt(r[5] || "0") - parseInt(r[6] || "0")) * qty;
    const txDate = new Date(r[1]);

    if (!seenTrx.has(idTrx)) {
      seenTrx.add(idTrx);
      omzet += total;
    }

    const isToday =
      !isNaN(txDate.getTime()) &&
      txDate.getFullYear() === todayY &&
      txDate.getMonth() === todayM &&
      txDate.getDate() === todayD;

    const isThisMonth =
      !isNaN(txDate.getTime()) &&
      txDate.getFullYear() === todayY &&
      txDate.getMonth() === todayM;

    if (isToday) {
      if (!seenTrxHariIni.has(idTrx)) {
        seenTrxHariIni.add(idTrx);
        omzetHariIni += total;
      }
      labaHariIni += labaItem;
      terjualHariIni += qty;
    }

    if (isThisMonth) {
      if (!seenTrxBulanIni.has(idTrx)) {
        seenTrxBulanIni.add(idTrx);
        omzetBulanIni += total;
      }
      labaBulanIni += labaItem;
      terjualBulanIni += qty;
    }
  }

  const laba = transRows.reduce((sum, r) => {
    return sum + (parseInt(r[5] || "0") - parseInt(r[6] || "0")) * parseInt(r[4] || "0");
  }, 0);

  const transaksiTerbaru = groupTransactionRows(transRows);

  return {
    total_stok_aktif: totalStokAktif,
    total_barang_masuk: totalBarangMasuk,
    total_barang_terjual: totalBarangTerjual,
    omzet,
    omzet_hari_ini: omzetHariIni,
    omzet_bulan_ini: omzetBulanIni,
    laba,
    laba_hari_ini: labaHariIni,
    laba_bulan_ini: labaBulanIni,
    terjual_hari_ini: terjualHariIni,
    terjual_bulan_ini: terjualBulanIni,
    transaksi_terbaru: transaksiTerbaru,
  };
}

// ─── Pengeluaran (Expense) ─────────────────────────────────────────────────────

export interface Expense {
  id_expense: string;
  tanggal: string;
  kategori: string;
  kategori_lainnya: string;
  nominal: number;
  penerima_uang: string;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

function rowToExpense(r: string[]): Expense {
  return {
    id_expense: r[0] || "",
    tanggal: r[1] || "",
    kategori: r[2] || "",
    kategori_lainnya: r[3] || "",
    nominal: parseFloat(r[4] || "0"),
    penerima_uang: r[5] || "",
    notes: r[6] || "",
    created_at: r[7] || "",
    updated_at: r[8] || "",
    created_by: r[9] || "",
    updated_by: r[10] || "",
  };
}

export async function getExpenses(): Promise<Expense[]> {
  const sheets = createSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "expense!A:K",
  });
  const rows = (res.data.values || []).slice(1).filter((r) => r[0]) as string[][];
  return rows.map(rowToExpense).reverse(); // newest first
}

export async function createExpense(data: {
  tanggal: string;
  kategori: string;
  kategori_lainnya: string;
  nominal: number;
  penerima_uang: string;
  notes: string;
  created_by: string;
}): Promise<Expense> {
  const sheets = createSheetsClient();
  const ts = new Date().toISOString();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const id = `EXP-${ts.slice(0, 10).replace(/-/g, "")}-${rand}`;

  const row = [
    id,
    data.tanggal,
    data.kategori,
    data.kategori_lainnya,
    data.nominal,
    data.penerima_uang,
    data.notes,
    ts,
    ts,
    data.created_by,
    data.created_by,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "expense!A:K",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  return rowToExpense(row.map(String));
}

export async function updateExpense(
  id: string,
  data: {
    tanggal: string;
    kategori: string;
    kategori_lainnya: string;
    nominal: number;
    penerima_uang: string;
    notes: string;
    updated_by: string;
  }
): Promise<void> {
  const sheets = createSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "expense!A:K",
  });
  const rows = (res.data.values || []) as string[][];
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === id);
  if (rowIndex === -1) throw new Error("Data pengeluaran tidak ditemukan");

  const sheetRow = rowIndex + 1;
  const ts = new Date().toISOString();
  const existing = rows[rowIndex];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `expense!A${sheetRow}:K${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        id,
        data.tanggal,
        data.kategori,
        data.kategori_lainnya,
        data.nominal,
        data.penerima_uang,
        data.notes,
        existing[7] || ts,        // created_at — unchanged
        ts,                        // updated_at
        existing[9] || data.updated_by, // created_by — unchanged
        data.updated_by,           // updated_by
      ]],
    },
  });
}

export async function deleteExpense(id: string): Promise<void> {
  const sheets = createSheetsClient();

  const [dataRes, spreadsheetRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "expense!A:A",
    }),
    sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID }),
  ]);

  const rows = (dataRes.data.values || []) as string[][];
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === id);
  if (rowIndex === -1) throw new Error("Data pengeluaran tidak ditemukan");

  const sheet = spreadsheetRes.data.sheets?.find(
    (s) => s.properties?.title === "expense"
  );
  if (!sheet?.properties?.sheetId === undefined)
    throw new Error("Sheet expense tidak ditemukan");

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet!.properties!.sheetId!,
            dimension: "ROWS",
            startIndex: rowIndex,       // 0-based; rowIndex already skips header
            endIndex: rowIndex + 1,
          },
        },
      }],
    },
  });
}
