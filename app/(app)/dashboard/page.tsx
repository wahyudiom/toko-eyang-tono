"use client";
import { useEffect, useState } from "react";
import { Package, TrendingUp, ShoppingBag, DollarSign, BarChart2, RefreshCw } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Transaction } from "@/lib/sheets";

interface DashboardData {
  total_stok_aktif: number;
  total_barang_masuk: number;
  total_barang_terjual: number;
  omzet: number;
  laba: number;
  transaksi_terbaru: Transaction[];
}

const metodePembayaranLabel: Record<string, string> = {
  tunai: "Tunai",
  transfer: "Transfer",
  qris: "QRIS",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Gagal mengambil data");
      setData(await res.json());
    } catch {
      setError("Gagal memuat dashboard. Coba refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-sm">{error}</p>
        <button onClick={fetchData} className="btn-secondary mt-3">
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      label: "Stok Aktif",
      value: `${data.total_stok_aktif} Item`,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Barang Masuk",
      value: `${data.total_barang_masuk} Item`,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Total Terjual",
      value: `${data.total_barang_terjual} Pcs`,
      icon: ShoppingBag,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Omzet",
      value: formatCurrency(data.omzet),
      icon: DollarSign,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Laba",
      value: formatCurrency(data.laba),
      icon: BarChart2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Ringkasan operasional bisnis</p>
        </div>
        <button
          onClick={fetchData}
          className="btn-secondary"
          disabled={loading}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card">
              <div className={`inline-flex p-2 rounded-lg ${stat.bg} mb-3`}>
                <Icon size={18} className={stat.color} />
              </div>
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className="text-lg font-semibold text-gray-900 leading-tight">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

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
                    <td className="table-td text-gray-500 text-xs">
                      {formatDateTime(trx.tanggal_transaksi)}
                    </td>
                    <td className="table-td">
                      <div>{trx.nama_pembeli}</div>
                      {trx.no_hp_pembeli && (
                        <div className="text-xs text-gray-400">{trx.no_hp_pembeli}</div>
                      )}
                    </td>
                    <td className="table-td">
                      <div className="space-y-0.5">
                        {trx.items.map((item, i) => (
                          <div key={i} className="text-xs text-gray-600">
                            {item.nama_barang} ×{item.qty}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="table-td">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                        {metodePembayaranLabel[trx.metode_pembayaran] || trx.metode_pembayaran}
                      </span>
                    </td>
                    <td className="table-td text-right font-medium">
                      {formatCurrency(trx.total_transaksi)}
                    </td>
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
