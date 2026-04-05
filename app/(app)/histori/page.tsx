"use client";
import { useEffect, useState } from "react";
import { RefreshCw, Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Transaction } from "@/lib/sheets";

export default function HistoriPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/transactions");
      if (!res.ok) throw new Error();
      setTransactions(await res.json());
    } catch {
      setError("Gagal memuat histori transaksi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = transactions.filter(
    (t) =>
      t.id_transaksi.toLowerCase().includes(search.toLowerCase()) ||
      t.nama_pembeli.toLowerCase().includes(search.toLowerCase()) ||
      t.items.some((i) =>
        i.nama_barang.toLowerCase().includes(search.toLowerCase())
      )
  );

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Histori Penjualan</h1>
          <p className="text-sm text-gray-500">Riwayat semua transaksi penjualan</p>
        </div>
        <button onClick={fetchData} className="btn-secondary" disabled={loading}>
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className="card p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari ID transaksi, nama pembeli, atau nama barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center py-12 text-red-600 text-sm">{error}</div>
      ) : (
        <div className="card p-0">
          <div className="px-4 py-3 border-b border-gray-200">
            <span className="text-sm text-gray-500">
              Menampilkan{" "}
              <span className="font-medium text-gray-900">{filtered.length}</span> dari{" "}
              <span className="font-medium text-gray-900">{transactions.length}</span> transaksi
            </span>
          </div>
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <p className="text-center py-10 text-sm text-gray-400">
                {transactions.length === 0
                  ? "Belum ada transaksi"
                  : "Tidak ada transaksi yang cocok dengan pencarian"}
              </p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th w-8"></th>
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
                  {filtered.map((trx) => (
                    <>
                      <tr
                        key={trx.id_transaksi}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleExpand(trx.id_transaksi)}
                      >
                        <td className="table-td text-gray-400">
                          {expandedId === trx.id_transaksi ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </td>
                        <td className="table-td font-mono text-xs">{trx.id_transaksi}</td>
                        <td className="table-td text-xs text-gray-500">
                          {formatDateTime(trx.tanggal_transaksi)}
                        </td>
                        <td className="table-td">
                          <div className="font-medium text-sm">{trx.nama_pembeli}</div>
                          {trx.no_hp_pembeli && (
                            <div className="text-xs text-gray-400">{trx.no_hp_pembeli}</div>
                          )}
                        </td>
                        <td className="table-td">
                          <div className="text-sm text-gray-600">
                            {trx.items.length} barang
                            {trx.items.length === 1 && ` (${trx.items[0].nama_barang})`}
                          </div>
                        </td>
                        <td className="table-td">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                            {trx.metode_pembayaran}
                          </span>
                        </td>
                        <td className="table-td text-right font-semibold">
                          {formatCurrency(trx.total_transaksi)}
                        </td>
                        <td className="table-td text-xs text-gray-400">{trx.created_by}</td>
                      </tr>

                      {/* Expanded detail */}
                      {expandedId === trx.id_transaksi && (
                        <tr key={`${trx.id_transaksi}-detail`} className="bg-blue-50/30">
                          <td colSpan={8} className="px-8 py-3">
                            <div className="border border-blue-100 rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-blue-50">
                                  <tr>
                                    <th className="table-th">Barang</th>
                                    <th className="table-th text-center">Qty</th>
                                    <th className="table-th text-right">Harga Satuan</th>
                                    <th className="table-th text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-blue-50 bg-white">
                                  {trx.items.map((item, i) => (
                                    <tr key={i}>
                                      <td className="table-td font-medium">{item.nama_barang}</td>
                                      <td className="table-td text-center">{item.qty}</td>
                                      <td className="table-td text-right">
                                        {formatCurrency(item.harga_jual)}
                                      </td>
                                      <td className="table-td text-right font-semibold">
                                        {formatCurrency(item.total_item)}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-gray-50">
                                    <td colSpan={3} className="table-td text-right font-semibold text-gray-700">
                                      Total Transaksi
                                    </td>
                                    <td className="table-td text-right font-bold text-blue-700">
                                      {formatCurrency(trx.total_transaksi)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
