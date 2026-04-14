import { google } from "googleapis";
import { nowISO } from "./utils";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;
const STOCK_RANGE = "stock_barang!A:M";
const STOCK_TOTAL_COLUMN_INDEX = 12;
const STOCK_HEADERS = [
  "id_barang",
  "nama_barang",
  "tanggal_masuk",
  "jumlah_stok",
  "status_barang",
  "notes",
  "harga_jual",
  "harga_modal",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "stok_masuk_total",
];

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

// Types

export interface StockItem {
  id_barang: string;
  nama_barang: string;
  tanggal_masuk: string;
  jumlah_stok: number;
  stok_masuk_total: number;
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

interface StockSheetRecord {
  rowNumber: number;
  row: string[];
  soldQty: number;
  item: StockItem;
}

// Helpers

function parseInteger(value?: string) {
  return parseInt(value || "0", 10);
}

function parseDecimal(value?: string) {
  return parseFloat(value || "0");
}

function setRowValue(row: string[], index: number, value: string) {
  while (row.length <= index) row.push("");
  row[index] = value;
}

function getStockMasukTotal(row: string[]) {
  return parseInteger(row[STOCK_TOTAL_COLUMN_INDEX] || row[3]);
}

function getStockStatus(jumlahStok: number) {
  return jumlahStok > 0 ? "tersedia" : "out of stock";
}

function buildSoldQtyMap(rows: string[][]) {
  const soldQtyMap = new Map<string, number>();

  for (const row of rows) {
    const idBarang = row[2];
    if (!idBarang) continue;
    soldQtyMap.set(idBarang, (soldQtyMap.get(idBarang) || 0) + parseInteger(row[4]));
  }

  return soldQtyMap;
}

function rowToStock(row: string[], soldQty = 0): StockItem {
  const stok_masuk_total = getStockMasukTotal(row);
  const jumlah_stok = stok_masuk_total - soldQty;

  return {
    id_barang: row[0] || "",
    nama_barang: row[1] || "",
    tanggal_masuk: row[2] || "",
    jumlah_stok,
    stok_masuk_total,
    status_barang: getStockStatus(jumlah_stok),
    notes: row[5] || "",
    harga_jual: parseInteger(row[6]),
    harga_modal: parseInteger(row[7]),
    created_at: row[8] || "",
    updated_at: row[9] || "",
    created_by: row[10] || "",
    updated_by: row[11] || "",
  };
}

function rowToExpense(row: string[]): Expense {
  return {
    id_expense: row[0] || "",
    tanggal: row[1] || "",
    kategori: row[2] || "",
    kategori_lainnya: row[3] || "",
    nominal: parseDecimal(row[4]),
    penerima_uang: row[5] || "",
    notes: row[6] || "",
    created_at: row[7] || "",
    updated_at: row[8] || "",
    created_by: row[9] || "",
    updated_by: row[10] || "",
  };
}

async function getStockSheetRows(sheets: ReturnType<typeof createSheetsClient>) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: STOCK_RANGE,
  });
  return (res.data.values || []) as string[][];
}

async function getTransactionSheetRows(sheets: ReturnType<typeof createSheetsClient>) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "transaksi_penjualan!A:P",
  });
  return (res.data.values || []) as string[][];
}

function getTransactionDataRows(rows: string[][]) {
  return rows.slice(1).filter((row) => row[0]) as string[][];
}

async function ensureStockSheetReady(
  sheets: ReturnType<typeof createSheetsClient>,
  stockRowsInput?: string[][],
  transactionRowsInput?: string[][]
) {
  const stockRows = stockRowsInput ?? (await getStockSheetRows(sheets));

  if (stockRows.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: STOCK_RANGE,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [STOCK_HEADERS],
      },
    });

    return {
      stockRows: [Array.from(STOCK_HEADERS)],
      transactionRows: transactionRowsInput ?? (await getTransactionSheetRows(sheets)),
    };
  }

  const header = stockRows[0];
  const hasStockTotalColumn = header?.[STOCK_TOTAL_COLUMN_INDEX] === "stok_masuk_total";
  if (hasStockTotalColumn) {
    return { stockRows, transactionRows: transactionRowsInput };
  }

  const transactionRows = transactionRowsInput ?? (await getTransactionSheetRows(sheets));
  const soldQtyMap = buildSoldQtyMap(getTransactionDataRows(transactionRows));
  const updates: { range: string; values: (string | number)[][] }[] = [];

  setRowValue(header, STOCK_TOTAL_COLUMN_INDEX, "stok_masuk_total");
  updates.push({
    range: "stock_barang!M1",
    values: [["stok_masuk_total"]],
  });

  for (let index = 1; index < stockRows.length; index += 1) {
    const row = stockRows[index];
    if (!row?.[0]) continue;

    const stokSisaSaatIni = parseInteger(row[3]);
    const soldQty = soldQtyMap.get(row[0]) || 0;
    const stokMasukTotal = stokSisaSaatIni + soldQty;

    setRowValue(row, STOCK_TOTAL_COLUMN_INDEX, String(stokMasukTotal));
    updates.push({
      range: `stock_barang!M${index + 1}`,
      values: [[stokMasukTotal]],
    });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: updates,
    },
  });

  return { stockRows, transactionRows };
}

function buildStockRecords(stockRows: string[][], transactionRows: string[][]) {
  const soldQtyMap = buildSoldQtyMap(getTransactionDataRows(transactionRows));

  return stockRows
    .slice(1)
    .map((row, index) => {
      if (!row[0]) return null;

      const soldQty = soldQtyMap.get(row[0]) || 0;
      return {
        rowNumber: index + 2,
        row,
        soldQty,
        item: rowToStock(row, soldQty),
      };
    })
    .filter((record): record is StockSheetRecord => record !== null);
}

async function syncStockRecords(
  sheets: ReturnType<typeof createSheetsClient>,
  records: StockSheetRecord[],
  updatedBy?: string
) {
  const ts = nowISO();
  const updates: { range: string; values: (string | number)[][] }[] = [];

  for (const record of records) {
    const currentJumlahStok = parseInteger(record.row[3]);
    const currentStatus = record.row[4] || "out of stock";
    const currentStokMasukTotal = getStockMasukTotal(record.row);
    const nextJumlahStok = record.item.jumlah_stok;
    const nextStatus = record.item.status_barang;
    const nextStokMasukTotal = record.item.stok_masuk_total;

    const stockChanged =
      currentJumlahStok !== nextJumlahStok ||
      currentStatus !== nextStatus ||
      currentStokMasukTotal !== nextStokMasukTotal;

    if (!stockChanged) continue;

    updates.push({
      range: `stock_barang!D${record.rowNumber}:E${record.rowNumber}`,
      values: [[nextJumlahStok, nextStatus]],
    });
    updates.push({
      range: `stock_barang!M${record.rowNumber}`,
      values: [[nextStokMasukTotal]],
    });

    setRowValue(record.row, 3, String(nextJumlahStok));
    setRowValue(record.row, 4, nextStatus);
    setRowValue(record.row, STOCK_TOTAL_COLUMN_INDEX, String(nextStokMasukTotal));

    if (updatedBy) {
      updates.push({
        range: `stock_barang!J${record.rowNumber}`,
        values: [[ts]],
      });
      updates.push({
        range: `stock_barang!L${record.rowNumber}`,
        values: [[updatedBy]],
      });
      setRowValue(record.row, 9, ts);
      setRowValue(record.row, 11, updatedBy);
    }
  }

  if (updates.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: updates,
    },
  });
}

async function getSyncedStockRecords(
  sheets: ReturnType<typeof createSheetsClient>,
  options?: {
    stockRows?: string[][];
    transactionRows?: string[][];
    updatedBy?: string;
  }
) {
  const ensured = await ensureStockSheetReady(
    sheets,
    options?.stockRows,
    options?.transactionRows
  );
  const transactionRows = ensured.transactionRows ?? (await getTransactionSheetRows(sheets));
  const records = buildStockRecords(ensured.stockRows, transactionRows);
  await syncStockRecords(sheets, records, options?.updatedBy);
  return records;
}

function groupTransactionRows(rows: string[][]): Transaction[] {
  const map = new Map<string, Transaction>();

  for (const row of rows) {
    const id = row[0];
    const item: TransactionItem = {
      id_barang: row[2],
      nama_barang: row[3],
      qty: parseInteger(row[4]),
      harga_jual: parseInteger(row[5]),
      harga_modal: parseInteger(row[6]),
      total_item: parseInteger(row[7]),
    };

    if (!map.has(id)) {
      map.set(id, {
        id_transaksi: id,
        tanggal_transaksi: row[1],
        items: [],
        total_transaksi: parseInteger(row[8]),
        metode_pembayaran: row[9] || "",
        nama_pembeli: row[10] || "",
        no_hp_pembeli: row[11] || "",
        created_at: row[12] || "",
        updated_at: row[13] || "",
        created_by: row[14] || "",
        updated_by: row[15] || "",
      });
    }

    map.get(id)!.items.push(item);
  }

  return Array.from(map.values()).reverse();
}

// Users

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

// Stock

export async function getAllStock(): Promise<StockItem[]> {
  const sheets = createSheetsClient();
  const records = await getSyncedStockRecords(sheets);
  return records.map((record) => record.item);
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
  await ensureStockSheetReady(sheets);

  const ts = nowISO();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: STOCK_RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          data.id_barang,
          data.nama_barang,
          data.tanggal_masuk,
          data.jumlah_stok,
          getStockStatus(data.jumlah_stok),
          data.notes,
          data.harga_jual,
          data.harga_modal,
          ts,
          ts,
          data.created_by,
          data.created_by,
          data.jumlah_stok,
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
  const records = await getSyncedStockRecords(sheets);
  const record = records.find((item) => item.item.id_barang === id_barang);

  if (!record) throw new Error("Barang tidak ditemukan");

  const stokMasukTotalBaru = record.item.stok_masuk_total + (data.jumlah_stok ?? 0);
  const jumlah_stok = stokMasukTotalBaru - record.soldQty;
  const status = getStockStatus(jumlah_stok);
  const ts = nowISO();

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `stock_barang!A${record.rowNumber}:M${record.rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          record.row[0],
          data.nama_barang ?? record.row[1],
          data.tanggal_masuk ?? record.row[2],
          jumlah_stok,
          status,
          data.notes !== undefined ? data.notes : record.row[5],
          data.harga_jual !== undefined ? data.harga_jual : parseInteger(record.row[6]),
          data.harga_modal !== undefined ? data.harga_modal : parseInteger(record.row[7]),
          record.row[8],
          ts,
          record.row[10],
          data.updated_by,
          stokMasukTotalBaru,
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
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id_barang);

  if (rowIndex === -1) throw new Error("Barang tidak ditemukan");

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheet = spreadsheet.data.sheets?.find(
    (item) => item.properties?.title === "stock_barang"
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

// Transactions

export async function getAllTransactions(): Promise<Transaction[]> {
  const sheets = createSheetsClient();
  const rows = getTransactionDataRows(await getTransactionSheetRows(sheets));
  return groupTransactionRows(rows);
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
  const stockRecords = await getSyncedStockRecords(sheets);
  const stockMap = new Map(stockRecords.map((record) => [record.item.id_barang, record.item]));
  const requestedQtyMap = new Map<string, number>();

  for (const item of data.items) {
    requestedQtyMap.set(
      item.id_barang,
      (requestedQtyMap.get(item.id_barang) || 0) + item.qty
    );
  }

  for (const item of data.items) {
    const stockItem = stockMap.get(item.id_barang);
    if (!stockItem) throw new Error(`Barang "${item.nama_barang}" tidak ditemukan`);

    const requestedQty = requestedQtyMap.get(item.id_barang) || 0;
    if (stockItem.jumlah_stok < requestedQty) {
      throw new Error(
        `Stok "${item.nama_barang}" tidak mencukupi (tersedia: ${stockItem.jumlah_stok}, diminta: ${requestedQty})`
      );
    }
  }

  const ts = nowISO();
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

  await getSyncedStockRecords(sheets, { updatedBy: data.created_by });
}

// Dashboard

export async function getDashboardData() {
  const sheets = createSheetsClient();
  const [transRes, expenseRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "transaksi_penjualan!A:P",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "expense!A:K",
    }),
  ]);

  const transSheetRows = (transRes.data.values || []) as string[][];
  const stockItems = (
    await getSyncedStockRecords(sheets, { transactionRows: transSheetRows })
  ).map((record) => record.item);
  const transRows = getTransactionDataRows(transSheetRows);
  const expenseRows = (expenseRes.data.values || [])
    .slice(1)
    .filter((row) => row[0]) as string[][];

  const totalStokAktif = stockItems.filter(
    (item) => item.status_barang === "tersedia"
  ).length;
  const totalBarangMasuk = stockItems.length;
  const totalBarangTerjual = transRows.reduce(
    (sum, row) => sum + parseInteger(row[4]),
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
  let labaKotor = 0;
  let labaKotorHariIni = 0;
  let labaKotorBulanIni = 0;
  let terjualHariIni = 0;
  let terjualBulanIni = 0;
  let pengeluaran = 0;
  let pengeluaranHariIni = 0;
  let pengeluaranBulanIni = 0;

  for (const row of transRows) {
    const idTrx = row[0];
    const total = parseInteger(row[8]);
    const qty = parseInteger(row[4]);
    const labaItem = (parseInteger(row[5]) - parseInteger(row[6])) * qty;
    const txDate = new Date(row[1]);
    labaKotor += labaItem;

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
      labaKotorHariIni += labaItem;
      terjualHariIni += qty;
    }

    if (isThisMonth) {
      if (!seenTrxBulanIni.has(idTrx)) {
        seenTrxBulanIni.add(idTrx);
        omzetBulanIni += total;
      }
      labaKotorBulanIni += labaItem;
      terjualBulanIni += qty;
    }
  }

  for (const row of expenseRows) {
    const nominal = parseDecimal(row[4]);
    const expenseDate = new Date(row[1]);
    pengeluaran += nominal;

    const isToday =
      !isNaN(expenseDate.getTime()) &&
      expenseDate.getFullYear() === todayY &&
      expenseDate.getMonth() === todayM &&
      expenseDate.getDate() === todayD;

    const isThisMonth =
      !isNaN(expenseDate.getTime()) &&
      expenseDate.getFullYear() === todayY &&
      expenseDate.getMonth() === todayM;

    if (isToday) {
      pengeluaranHariIni += nominal;
    }

    if (isThisMonth) {
      pengeluaranBulanIni += nominal;
    }
  }

  const transaksiTerbaru = groupTransactionRows(transRows);

  return {
    total_stok_aktif: totalStokAktif,
    total_barang_masuk: totalBarangMasuk,
    total_barang_terjual: totalBarangTerjual,
    omzet,
    omzet_hari_ini: omzetHariIni,
    omzet_bulan_ini: omzetBulanIni,
    pengeluaran,
    pengeluaran_hari_ini: pengeluaranHariIni,
    pengeluaran_bulan_ini: pengeluaranBulanIni,
    laba: labaKotor - pengeluaran,
    laba_hari_ini: labaKotorHariIni - pengeluaranHariIni,
    laba_bulan_ini: labaKotorBulanIni - pengeluaranBulanIni,
    terjual_hari_ini: terjualHariIni,
    terjual_bulan_ini: terjualBulanIni,
    transaksi_terbaru: transaksiTerbaru,
  };
}

// Pengeluaran

export async function getExpenses(): Promise<Expense[]> {
  const sheets = createSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "expense!A:K",
  });
  const rows = (res.data.values || []).slice(1).filter((row) => row[0]) as string[][];
  return rows.map(rowToExpense).reverse();
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
  const ts = nowISO();
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
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id);

  if (rowIndex === -1) throw new Error("Data pengeluaran tidak ditemukan");

  const sheetRow = rowIndex + 1;
  const ts = nowISO();
  const existing = rows[rowIndex];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `expense!A${sheetRow}:K${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          id,
          data.tanggal,
          data.kategori,
          data.kategori_lainnya,
          data.nominal,
          data.penerima_uang,
          data.notes,
          existing[7] || ts,
          ts,
          existing[9] || data.updated_by,
          data.updated_by,
        ],
      ],
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
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id);
  if (rowIndex === -1) throw new Error("Data pengeluaran tidak ditemukan");

  const sheet = spreadsheetRes.data.sheets?.find(
    (item) => item.properties?.title === "expense"
  );
  if (sheet?.properties?.sheetId === undefined) {
    throw new Error("Sheet expense tidak ditemukan");
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
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
