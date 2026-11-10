'use client';

import { useState, FormEvent } from 'react';
import {
  addDebt,
  toggleDebtStatus,
  deleteDebt,
  updateLastBilled,
  updateDebtPhone,
  updateDebt,
} from '@/app/actions/piutang';
import { hitungHariTelat, buatPesanTagih, normalisasiNomor, linkWa } from '@/lib/penagih';
import type { Debt } from '@/types';
import {
  Plus,
  Search,
  BookOpen,
  Info,
  X,
  Save,
  Calendar,
  MessageSquare,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
} from 'lucide-react';

interface PiutangClientProps {
  initialDebts: Debt[];
}

export default function PiutangClient({ initialDebts = [] }: PiutangClientProps) {
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [filter, setFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [previewDebt, setPreviewDebt] = useState<Debt | null>(null);
  const [previewMessage, setPreviewMessage] = useState('');
  const [previewPhone, setPreviewPhone] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [statusDebtTarget, setStatusDebtTarget] = useState<Debt | null>(null);
  const [deleteDebtTarget, setDeleteDebtTarget] = useState<Debt | null>(null);

  // Form states for manual input
  const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const unpaidDebts = debts.filter((d) => d.status === 'UNPAID');
  const paidDebts = debts.filter((d) => d.status === 'PAID');

  const totalPiutang = unpaidDebts.reduce((acc, curr) => acc + curr.amount, 0);
  const totalLunas = paidDebts.reduce((acc, curr) => acc + curr.amount, 0);

  const filteredDebts = debts.filter((d) => {
    const matchFilter = filter === 'ALL' || d.status === filter;
    const matchSearch =
      d.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      Boolean(d.customer_phone?.includes(search));
    return matchFilter && matchSearch;
  });

  const handleAddSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = await addDebt(formData);

    if (res?.error) {
      setErrorMessage(res.error);
      setLoading(false);
    } else {
      setSuccessMessage('Catatan piutang berhasil ditambahkan!');
      setIsModalOpen(false);
      form.reset();
      setLoading(false);
      window.location.reload();
    }
  };

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = await updateDebt(formData);

    if (res?.error) {
      setErrorMessage(res.error);
      setLoading(false);
    } else {
      setSuccessMessage('Catatan piutang berhasil diperbarui!');
      setIsEditModalOpen(false);
      form.reset();
      setLoading(false);
      window.location.reload();
    }
  };

  const confirmToggleStatus = async () => {
    if (!statusDebtTarget) return;
    setLoading(true);
    const res = await toggleDebtStatus(statusDebtTarget.id, statusDebtTarget.status);
    if (res?.success && res.newStatus) {
      setDebts((prev) =>
        prev.map((d) =>
          d.id === statusDebtTarget.id ? { ...d, status: res.newStatus as 'UNPAID' | 'PAID' } : d
        )
      );
      setStatusDebtTarget(null);
    } else if (res?.error) {
      setErrorMessage(res.error);
    }
    setLoading(false);
  };

  const confirmDeleteDebt = async () => {
    if (!deleteDebtTarget) return;
    setLoading(true);
    const res = await deleteDebt(deleteDebtTarget.id);
    if (res?.success) {
      setDebts((prev) => prev.filter((d) => d.id !== deleteDebtTarget.id));
      setDeleteDebtTarget(null);
    } else if (res?.error) {
      setErrorMessage(res.error);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. Breadcrumb & Page Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
        <div>
          <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase mb-1 block">
            KEUANGAN / PELANGGAN
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Buku piutang &amp; kasbon
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Catat utang pelanggan, pantau jatuh tempo, dan jaga kelancaran kas warung.
          </p>
        </div>

        {/* Top Right Action Button: Tambah Catatan */}
        <button
          type="button"
          onClick={() => {
            setIsModalOpen(true);
            setErrorMessage('');
          }}
          className="px-4 py-2.5 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Tambah Catatan</span>
        </button>
      </div>

      {/* 2. Top Metric Banner: Belum Lunas vs Sudah Lunas (Lime Green Box) */}
      <div className="bg-[#cbf14e] rounded-2xl p-6 sm:p-7 shadow-xs mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Col 1: Belum Lunas / Total Utang Aktif */}
          <div>
            <div className="border-t border-[#1c240d]/15 pt-2.5 mb-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#354614] uppercase block">
                BELUM LUNAS / TOTAL UTANG AKTIF
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-3xl sm:text-4xl font-black text-[#1c240d] tracking-tight">
                Rp {totalPiutang.toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-[#354614] font-semibold">
                {unpaidDebts.length} tagihan aktif
              </div>
            </div>
          </div>

          {/* Col 2: Sudah Lunas / Riwayat Pelunasan */}
          <div>
            <div className="border-t border-[#1c240d]/15 pt-2.5 mb-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#354614] uppercase block">
                SUDAH LUNAS / RIWAYAT PELUNASAN
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-3xl sm:text-4xl font-black text-[#1c240d] tracking-tight">
                Rp {totalLunas.toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-[#354614] font-semibold">
                {paidDebts.length} riwayat selesai
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md bg-white border border-neutral-200 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-xs focus-within:border-neutral-400 transition">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            placeholder="Cari pelanggan / nomor HP atau WhatsApp"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs sm:text-sm font-medium text-neutral-800 placeholder:text-neutral-400 bg-transparent focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-neutral-400 hover:text-neutral-600 text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'ALL'
                ? 'bg-[#cbf14e] text-[#1c240d] font-bold shadow-2xs'
                : 'bg-transparent hover:bg-neutral-100 text-neutral-600 font-medium'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setFilter('UNPAID')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'UNPAID'
                ? 'bg-[#cbf14e] text-[#1c240d] font-bold shadow-2xs'
                : 'bg-transparent hover:bg-neutral-100 text-neutral-600 font-medium'
            }`}
          >
            Belum Lunas
          </button>
          <button
            type="button"
            onClick={() => setFilter('PAID')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'PAID'
                ? 'bg-[#cbf14e] text-[#1c240d] font-bold shadow-2xs'
                : 'bg-transparent hover:bg-neutral-100 text-neutral-600 font-medium'
            }`}
          >
            Lunas
          </button>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs mt-4 overflow-hidden">
        {/* Table Header (Soft Sage Tint) */}
        <div className="bg-[#eef3e2] border-b border-neutral-200/80 px-5 py-3">
          <div className="grid grid-cols-12 gap-3 text-[11px] font-extrabold tracking-wider text-neutral-600 uppercase">
            <div className="col-span-3">NAMA PELANGGAN</div>
            <div className="col-span-2">NOMOR HP / WA</div>
            <div className="col-span-2">JUMLAH KASBON</div>
            <div className="col-span-2">JATUH TEMPO</div>
            <div className="col-span-1">STATUS</div>
            <div className="col-span-2 text-right">AKSI</div>
          </div>
        </div>

        {/* Content or Empty State */}
        {filteredDebts.length > 0 ? (
          <div className="divide-y divide-neutral-100">
            {filteredDebts.map((debt) => {
              const hariTelat = hitungHariTelat(debt.due_date);
              const isOverdue = debt.status === 'UNPAID' && hariTelat > 0;

              return (
                <div
                  key={debt.id}
                  className={`px-5 py-3.5 hover:bg-neutral-50/60 transition-colors ${
                    isOverdue ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <div className="grid grid-cols-12 gap-3 items-center text-xs">
                    {/* Nama Pelanggan */}
                    <div className="col-span-3">
                      <p className="font-bold text-neutral-900 text-xs sm:text-sm">
                        {debt.customer_name}
                      </p>
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                          Terlewat {hariTelat} hari
                        </span>
                      )}
                    </div>

                    {/* Nomor HP / WA */}
                    <div className="col-span-2 text-neutral-600 font-medium">
                      {debt.customer_phone || '-'}
                    </div>

                    {/* Jumlah Kasbon */}
                    <div
                      className={`col-span-2 font-black text-xs sm:text-sm ${
                        debt.status === 'PAID'
                          ? 'text-neutral-400 line-through'
                          : 'text-neutral-900'
                      }`}
                    >
                      Rp {debt.amount.toLocaleString('id-ID')}
                    </div>

                    {/* Jatuh Tempo */}
                    <div className="col-span-2 text-neutral-700 font-medium">
                      {new Date(debt.due_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>

                    {/* Status Badge (Click to toggle) */}
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={() => setStatusDebtTarget(debt)}
                        title="Klik untuk ubah status"
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                          debt.status === 'PAID'
                            ? 'bg-[#eef5db] border-[#d6e5b4] text-[#465427]'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}
                      >
                        {debt.status === 'PAID' ? 'LUNAS' : 'BELUM'}
                      </button>
                    </div>

                    {/* Aksi */}
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      {debt.status === 'UNPAID' && (
                        <button
                          type="button"
                          onClick={() => {
                            const msg = buatPesanTagih({
                              nama: debt.customer_name,
                              nominal: debt.amount,
                              hariTelat: hariTelat,
                              toko: 'Wadira',
                            });
                            setPreviewMessage(msg);
                            setPreviewDebt(debt);
                            setPreviewPhone(debt.customer_phone || '');
                          }}
                          className="px-2 py-1 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Kirim pesan penagihan WhatsApp"
                        >
                          <Send className="w-3 h-3" />
                          <span>Tagih WA</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditDebt(debt);
                          setIsEditModalOpen(true);
                        }}
                        className="p-1 text-neutral-400 hover:text-neutral-700 transition cursor-pointer rounded"
                        title="Edit catatan"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteDebtTarget(debt)}
                        className="p-1 text-neutral-400 hover:text-red-600 transition cursor-pointer rounded"
                        title="Hapus catatan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty States Matching Images 0, 1, 2 */
          <div className="p-8 sm:p-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#eef5db] text-[#465427] flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-neutral-900">
                {filter === 'ALL'
                  ? 'Belum ada catatan piutang.'
                  : filter === 'UNPAID'
                  ? 'Tidak ada piutang belum lunas.'
                  : 'Belum ada riwayat pelunasan.'}
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-xl leading-relaxed">
                {filter === 'ALL'
                  ? 'Mulai dengan mencatat kasbon pertama. Simpan nama, nomor WhatsApp, jumlah kasbon, dan jatuh temponya.'
                  : filter === 'UNPAID'
                  ? 'Filter Belum Lunas aktif. Belum ada tagihan yang cocok. Tambahkan kasbon baru untuk mulai memantau utang pelanggan.'
                  : 'Filter Lunas aktif. Catatan yang sudah dibayar akan ditampilkan di sini. Belum ada data piutang yang cocok.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(true);
                  setErrorMessage('');
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Catat Kasbon Pertama</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom Table Footer Bar */}
        <div className="px-5 py-3.5 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-2 bg-[#fbfcfa]">
          <div>{filteredDebts.length} catatan ditampilkan</div>
          <div>
            Status: {filter === 'ALL' ? 'Semua' : filter === 'UNPAID' ? 'Belum Lunas' : 'Lunas'}
          </div>
        </div>
      </div>

      {/* 5. Bottom Info Callout (Image 0, 1, 2) */}
      <div className="flex items-start gap-2.5 text-xs text-neutral-500 mt-6 bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
        <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-neutral-800">
            Kasbon dari kasir atau catatan manual, tetap terpantau.
          </p>
          <p className="text-neutral-500 mt-0.5">
            Gunakan Kasbon / Utang saat berjualan, atau Tambah Catatan untuk mencatat piutang pelanggan secara langsung.
          </p>
        </div>
      </div>

      {/* 6. Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-400 font-medium pt-8 pb-4 border-t border-neutral-200/60 mt-8">
        <span>Wadira | Meja operasional warung</span>
        <span>Buku Piutang &amp; Kasbon Warung Madura</span>
      </div>

      {/* MODAL 1: Catat Kasbon Baru (Image 3) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl relative border border-neutral-200">
            {/* Modal Lime Green Header */}
            <div className="bg-[#cbf14e] px-6 py-5 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold tracking-wider text-[#354614] uppercase block">
                  BUKU PIUTANG / CATATAN MANUAL
                </span>
                <h3 className="text-xl font-black text-[#1c240d] mt-0.5">
                  Catat kasbon baru
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-xs cursor-pointer transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-xs text-neutral-500 mb-4">
                Lengkapi informasi pelanggan dan nilai kasbon. Kolom bertanda * wajib diisi.
              </p>

              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="space-y-4">
                {/* Nama Pelanggan */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Nama pelanggan *
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    required
                    placeholder="Masukkan nama pelanggan"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#465427] shadow-xs"
                  />
                </div>

                {/* Nomor HP / WhatsApp */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Nomor HP / WhatsApp
                  </label>
                  <input
                    type="tel"
                    name="customer_phone"
                    placeholder="Masukkan nomor WhatsApp"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#465427] shadow-xs"
                  />
                  <span className="text-[11px] text-neutral-400 mt-1 block">
                    Digunakan untuk notifikasi tagihan pelanggan.
                  </span>
                </div>

                {/* Grid 2 Cols: Jumlah & Jatuh Tempo */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Jumlah kasbon (Rp) *
                    </label>
                    <input
                      type="number"
                      name="amount"
                      required
                      min="500"
                      step="500"
                      placeholder="Masukkan jumlah kasbon"
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#465427] shadow-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Jatuh tempo *
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      required
                      defaultValue={defaultDueDate}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-[#465427] shadow-xs font-medium"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between mt-4">
                  <span className="text-[11px] text-neutral-400">
                    Belum ada catatan yang disimpan.
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Batal</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{loading ? 'Menyimpan...' : 'Simpan Catatan'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Catatan Piutang */}
      {isEditModalOpen && editDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl relative border border-neutral-200">
            {/* Modal Lime Green Header Matching Modal 1 & 3 */}
            <div className="bg-[#cbf14e] px-6 py-5 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold tracking-wider text-[#354614] uppercase block">
                  PERBARUI DATA
                </span>
                <h3 className="text-xl font-black text-[#1c240d] mt-0.5">
                  Edit Catatan Kasbon
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-xs cursor-pointer transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>

            <div className="p-6">
              <p className="text-xs text-neutral-500 mb-4">
                Perbarui informasi pelanggan dan nilai kasbon. Klik simpan setelah selesai.
              </p>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <input type="hidden" name="id" value={editDebt.id} />
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Nama Pelanggan *
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    required
                    defaultValue={editDebt.customer_name}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-[#465427] focus:ring-1 focus:ring-[#465427] shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Nomor WhatsApp
                  </label>
                  <input
                    type="tel"
                    name="customer_phone"
                    defaultValue={editDebt.customer_phone || ''}
                    placeholder="Contoh: 08123456789"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-[#465427] focus:ring-1 focus:ring-[#465427] shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Jumlah Kasbon (Rp) *
                    </label>
                    <input
                      type="number"
                      name="amount"
                      required
                      min="500"
                      step="500"
                      defaultValue={editDebt.amount}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 font-bold focus:outline-none focus:border-[#465427] focus:ring-1 focus:ring-[#465427] shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Jatuh Tempo *
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      required
                      defaultValue={
                        editDebt.due_date
                          ? new Date(editDebt.due_date).toISOString().split('T')[0]
                          : ''
                      }
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-[#465427] focus:ring-1 focus:ring-[#465427] shadow-xs font-medium"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setDeleteDebtTarget(editDebt);
                    }}
                    className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Catatan</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Batal</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2.5 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Kirim Tagihan WhatsApp Preview */}
      {previewDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl relative border border-neutral-200">
            {/* Modal Lime Green Header Matching Modal 1 */}
            <div className="bg-[#cbf14e] px-6 py-5 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold tracking-wider text-[#354614] uppercase block">
                  PENGINGAT KASBON
                </span>
                <h3 className="text-xl font-black text-[#1c240d] mt-0.5">
                  Kirim Pesan WhatsApp
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDebt(null)}
                className="bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-xs cursor-pointer transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Context Summary Card */}
              <div className="p-3 bg-[#f6fbe9] border border-[#e2f3b8] rounded-2xl flex items-center justify-between text-xs text-[#2c3810]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#cbf14e] text-[#1c240d] flex items-center justify-center font-bold text-xs shadow-2xs">
                    👤
                  </div>
                  <div>
                    <div className="font-bold text-neutral-900 text-xs">
                      {previewDebt.customer_name}
                    </div>
                    <div className="text-[11px] text-neutral-500 font-medium">
                      Kasbon: <span className="font-bold text-neutral-900">Rp {previewDebt.amount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-[11px]">
                  <span className="text-neutral-500 block">Jatuh Tempo</span>
                  <span className="font-bold text-neutral-800">
                    {previewDebt.due_date ? new Date(previewDebt.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Nomor WhatsApp Pelanggan
                </label>
                <input
                  type="tel"
                  value={previewPhone}
                  onChange={(e) => setPreviewPhone(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-[#465427] focus:ring-1 focus:ring-[#465427] shadow-xs font-medium"
                />
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  Nomor akan dinormalisasi otomatis ke format WhatsApp resmi (+62).
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-700">
                    Isi Pesan WhatsApp
                  </label>
                  <span className="text-[10px] font-semibold text-neutral-400">
                    Dapat diedit sebelum dikirim
                  </span>
                </div>
                <textarea
                  value={previewMessage}
                  onChange={(e) => setPreviewMessage(e.target.value)}
                  rows={7}
                  className="w-full bg-neutral-50/70 hover:bg-white border border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-800 leading-relaxed focus:outline-none focus:bg-white focus:border-[#465427] focus:ring-1 focus:ring-[#465427] shadow-xs resize-none font-sans transition"
                />
              </div>

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => setPreviewDebt(null)}
                  className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const norm = normalisasiNomor(previewPhone);
                      if (!norm) {
                        alert('Nomor HP tidak valid');
                        return;
                      }
                      window.open(linkWa(norm, previewMessage), '_blank');
                    }}
                    className="px-5 py-2.5 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition cursor-pointer active:scale-[0.98]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Pesan WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Konfirmasi Ubah Status Kasbon */}
      {statusDebtTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-md shadow-2xl relative border border-neutral-200">
            {/* Header */}
            <div className="bg-[#cbf14e] px-6 py-5 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold tracking-wider text-[#354614] uppercase block">
                  KONFIRMASI STATUS
                </span>
                <h3 className="text-xl font-black text-[#1c240d] mt-0.5">
                  Ubah Status Kasbon
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStatusDebtTarget(null)}
                className="bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-xs cursor-pointer transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Info Card */}
              <div className="p-4 bg-[#f6fbe9] border border-[#e2f3b8] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase block tracking-wider">
                      Pelanggan
                    </span>
                    <p className="font-bold text-neutral-900 text-sm">
                      {statusDebtTarget.customer_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase block tracking-wider">
                      Nominal Kasbon
                    </span>
                    <p className="font-black text-[#1c240d] text-base">
                      Rp {statusDebtTarget.amount.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* Status change indicator */}
                <div className="pt-3 border-t border-[#e2f3b8] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 text-[11px] font-medium">Status saat ini:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        statusDebtTarget.status === 'PAID'
                          ? 'bg-[#eef5db] border-[#d6e5b4] text-[#465427]'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      {statusDebtTarget.status === 'PAID' ? 'LUNAS' : 'BELUM'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-neutral-600 text-[11px]">
                    <span>Diubah ke</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        statusDebtTarget.status === 'PAID'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-[#cbf14e] border-[#bde343] text-[#1c240d]'
                      }`}
                    >
                      {statusDebtTarget.status === 'PAID' ? 'BELUM' : 'LUNAS'}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed">
                {statusDebtTarget.status === 'UNPAID'
                  ? `Tandai tagihan kasbon sebesar Rp ${statusDebtTarget.amount.toLocaleString('id-ID')} milik ${statusDebtTarget.customer_name} sebagai LUNAS? Catatan ini akan dipindahkan ke riwayat pelunasan.`
                  : `Kembalikan tagihan kasbon sebesar Rp ${statusDebtTarget.amount.toLocaleString('id-ID')} milik ${statusDebtTarget.customer_name} menjadi BELUM LUNAS? Catatan ini akan kembali aktif di daftar tagihan.`}
              </p>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => setStatusDebtTarget(null)}
                  className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={confirmToggleStatus}
                  className="px-5 py-2.5 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {loading
                      ? 'Menyimpan...'
                      : statusDebtTarget.status === 'UNPAID'
                      ? 'Ya, Tandai Lunas'
                      : 'Ya, Kembalikan Belum Lunas'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Konfirmasi Hapus Kasbon */}
      {deleteDebtTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-md shadow-2xl relative border border-neutral-200">
            {/* Header Matching Modal 1, 2, 3, 4 */}
            <div className="bg-[#cbf14e] px-6 py-5 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold tracking-wider text-[#354614] uppercase block">
                  HAPUS CATATAN KASBON
                </span>
                <h3 className="text-xl font-black text-[#1c240d] mt-0.5">
                  Konfirmasi Hapus
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteDebtTarget(null)}
                className="bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-xs cursor-pointer transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Info Card */}
              <div className="p-4 bg-red-50/70 border border-red-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase block tracking-wider">
                        Pelanggan
                      </span>
                      <p className="font-bold text-neutral-900 text-sm">
                        {deleteDebtTarget.customer_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase block tracking-wider">
                      Nominal Kasbon
                    </span>
                    <p className="font-black text-red-700 text-base">
                      Rp {deleteDebtTarget.amount.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-red-200/60 flex items-center justify-between text-xs text-neutral-600">
                  <span>Jatuh Tempo:</span>
                  <span className="font-bold text-neutral-800">
                    {deleteDebtTarget.due_date
                      ? new Date(deleteDebtTarget.due_date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-600 leading-relaxed flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-neutral-800 mb-0.5">Tindakan tidak dapat dibatalkan</p>
                  <p className="text-[11px] text-neutral-500">
                    Data kasbon milik <span className="font-bold text-neutral-700">{deleteDebtTarget.customer_name}</span> akan dihapus permanen dari buku catatan piutang warung.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => setDeleteDebtTarget(null)}
                  className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={confirmDeleteDebt}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{loading ? 'Menghapus...' : 'Ya, Hapus Catatan'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
