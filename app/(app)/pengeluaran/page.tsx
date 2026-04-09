"use client";
import { useEffect, useState, useMemo } from "react";
import {
  Plus, Pencil, Trash2, X, Search, ChevronLeft, ChevronRight,
  Wallet, CalendarDays, Calendar, Tag, AlertTriangle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Expense } from "@/lib/sheets";
import LoadingSpinner from "@/components/LoadingSpinner";

const KATEGORI_OPTIONS = ["Gaji", "Pembelian Barang", "Lainnya"];
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  tanggal: getToday(),
  kategori: "",
  kategori_lainnya: "",
  nominal: "",
  penerima_uang: "",
  notes: "",
};

// ── Summary helpers ────────────────────────────────────────────────────────────
function computeSummary(expenses: Expense[]) {
  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = now.getMonth();
  const todayD = now.getDate();

  let totalHariIni = 0;
  let totalBulanIni = 0;
  const perKategori: Record<string, number> = {};

  for (const exp of expenses) {
    const d = new Date(exp.tanggal);
    const nom = exp.nominal;
    const kat = exp.kategori === "Lainnya" ? "Lainnya" : exp.kategori;

    if (
      d.getFullYear() === todayY &&
      d.getMonth() === todayM &&
      d.getDate() === todayD
    ) {
      totalHariIni += nom;
    }
    if (d.getFullYear() === todayY && d.getMonth() === todayM) {
      totalBulanIni += nom;
    }
    perKategori[kat] = (perKategori[kat] || 0) + nom;
  }

  return { totalHariIni, totalBulanIni, perKategori };
}

export default function PengeluaranPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter + pagination
  const [search, setSearch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Data fetching ────────────────────────────────────────────────────────────
  async function fetchExpenses() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pengeluaran");
      if (!res.ok) throw new Error();
      setExpenses(await res.json());
    } catch {
      setError("Gagal memuat data pengeluaran. Coba refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchExpenses(); }, []);

  // ── Summary (always all-time, not affected by filter) ────────────────────────
  const summary = useMemo(() => computeSummary(expenses), [expenses]);

  // ── Filtered + paginated list ────────────────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    let rows = expenses;
    if (filterFrom) {
      const d = new Date(filterFrom); d.setHours(0, 0, 0, 0);
      rows = rows.filter((e) => new Date(e.tanggal) >= d);
    }
    if (filterTo) {
      const d = new Date(filterTo); d.setHours(23, 59, 59, 999);
      rows = rows.filter((e) => new Date(e.tanggal) <= d);
    }
    if (filterKategori) {
      rows = rows.filter((e) => e.kategori === filterKategori);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      rows = rows.filter(
        (e) =>
          e.penerima_uang.toLowerCase().includes(q) ||
          e.notes.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [expenses, filterFrom, filterTo, filterKategori, search]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedExpenses = filteredExpenses.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  function resetPage() { setCurrentPage(1); }

  // ── Modal helpers ────────────────────────────────────────────────────────────
  function openAddModal() {
    setEditingExpense(null);
    setFormData({ ...emptyForm, tanggal: getToday() });
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(exp: Expense) {
    setEditingExpense(exp);
    setFormData({
      tanggal: exp.tanggal,
      kategori: exp.kategori,
      kategori_lainnya: exp.kategori_lainnya,
      nominal: String(exp.nominal),
      penerima_uang: exp.penerima_uang,
      notes: exp.notes,
    });
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingExpense(null);
    setFormError("");
  }

  // ── Form submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const nominalNum = parseFloat(formData.nominal);
    if (!formData.tanggal || !formData.kategori || !formData.penerima_uang) {
      setFormError("Tanggal, kategori, dan penerima wajib diisi.");
      return;
    }
    if (formData.kategori === "Lainnya" && !formData.kategori_lainnya.trim()) {
      setFormError("Keterangan kategori wajib diisi.");
      return;
    }
    if (isNaN(nominalNum) || nominalNum <= 0) {
      setFormError("Nominal harus berupa angka lebih dari 0.");
      return;
    }

    setSaving(true);
    try {
      const url = editingExpense
        ? `/api/pengeluaran/${editingExpense.id_expense}`
        : "/api/pengeluaran";
      const method = editingExpense ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          nominal: nominalNum,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Gagal menyimpan."); return; }

      closeModal();
      await fetchExpenses();
    } catch {
      setFormError("Terjadi kesalahan koneksi.");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/pengeluaran/${deleteTarget.id_expense}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setDeleteTarget(null);
      await fetchExpenses();
    } catch {
      // keep modal open so user knows it failed
    } finally {
      setDeleting(false);
    }
  }

  // ── Pagination numbers ───────────────────────────────────────────────────────
  const pageNumbers: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (safePage > 3) pageNumbers.push("...");
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++)
      pageNumbers.push(i);
    if (safePage < totalPages - 2) pageNumbers.push("...");
    pageNumbers.push(totalPages);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-sm">{error}</p>
        <button onClick={fetchExpenses} className="btn-secondary mt-3">Coba Lagi</button>
      </div>
    );
  }

  const hasFilter = search || filterFrom || filterTo || filterKategori;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Pengeluaran</h1>
          <p className="text-sm text-gray-500">Pencatatan pengeluaran usaha</p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <Plus size={15} />
          Tambah Pengeluaran
        </button>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="inline-flex p-2 rounded-lg bg-red-50 mb-3">
            <CalendarDays size={18} className="text-red-600" />
          </div>
          <p className="text-xs text-gray-500 mb-1">Pengeluaran Hari Ini</p>
          <p className="text-lg font-semibold text-gray-900 leading-tight">
            {formatCurrency(summary.totalHariIni)}
          </p>
        </div>

        <div className="card">
          <div className="inline-flex p-2 rounded-lg bg-orange-50 mb-3">
            <Calendar size={18} className="text-orange-600" />
          </div>
          <p className="text-xs text-gray-500 mb-1">Pengeluaran Bulan Ini</p>
          <p className="text-lg font-semibold text-gray-900 leading-tight">
            {formatCurrency(summary.totalBulanIni)}
          </p>
        </div>

        {Object.entries(summary.perKategori).map(([kat, total]) => (
          <div key={kat} className="card">
            <div className="inline-flex p-2 rounded-lg bg-violet-50 mb-3">
              <Tag size={18} className="text-violet-600" />
            </div>
            <p className="text-xs text-gray-500 mb-1">{kat}</p>
            <p className="text-lg font-semibold text-gray-900 leading-tight">
              {formatCurrency(total)}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────────────── */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari penerima atau catatan..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            className="form-input pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); resetPage(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div>
          <label className="form-label">Dari</label>
          <input
            type="date"
            value={filterFrom}
            max={filterTo || undefined}
            onChange={(e) => { setFilterFrom(e.target.value); resetPage(); }}
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">Sampai</label>
          <input
            type="date"
            value={filterTo}
            min={filterFrom || undefined}
            max={getToday()}
            onChange={(e) => { setFilterTo(e.target.value); resetPage(); }}
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">Kategori</label>
          <select
            value={filterKategori}
            onChange={(e) => { setFilterKategori(e.target.value); resetPage(); }}
            className="form-input"
          >
            <option value="">Semua</option>
            {KATEGORI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        {hasFilter && (
          <button
            onClick={() => { setSearch(""); setFilterFrom(""); setFilterTo(""); setFilterKategori(""); resetPage(); }}
            className="btn-secondary text-xs"
          >
            Reset
          </button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
      <div className="card p-0">
        {/* Top bar */}
        <div className="px-4 py-2 flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Tampilkan</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); resetPage(); }}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-xs text-gray-500">entri</span>
          </div>
          <p className="text-xs text-gray-400">
            {filteredExpenses.length === 0
              ? "Tidak ada data"
              : `Menampilkan ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredExpenses.length)} dari ${filteredExpenses.length} pengeluaran`}
          </p>
        </div>

        <div className="overflow-x-auto">
          {paginatedExpenses.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">
              {expenses.length === 0 ? "Belum ada data pengeluaran" : "Tidak ada data yang cocok"}
            </p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Tanggal</th>
                  <th className="table-th">Kategori</th>
                  <th className="table-th text-right">Nominal</th>
                  <th className="table-th">Penerima</th>
                  <th className="table-th">Catatan</th>
                  <th className="table-th">Dicatat oleh</th>
                  <th className="table-th text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedExpenses.map((exp) => (
                  <tr key={exp.id_expense} className="hover:bg-gray-50">
                    <td className="table-td text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(exp.tanggal)}
                    </td>
                    <td className="table-td">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-700">
                        {exp.kategori === "Lainnya" && exp.kategori_lainnya
                          ? exp.kategori_lainnya
                          : exp.kategori}
                      </span>
                    </td>
                    <td className="table-td text-right font-medium whitespace-nowrap">
                      {formatCurrency(exp.nominal)}
                    </td>
                    <td className="table-td">{exp.penerima_uang}</td>
                    <td className="table-td text-gray-500 text-xs">
                      {exp.notes || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="table-td text-gray-500 text-xs">{exp.created_by}</td>
                    <td className="table-td">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(exp)}
                          className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(exp)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
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
                <span key={`e-${i}`} className="px-2 text-xs text-gray-400">…</span>
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

      {/* ── Add / Edit Modal ───────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-blue-600" />
                <h2 className="text-sm font-semibold text-gray-900">
                  {editingExpense ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
                </h2>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              {/* Tanggal */}
              <div>
                <label className="form-label">Tanggal <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={formData.tanggal}
                  max={getToday()}
                  onChange={(e) => setFormData((f) => ({ ...f, tanggal: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="form-label">Kategori <span className="text-red-500">*</span></label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData((f) => ({ ...f, kategori: e.target.value, kategori_lainnya: "" }))}
                  className="form-input"
                  required
                >
                  <option value="">Pilih kategori...</option>
                  {KATEGORI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              {/* Kategori Lainnya (conditional) */}
              {formData.kategori === "Lainnya" && (
                <div>
                  <label className="form-label">Keterangan Kategori <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.kategori_lainnya}
                    onChange={(e) => setFormData((f) => ({ ...f, kategori_lainnya: e.target.value }))}
                    className="form-input"
                    placeholder="Contoh: Biaya sewa, listrik..."
                    required
                  />
                </div>
              )}

              {/* Nominal */}
              <div>
                <label className="form-label">Nominal <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={formData.nominal}
                  onChange={(e) => setFormData((f) => ({ ...f, nominal: e.target.value }))}
                  className="form-input"
                  placeholder="0"
                  min="1"
                  required
                />
              </div>

              {/* Penerima */}
              <div>
                <label className="form-label">Penerima Uang <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.penerima_uang}
                  onChange={(e) => setFormData((f) => ({ ...f, penerima_uang: e.target.value }))}
                  className="form-input"
                  placeholder="Nama penerima"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">Catatan <span className="text-gray-400">(opsional)</span></label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                  className="form-input resize-none"
                  rows={2}
                  placeholder="Keterangan tambahan..."
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {formError}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Menyimpan...
                    </>
                  ) : editingExpense ? "Simpan Perubahan" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="inline-flex p-2 rounded-lg bg-red-50 shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Hapus Pengeluaran</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Hapus pengeluaran{" "}
                  <span className="font-medium text-gray-700">
                    {formatCurrency(deleteTarget.nominal)}
                  </span>{" "}
                  ke <span className="font-medium text-gray-700">{deleteTarget.penerima_uang}</span>?
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="btn-secondary flex-1 justify-center"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 justify-center inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
