"use client";
import { useEffect, useState, useMemo } from "react";
import { ShoppingBag, DollarSign, BarChart2, RefreshCw, CalendarDays, Calendar, TrendingUp, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Transaction } from "@/lib/sheets";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

const STOCK_THRESHOLD = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface DashboardData {
  total_stok_aktif: number;
  total_barang_masuk: number;
  total_barang_terjual: number;
  omzet: number;
  omzet_hari_ini: number;
  omzet_bulan_ini: number;
  laba: number;
  laba_hari_ini: number;
  laba_bulan_ini: number;
  terjual_hari_ini: number;
  terjual_bulan_ini: number;
  transaksi_terbaru: Transaction[];
}

interface TrendPoint { label: string; omzet: number; laba: number; }
interface StokPoint { nama: string; stok: number; status: string; }
interface PenjualanPoint { nama: string; qty: number; }
interface ChartData {
  trendData: TrendPoint[];
  stokData: StokPoint[];
  penjualanData: PenjualanPoint[];
  groupByMonth: boolean;
}

const metodePembayaranLabel: Record<string, string> = {
  tunai: "Tunai", transfer: "Transfer", qris: "QRIS",
};

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function formatAxisCurrency(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
  return String(value);
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [range, setRange] = useState(getDefaultRange());
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState("");

  // Table filter + pagination
  const [tableSearch, setTableSearch] = useState("");
  const [tableFrom, setTableFrom] = useState("");
  const [tableTo, setTableTo] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError("Gagal memuat dashboard. Coba refresh.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCharts(from: string, to: string) {
    setChartLoading(true);
    setChartError("");
    try {
      const res = await fetch(`/api/dashboard/charts?from=${from}&to=${to}`);
      if (!res.ok) throw new Error();
      setChartData(await res.json());
    } catch {
      setChartError("Gagal memuat data chart.");
    } finally {
      setChartLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    fetchCharts(range.from, range.to);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApplyFilter() {
    fetchCharts(range.from, range.to);
  }

  function resetTablePage() {
    setCurrentPage(1);
  }

  // Derived filtered + paginated transactions (hooks must be before early returns)
  const allTrx = data?.transaksi_terbaru ?? [];

  const filteredTrx = useMemo(() => {
    let rows = allTrx;
    if (tableFrom) {
      const d = new Date(tableFrom);
      d.setHours(0, 0, 0, 0);
      rows = rows.filter((t) => new Date(t.tanggal_transaksi) >= d);
    }
    if (tableTo) {
      const d = new Date(tableTo);
      d.setHours(23, 59, 59, 999);
      rows = rows.filter((t) => new Date(t.tanggal_transaksi) <= d);
    }
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      rows = rows.filter(
        (t) =>
          t.nama_pembeli.toLowerCase().includes(q) ||
          t.items.some((i) => i.nama_barang.toLowerCase().includes(q))
      );
    }
    return rows;
  }, [allTrx, tableFrom, tableTo, tableSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredTrx.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTrx = filteredTrx.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (loading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-sm">{error}</p>
        <button onClick={fetchData} className="btn-secondary mt-3">Coba Lagi</button>
      </div>
    );
  }
  if (!data) return null;

  const statsRow1 = [
    { label: "Omzet Hari Ini", value: formatCurrency(data.omzet_hari_ini), icon: CalendarDays, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Omzet Bulan Ini", value: formatCurrency(data.omzet_bulan_ini), icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Laba Hari Ini", value: formatCurrency(data.laba_hari_ini), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Laba Bulan Ini", value: formatCurrency(data.laba_bulan_ini), icon: BarChart2, color: "text-green-600", bg: "bg-green-50" },
  ];

  const statsRow2 = [
    { label: "Terjual Hari Ini", value: `${data.terjual_hari_ini} Pcs`, icon: ShoppingBag, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Terjual Bulan Ini", value: `${data.terjual_bulan_ini} Pcs`, icon: DollarSign, color: "text-yellow-600", bg: "bg-yellow-50" },
  ];

  // Pagination page numbers to show
  const pageNumbers: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (safePage > 3) pageNumbers.push("...");
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pageNumbers.push(i);
    if (safePage < totalPages - 2) pageNumbers.push("...");
    pageNumbers.push(totalPages);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Ringkasan operasional bisnis</p>
        </div>
        <button onClick={() => { fetchData(); fetchCharts(range.from, range.to); }} className="btn-secondary" disabled={loading}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats Row 1 — Omzet & Laba */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsRow1.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card">
              <div className={`inline-flex p-2 rounded-lg ${stat.bg} mb-3`}>
                <Icon size={18} className={stat.color} />
              </div>
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className="text-lg font-semibold text-gray-900 leading-tight">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Stats Row 2 — Terjual */}
      <div className="grid grid-cols-2 gap-4">
        {statsRow2.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card">
              <div className={`inline-flex p-2 rounded-lg ${stat.bg} mb-3`}>
                <Icon size={18} className={stat.color} />
              </div>
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className="text-lg font-semibold text-gray-900 leading-tight">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── Filter waktu chart ─────────────────────────────────────────────── */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="form-label">Dari Tanggal</label>
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Sampai Tanggal</label>
          <input
            type="date"
            value={range.to}
            min={range.from}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className="form-input"
          />
        </div>
        <button onClick={handleApplyFilter} className="btn-primary" disabled={chartLoading}>
          {chartLoading ? "Memuat..." : "Terapkan"}
        </button>
        {chartData && (
          <p className="text-xs text-gray-400 self-center">
            Dikelompokkan per {chartData.groupByMonth ? "bulan" : "hari"}
          </p>
        )}
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      {chartLoading ? (
        <LoadingSpinner />
      ) : chartError ? (
        <div className="card text-center py-8 text-sm text-red-600">{chartError}</div>
      ) : chartData ? (
        <>
          {/* Row 1: Omzet & Laba + Stok */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Line Chart — Omzet & Laba */}
            <div className="card p-0">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">Omzet &amp; Laba</h2>
                <p className="text-xs text-gray-400 mt-0.5">{range.from} s/d {range.to}</p>
              </div>
              <div className="p-4">
                {chartData.trendData.every((d) => d.omzet === 0 && d.laba === 0) ? (
                  <p className="text-center text-sm text-gray-400 py-10">Tidak ada transaksi di rentang tanggal ini</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData.trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={formatAxisCurrency} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={48} />
                      <Tooltip
                        formatter={(value: number, name: string) => [formatCurrency(value), name === "omzet" ? "Omzet" : "Laba"]}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      />
                      <Legend formatter={(value) => (value === "omzet" ? "Omzet" : "Laba")} wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="omzet" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="laba" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Bar Chart — Stok Barang */}
            <div className="card p-0">
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Stok Barang Saat Ini</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Kondisi real-time, tidak dipengaruhi filter tanggal</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <span className="inline-block w-3 h-3 rounded-sm bg-blue-500" />Aman
                    </span>
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <span className="inline-block w-3 h-3 rounded-sm bg-red-400" />Restock
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                {chartData.stokData.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-10">Belum ada data barang</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData.stokData} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="nama" tick={{ fontSize: 11, fill: "#374151" }} tickLine={false} axisLine={false} interval={0} angle={-35} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={32} />
                      <Tooltip formatter={(value: number) => [value, "Stok"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                      <ReferenceLine y={STOCK_THRESHOLD} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: `Min. ${STOCK_THRESHOLD}`, position: "insideTopRight", fontSize: 10, fill: "#ef4444", dy: -4 }} />
                      <Bar dataKey="stok" radius={[4, 4, 0, 0]}>
                        {chartData.stokData.map((entry, index) => (
                          <Cell key={index} fill={entry.stok < STOCK_THRESHOLD ? "#f87171" : "#3b82f6"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Penjualan per Barang — full width */}
          <div className="card p-0">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Penjualan Barang</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Jumlah unit terjual per barang · {range.from} s/d {range.to}
              </p>
            </div>
            <div className="p-4">
              {chartData.penjualanData.every((d) => d.qty === 0) ? (
                <p className="text-center text-sm text-gray-400 py-10">Tidak ada penjualan di rentang tanggal ini</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData.penjualanData} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="nama" tick={{ fontSize: 11, fill: "#374151" }} tickLine={false} axisLine={false} interval={0} angle={-35} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                    <Tooltip formatter={(value: number) => [value, "Unit Terjual"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                    <Bar dataKey="qty" radius={[4, 4, 0, 0]}>
                      {chartData.penjualanData.map((entry, index) => (
                        <Cell key={index} fill={entry.qty === 0 ? "#d1d5db" : "#8b5cf6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* ── Tabel Transaksi ───────────────────────────────────────────────── */}
      <div className="card p-0">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Histori Transaksi</h2>
        </div>

        {/* Filter bar */}
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama pembeli atau barang..."
              value={tableSearch}
              onChange={(e) => { setTableSearch(e.target.value); resetTablePage(); }}
              className="form-input pl-9 pr-8"
            />
            {tableSearch && (
              <button onClick={() => { setTableSearch(""); resetTablePage(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Date from */}
          <div>
            <label className="form-label">Dari</label>
            <input
              type="date"
              value={tableFrom}
              max={tableTo || undefined}
              onChange={(e) => { setTableFrom(e.target.value); resetTablePage(); }}
              className="form-input"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="form-label">Sampai</label>
            <input
              type="date"
              value={tableTo}
              min={tableFrom || undefined}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => { setTableTo(e.target.value); resetTablePage(); }}
              className="form-input"
            />
          </div>

          {(tableSearch || tableFrom || tableTo) && (
            <button
              onClick={() => { setTableSearch(""); setTableFrom(""); setTableTo(""); resetTablePage(); }}
              className="btn-secondary text-xs"
            >
              Reset
            </button>
          )}
        </div>

        {/* Table top bar: show entries + info */}
        <div className="px-4 py-2 flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Tampilkan</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); resetTablePage(); }}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500">entri</span>
          </div>
          <p className="text-xs text-gray-400">
            {filteredTrx.length === 0
              ? "Tidak ada data"
              : `Menampilkan ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredTrx.length)} dari ${filteredTrx.length} transaksi`}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {paginatedTrx.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              {allTrx.length === 0 ? "Belum ada transaksi" : "Tidak ada transaksi yang cocok"}
            </p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">ID Transaksi</th>
                  <th className="table-th">Tanggal</th>
                  <th className="table-th">Pembeli</th>
                  <th className="table-th">Item</th>
                  <th className="table-th">Metode</th>
                  <th className="table-th text-right">Total</th>
                  <th className="table-th">Dicatat oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedTrx.map((trx) => (
                  <tr key={trx.id_transaksi} className="hover:bg-gray-50">
                    <td className="table-td font-mono text-xs">{trx.id_transaksi}</td>
                    <td className="table-td text-gray-500 text-xs">{formatDateTime(trx.tanggal_transaksi)}</td>
                    <td className="table-td">
                      <div>{trx.nama_pembeli}</div>
                      {trx.no_hp_pembeli && <div className="text-xs text-gray-400">{trx.no_hp_pembeli}</div>}
                    </td>
                    <td className="table-td">
                      <div className="space-y-0.5">
                        {trx.items.map((item, i) => (
                          <div key={i} className="text-xs text-gray-600">{item.nama_barang} ×{item.qty}</div>
                        ))}
                      </div>
                    </td>
                    <td className="table-td">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                        {metodePembayaranLabel[trx.metode_pembayaran] || trx.metode_pembayaran}
                      </span>
                    </td>
                    <td className="table-td text-right font-medium">{formatCurrency(trx.total_transaksi)}</td>
                    <td className="table-td text-gray-500 text-xs">{trx.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>

            {pageNumbers.map((n, i) =>
              n === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-400">…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setCurrentPage(n as number)}
                  className={`min-w-[30px] h-[30px] text-xs rounded border transition-colors ${
                    safePage === n
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {n}
                </button>
              )
            )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
