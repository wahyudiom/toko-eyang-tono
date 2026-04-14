"use client";
import { useEffect, useState, FormEvent } from "react";
import { Plus, Search, Pencil, Trash2, X, RefreshCw, Filter } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import Modal from "@/components/Modal";
import type { StockItem } from "@/lib/sheets";

const emptyForm = {
  nama_barang: "",
  tanggal_masuk: new Date().toISOString().slice(0, 10),
  jumlah_stok: "",
  notes: "",
  harga_jual: "",
  harga_modal: "",
};

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  // Filter & search
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterTanggal, setFilterTanggal] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function fetchStock() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stock");
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      setError("Gagal memuat data stok");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStock();
  }, []);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = items.filter((item) => {
    const matchSearch =
      item.nama_barang.toLowerCase().includes(search.toLowerCase()) ||
      item.id_barang.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "semua" || item.status_barang === filterStatus;
    const matchTanggal = !filterTanggal || item.tanggal_masuk === filterTanggal;
    return matchSearch && matchStatus && matchTanggal;
  });

  // ── Add ───────────────────────────────────────────────────────────────────
  function openAdd() {
    setForm(emptyForm);
    setFormError("");
    setShowAddModal(true);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          jumlah_stok: parseInt(form.jumlah_stok, 10),
          harga_jual: parseInt(form.harga_jual, 10),
          harga_modal: parseInt(form.harga_modal, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error); return; }
      setShowAddModal(false);
      fetchStock();
    } catch {
      setFormError("Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  function openEdit(item: StockItem) {
    setSelectedItem(item);
    setForm({
      nama_barang: item.nama_barang,
      tanggal_masuk: item.tanggal_masuk,
      jumlah_stok: "0",
      notes: item.notes,
      harga_jual: String(item.harga_jual),
      harga_modal: String(item.harga_modal),
    });
    setFormError("");
    setShowEditModal(true);
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    setFormError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/stock/${selectedItem.id_barang}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          jumlah_stok: parseInt(form.jumlah_stok, 10),
          harga_jual: parseInt(form.harga_jual, 10),
          harga_modal: parseInt(form.harga_modal, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error); return; }
      setShowEditModal(false);
      fetchStock();
    } catch {
      setFormError("Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function openDelete(item: StockItem) {
    setSelectedItem(item);
    setShowDeleteModal(true);
  }

  async function handleDelete() {
    if (!selectedItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/stock/${selectedItem.id_barang}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Gagal menghapus barang");
        return;
      }
      setShowDeleteModal(false);
      fetchStock();
    } catch {
      alert("Gagal menghapus barang");
    } finally {
      setSaving(false);
    }
  }

  function handleFormChange(key: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Stok Barang</h1>
          <p className="text-sm text-gray-500">Kelola data barang masuk dan stok</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchStock} className="btn-secondary" disabled={loading}>
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={14} />
            Tambah Barang
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card flex flex-wrap gap-3 p-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-input w-auto"
          >
            <option value="semua">Semua Status</option>
            <option value="tersedia">Tersedia</option>
            <option value="out of stock">Out of Stock</option>
          </select>
        </div>
        <div>
          <input
            type="date"
            value={filterTanggal}
            onChange={(e) => setFilterTanggal(e.target.value)}
            className="form-input w-auto"
            title="Filter tanggal masuk"
          />
        </div>
        {(filterStatus !== "semua" || filterTanggal) && (
          <button
            onClick={() => { setFilterStatus("semua"); setFilterTanggal(""); }}
            className="text-sm text-blue-600 hover:underline"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center py-12 text-red-600 text-sm">{error}</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Menampilkan <span className="font-medium text-gray-900">{filtered.length}</span> dari{" "}
              <span className="font-medium text-gray-900">{items.length}</span> barang
            </span>
          </div>
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <p className="text-center py-10 text-sm text-gray-400">
                {items.length === 0 ? "Belum ada barang. Tambah barang baru." : "Tidak ada barang yang cocok dengan filter."}
              </p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Nama Barang</th>
                    <th className="table-th">Tgl Masuk</th>
                    <th className="table-th text-center">Stok</th>
                    <th className="table-th">Status</th>
                    <th className="table-th text-right">Harga Jual</th>
                    <th className="table-th text-right">Harga Modal</th>
                    <th className="table-th">Notes</th>
                    <th className="table-th">Diupdate</th>
                    <th className="table-th">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((item) => (
                    <tr key={item.id_barang} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{item.nama_barang}</td>
                      <td className="table-td text-gray-500 text-xs">{formatDate(item.tanggal_masuk)}</td>
                      <td className="table-td text-center font-semibold">{item.jumlah_stok}</td>
                      <td className="table-td">
                        {item.status_barang === "tersedia" ? (
                          <span className="badge-available">Tersedia</span>
                        ) : (
                          <span className="badge-empty">Out of Stock</span>
                        )}
                      </td>
                      <td className="table-td text-right">{formatCurrency(item.harga_jual)}</td>
                      <td className="table-td text-right">{formatCurrency(item.harga_modal)}</td>
                      <td className="table-td text-gray-500 text-xs max-w-32 truncate" title={item.notes}>
                        {item.notes || "-"}
                      </td>
                      <td className="table-td text-gray-400 text-xs">
                        <div>{item.updated_by}</div>
                        <div>{formatDateTime(item.updated_at)}</div>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => openDelete(item)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
        </div>
      )}

      {/* ── Add Modal ─────────────────────────────────────────────────────── */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tambah Barang Baru">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="form-label">Nama Barang *</label>
            <input
              type="text"
              value={form.nama_barang}
              onChange={(e) => handleFormChange("nama_barang", e.target.value)}
              className="form-input"
              placeholder="Nama barang"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Tanggal Masuk *</label>
              <input
                type="date"
                value={form.tanggal_masuk}
                onChange={(e) => handleFormChange("tanggal_masuk", e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label">Stok Awal *</label>
              <input
                type="number"
                value={form.jumlah_stok}
                onChange={(e) => handleFormChange("jumlah_stok", e.target.value)}
                className="form-input"
                min="0"
                placeholder="0"
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Disimpan sebagai stok masuk awal barang.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Harga Jual (Rp) *</label>
              <input
                type="number"
                value={form.harga_jual}
                onChange={(e) => handleFormChange("harga_jual", e.target.value)}
                className="form-input"
                min="0"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="form-label">Harga Modal (Rp) *</label>
              <input
                type="number"
                value={form.harga_modal}
                onChange={(e) => handleFormChange("harga_modal", e.target.value)}
                className="form-input"
                min="0"
                placeholder="0"
                required
              />
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleFormChange("notes", e.target.value)}
              className="form-input resize-none"
              rows={2}
              placeholder="Catatan tambahan (opsional)"
            />
          </div>
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {formError}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">
              Batal
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Barang">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="form-label text-xs text-gray-400">ID Barang</label>
            <p className="text-sm font-mono text-gray-600">{selectedItem?.id_barang}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 px-3 py-2 text-sm">
            <div>
              <p className="text-xs text-gray-400">Stok Saat Ini</p>
              <p className="font-semibold text-gray-900">{selectedItem?.jumlah_stok ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Stok Masuk</p>
              <p className="font-semibold text-gray-900">
                {selectedItem?.stok_masuk_total ?? selectedItem?.jumlah_stok ?? 0}
              </p>
            </div>
          </div>
          <div>
            <label className="form-label">Nama Barang *</label>
            <input
              type="text"
              value={form.nama_barang}
              onChange={(e) => handleFormChange("nama_barang", e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Tanggal Masuk *</label>
              <input
                type="date"
                value={form.tanggal_masuk}
                onChange={(e) => handleFormChange("tanggal_masuk", e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label">Tambah Stok *</label>
              <input
                type="number"
                value={form.jumlah_stok}
                onChange={(e) => handleFormChange("jumlah_stok", e.target.value)}
                className="form-input"
                min="0"
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Isi `0` jika hanya ingin ubah data barang tanpa menambah stok.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Harga Jual (Rp) *</label>
              <input
                type="number"
                value={form.harga_jual}
                onChange={(e) => handleFormChange("harga_jual", e.target.value)}
                className="form-input"
                min="0"
                required
              />
            </div>
            <div>
              <label className="form-label">Harga Modal (Rp) *</label>
              <input
                type="number"
                value={form.harga_modal}
                onChange={(e) => handleFormChange("harga_modal", e.target.value)}
                className="form-input"
                min="0"
                required
              />
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleFormChange("notes", e.target.value)}
              className="form-input resize-none"
              rows={2}
            />
          </div>
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {formError}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary flex-1">
              Batal
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Hapus Barang" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Yakin ingin menghapus barang{" "}
            <span className="font-semibold">{selectedItem?.nama_barang}</span>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowDeleteModal(false)} className="btn-secondary flex-1">
              Batal
            </button>
            <button onClick={handleDelete} className="btn-danger flex-1" disabled={saving}>
              {saving ? "Menghapus..." : "Ya, Hapus"}
            </button>
          </div>
        </div>
      </Modal>

      {saving && <LoadingSpinner fullPage />}
    </div>
  );
}
