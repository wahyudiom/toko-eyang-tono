"use client";
import { useEffect, useState, FormEvent } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, RefreshCw, X, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { StockItem } from "@/lib/sheets";

interface CartItem {
  id_barang: string;
  nama_barang: string;
  harga_jual: number;
  harga_modal: number;
  stok: number;
  qty: number;
}

const METODE_PEMBAYARAN = ["tunai", "transfer", "qris"];
const METODE_LABEL: Record<string, string> = { tunai: "Tunai", transfer: "Transfer", qris: "QRIS" };

export default function KasirPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [namaPembeli, setNamaPembeli] = useState("");
  const [noHp, setNoHp] = useState("");
  const [metodePembayaran, setMetodePembayaran] = useState("tunai");
  const [formError, setFormError] = useState("");

  async function fetchStock() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stock");
      if (!res.ok) throw new Error();
      const data: StockItem[] = await res.json();
      setStock(data.filter((s) => s.status_barang === "tersedia"));
    } catch {
      setError("Gagal memuat data stok");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStock();
  }, []);

  const filteredStock = stock.filter(
    (s) =>
      s.nama_barang.toLowerCase().includes(search.toLowerCase()) ||
      s.id_barang.toLowerCase().includes(search.toLowerCase())
  );

  // ── Cart actions ─────────────────────────────────────────────────────────

  function addToCart(item: StockItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id_barang === item.id_barang);
      if (existing) {
        if (existing.qty >= item.jumlah_stok) return prev;
        return prev.map((c) =>
          c.id_barang === item.id_barang ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [
        ...prev,
        {
          id_barang: item.id_barang,
          nama_barang: item.nama_barang,
          harga_jual: item.harga_jual,
          harga_modal: item.harga_modal,
          stok: item.jumlah_stok,
          qty: 1,
        },
      ];
    });
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.id_barang !== id) return c;
          const newQty = Math.max(1, Math.min(c.stok, c.qty + delta));
          return { ...c, qty: newQty };
        })
        .filter((c) => c.qty > 0)
    );
  }

  function setQty(id: string, value: string) {
    const qty = parseInt(value);
    if (isNaN(qty) || qty < 1) return;
    setCart((prev) =>
      prev.map((c) => {
        if (c.id_barang !== id) return c;
        return { ...c, qty: Math.min(c.stok, qty) };
      })
    );
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((c) => c.id_barang !== id));
  }

  function clearCart() {
    setCart([]);
    setNamaPembeli("");
    setNoHp("");
    setMetodePembayaran("Tunai");
    setFormError("");
  }

  const totalTransaksi = cart.reduce((sum, c) => sum + c.harga_jual * c.qty, 0);

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    if (cart.length === 0) { setFormError("Pilih minimal satu barang"); return; }
    if (!namaPembeli.trim()) { setFormError("Nama pembeli wajib diisi"); return; }

    setSaving(true);
    try {
      const items = cart.map((c) => ({
        id_barang: c.id_barang,
        nama_barang: c.nama_barang,
        qty: c.qty,
        harga_jual: c.harga_jual,
        harga_modal: c.harga_modal,
        total_item: c.harga_jual * c.qty,
      }));

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          nama_pembeli: namaPembeli,
          no_hp_pembeli: noHp,
          metode_pembayaran: metodePembayaran,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Gagal menyimpan transaksi"); return; }

      clearCart();
      fetchStock();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch {
      setFormError("Gagal menyimpan transaksi, coba lagi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Kasir</h1>
          <p className="text-sm text-gray-500">Input transaksi penjualan</p>
        </div>
        <button onClick={fetchStock} className="btn-secondary" disabled={loading}>
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Refresh Stok</span>
        </button>
      </div>

      {/* ── Success popup ──────────────────────────────────────────────────── */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 bg-white border border-green-200 shadow-xl rounded-2xl px-10 py-8 animate-fade-in">
            <CheckCircle size={48} className="text-green-500" />
            <p className="text-lg font-semibold text-gray-900">Transaksi Tersimpan</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ── LEFT: Form + Cart ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="card space-y-4 sticky top-20">
            {/* Header keranjang */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-gray-500" />
                <h2 className="font-semibold text-sm text-gray-900">
                  Keranjang ({cart.length} item)
                </h2>
              </div>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-xs text-red-500 hover:underline">
                  Kosongkan
                </button>
              )}
            </div>

            {/* Form transaksi */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="form-label">Nama Pembeli *</label>
                <input
                  type="text"
                  value={namaPembeli}
                  onChange={(e) => setNamaPembeli(e.target.value)}
                  className="form-input"
                  placeholder="Nama pembeli"
                  required
                />
              </div>
              <div>
                <label className="form-label">No. HP Pembeli</label>
                <input
                  type="text"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  className="form-input"
                  placeholder="08xx (opsional)"
                />
              </div>
              <div>
                <label className="form-label">Metode Pembayaran *</label>
                <select
                  value={metodePembayaran}
                  onChange={(e) => setMetodePembayaran(e.target.value)}
                  className="form-input"
                  required
                >
                  {METODE_PEMBAYARAN.map((m) => (
                    <option key={m} value={m}>{METODE_LABEL[m]}</option>
                  ))}
                </select>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 pt-3">
                {/* Cart items */}
                {cart.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Keranjang kosong</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.id_barang}
                        className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.nama_barang}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatCurrency(item.harga_jual)} × {item.qty} ={" "}
                            <span className="font-medium text-gray-700">
                              {formatCurrency(item.harga_jual * item.qty)}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => changeQty(item.id_barang, -1)}
                            className="p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-500"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => setQty(item.id_barang, e.target.value)}
                            className="w-10 text-center text-sm border border-gray-200 rounded py-0.5"
                            min={1}
                            max={item.stok}
                          />
                          <button
                            type="button"
                            onClick={() => changeQty(item.id_barang, 1)}
                            disabled={item.qty >= item.stok}
                            className="p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-500 disabled:opacity-40"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id_barang)}
                            className="p-1 rounded text-red-400 hover:bg-red-50"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total */}
                {cart.length > 0 && (
                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">Total</span>
                    <span className="text-base font-bold text-blue-700">
                      {formatCurrency(totalTransaksi)}
                    </span>
                  </div>
                )}
              </div>

              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary w-full justify-center py-2.5"
                disabled={saving || cart.length === 0}
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Transaksi"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── RIGHT: Stock list ──────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-3">
          <div className="card p-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari barang..."
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

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <p className="text-center text-red-600 text-sm py-8">{error}</p>
          ) : filteredStock.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">
              {stock.length === 0
                ? "Tidak ada stok tersedia"
                : "Tidak ada barang yang cocok"}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredStock.map((item) => {
                const inCart = cart.find((c) => c.id_barang === item.id_barang);
                const remaining = item.jumlah_stok - (inCart?.qty || 0);
                return (
                  <div
                    key={item.id_barang}
                    className={`card flex flex-col gap-2 ${
                      remaining <= 0 ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {item.nama_barang}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">{item.id_barang}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-blue-600">
                          {formatCurrency(item.harga_jual)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Stok: <span className={remaining <= 0 ? "text-red-500 font-semibold" : "font-medium"}>{remaining}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => addToCart(item)}
                      disabled={remaining <= 0}
                      className="btn-primary w-full justify-center py-1.5 text-xs"
                    >
                      <Plus size={12} />
                      {inCart ? "Tambah Lagi" : "Tambah ke Keranjang"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
