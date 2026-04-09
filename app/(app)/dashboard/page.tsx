"use client";
import { useEffect, useState } from "react";
import { ShoppingBag, DollarSign, BarChart2, RefreshCw, CalendarDays, Calendar, TrendingUp } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Transaction } from "@/lib/sheets";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

const STOCK_THRESHOLD = 10;

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
interface ChartData {
  trendData: TrendPoint[];
  stokData: StokPoint[];
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

      {/* ── Filter waktu ──────────────────────────────────────────────────── */}
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Line Chart — Omzet & Laba */}
          <div className="card p-0">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Omzet &amp; Laba</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {range.from} s/d {range.to}
              </p>
            </div>
            <div className="p-4">
              {chartData.trendData.every((d) => d.omzet === 0 && d.laba === 0) ? (
                <p className="text-center text-sm text-gray-400 py-10">
                  Tidak ada transaksi di rentang tanggal ini
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData.trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={formatAxisCurrency}
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === "omzet" ? "Omzet" : "Laba",
                      ]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                    <Legend
                      formatter={(value) => (value === "omzet" ? "Omzet" : "Laba")}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="omzet"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="laba"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
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
                    <span className="inline-block w-3 h-3 rounded-sm bg-blue-500" />
                    Aman
                  </span>
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <span className="inline-block w-3 h-3 rounded-sm bg-red-400" />
                    Restock
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4">
              {chartData.stokData.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">Belum ada data barang</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={chartData.stokData}
                    margin={{ top: 4, right: 8, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="nama"
                      tick={{ fontSize: 11, fill: "#374151" }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                    />
                    <Tooltip
                      formatter={(value: number) => [value, "Stok"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                    <ReferenceLine
                      y={STOCK_THRESHOLD}
                      stroke="#ef4444"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={{ value: `Min. ${STOCK_THRESHOLD}`, position: "insideTopRight", fontSize: 10, fill: "#ef4444", dy: -4 }}
                    />
                    <Bar dataKey="stok" radius={[4, 4, 0, 0]}>
                      {chartData.stokData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.stok < STOCK_THRESHOLD ? "#f87171" : "#3b82f6"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Transaksi Terbaru */}
      <div className="card p-0">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Transaksi Terbaru</h2>
        </div>
        <div className="overflow-x-auto">
          {data.transaksi_terbaru.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Belum ada transaksi</p>
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
                {data.transaksi_terbaru.map((trx) => (
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
      </div>
    </div>
  );
}
