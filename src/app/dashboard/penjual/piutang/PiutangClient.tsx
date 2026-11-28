'use client';

import { useState, FormEvent } from 'react';
import {
  addDebt,
  toggleDebtStatus,
  deleteDebt,
  updateLastBilled,
  updateDebtPhone,
  updateDebt,
  approveDebt,
  rejectDebt,
} from '@/app/actions/piutang';
import { hitungHariTelat, buatPesanTagih, normalisasiNomor, linkWa } from '@/lib/penagih';
import type { Debt } from '@/types';
import PayDebtModal from '@/components/penjual/PayDebtModal';
import PaymentLogsModal from '@/components/penjual/PaymentLogsModal';
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
  Coins,
  ShoppingBag,
  History,
  CreditCard,
  Check,
} from 'lucide-react';

interface PiutangClientProps {
  initialDebts: Debt[];
}

export default function PiutangClient({ initialDebts = [] }: PiutangClientProps) {
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [filter, setFilter] = useState<'ALL' | 'PENDING_APPROVAL' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'REJECTED'>('ALL');
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [payModalTarget, setPayModalTarget] = useState<Debt | null>(null);
  const [logsModalTarget, setLogsModalTarget] = useState<Debt | null>(null);
  const [previewDebt, setPreviewDebt] = useState<Debt | null>(null);
  const [previewMessage, setPreviewMessage] = useState('');
  const [previewPhone, setPreviewPhone] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [statusDebtTarget, setStatusDebtTarget] = useState<Debt | null>(null);
  const [deleteDebtTarget, setDeleteDebtTarget] = useState<Debt | null>(null);

  // Approval States
  const [approveTarget, setApproveTarget] = useState<Debt | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Debt | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Tagihan aktif: UNPAID atau PARTIAL
  const activeDebts = debts.filter((d) => d.status === 'UNPAID' || d.status === 'PARTIAL');
  const pendingDebts = debts.filter((d) => d.status === 'PENDING_APPROVAL');
  const paidDebts = debts.filter((d) => d.status === 'PAID');
  const rejectedDebts = debts.filter((d) => d.status === 'REJECTED');

  const totalPiutang = activeDebts.reduce((acc, curr) => {
    const rem = Number(curr.remaining_amount ?? (curr.amount - (curr.paid_amount || 0)));
    return acc + rem;
  }, 0);

  const totalPending = pendingDebts.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const totalLunas = debts.reduce((acc, curr) => {
    if (curr.status === 'PAID') return acc + curr.amount;
    return acc + (curr.paid_amount || 0);
  }, 0);

  const filteredDebts = debts.filter((d) => {
    const matchFilter = filter === 'ALL' || d.status === filter;
    const matchSearch =
      d.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      Boolean(d.customer_phone?.includes(search));
    return matchFilter && matchSearch;
  });

  const handleApproveConfirm = async () => {
    if (!approveTarget) return;
    setLoading(true);
    setErrorMessage('');
    const res = await approveDebt(approveTarget.id);
    if (res?.success) {
      setDebts((prev) =>
        prev.map((d) => (d.id === approveTarget.id ? { ...d, status: 'UNPAID' } : d))
      );
      setSuccessMessage(res.message || 'Kasbon berhasil disetujui!');
      setApproveTarget(null);
      setTimeout(() => setSuccessMessage(''), 4000);
    } else if (res?.error) {
      setErrorMessage(res.error);
    }
    setLoading(false);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setLoading(true);
    setErrorMessage('');
    const res = await rejectDebt(rejectTarget.id, rejectReason);
    if (res?.success) {
      const rejectNote = rejectReason?.trim() ? `[DITOLAK ADMIN: ${rejectReason.trim()}]` : '[DITOLAK ADMIN]';
      setDebts((prev) =>
        prev.map((d) =>
          d.id === rejectTarget.id
            ? { ...d, status: 'REJECTED', notes: d.notes ? `${d.notes} ${rejectNote}` : rejectNote }
            : d
        )
      );
      setSuccessMessage(res.message || 'Pengajuan kasbon telah ditolak.');
      setRejectTarget(null);
      setRejectReason('');
      setTimeout(() => setSuccessMessage(''), 4000);
    } else if (res?.error) {
      setErrorMessage(res.error);
    }
    setLoading(false);
  };

  const handleAddSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('type', 'BARANG');

    const res = await addDebt(formData);

    if (res?.error) {
      setErrorMessage(res.error);
      setLoading(false);
    } else {
      setSuccessMessage('Catatan kasbon berhasil ditambahkan!');
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
      setSuccessMessage('Catatan kasbon berhasil diperbarui!');
      setIsEditModalOpen(false);
      form.reset();
      setLoading(false);
      window.location.reload();
    }
  };

  const handlePaymentSuccess = (res: any) => {
    setSuccessMessage('Pembayaran kasbon berhasil dicatat!');
    window.location.reload();
  };

  const confirmToggleStatus = async () => {
    if (!statusDebtTarget) return;
    setLoading(true);
    const res = await toggleDebtStatus(statusDebtTarget.id, statusDebtTarget.status);
    if (res?.success && res.newStatus) {
      setDebts((prev) =>
        prev.map((d) =>
          d.id === statusDebtTarget.id
            ? {
                ...d,
                status: res.newStatus as Debt['status'],
                paid_amount: res.newStatus === 'PAID' ? d.amount : 0,
                remaining_amount: res.newStatus === 'PAID' ? 0 : d.amount,
              }
            : d
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
    <div className="flex flex-col w-full max-w-[1600px] mx-auto pb-12 font-sans">
      {/* 1. Breadcrumb & Page Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
        <div>
          <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase mb-1 block">
            KEUANGAN / BUKU PIUTANG
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Buku piutang &amp; kasbon warung
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Catat kasbon barang belanjaan warung, rekam cicilan bertahap, dan jaga kelancaran kas.
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
          <span>Tambah Kasbon Baru</span>
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && !isModalOpen && !approveTarget && !rejectTarget && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Top Metric Banner */}
      <div className="bg-[#cbf14e] rounded-2xl p-6 sm:p-7 shadow-xs mt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-6">
          <div>
            <div className="border-t border-[#1c240d]/15 pt-2.5 mb-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#354614] uppercase block">
                SISA PIUTANG AKTIF BELUM LUNAS
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-2xl sm:text-3xl font-black text-[#1c240d] tracking-tight">
                Rp {totalPiutang.toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-[#354614] font-semibold">
                {activeDebts.length} tagihan aktif
              </div>
            </div>
          </div>

          <div>
            <div className="border-t border-[#1c240d]/15 pt-2.5 mb-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#354614] uppercase block">
                PERLU PERSETUJUAN ADMIN
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-2xl sm:text-3xl font-black text-[#1c240d] tracking-tight">
                Rp {totalPending.toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-[#354614] font-semibold">
                {pendingDebts.length} pengajuan baru
              </div>
            </div>
          </div>

          <div>
            <div className="border-t border-[#1c240d]/15 pt-2.5 mb-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#354614] uppercase block">
                TOTAL KASBON TELAH DILUNASI
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-2xl sm:text-3xl font-black text-[#1c240d] tracking-tight">
                Rp {totalLunas.toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-[#354614] font-semibold">
                {paidDebts.length} lunas penuh
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-6">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md bg-white border border-neutral-200 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-xs focus-within:border-neutral-400 transition">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            placeholder="Cari nama pelanggan / nomor HP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs sm:text-sm font-medium text-neutral-800 placeholder:text-neutral-400 bg-transparent focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Hapus pencarian"
              className="text-neutral-400 hover:text-neutral-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Group: Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filter === 'ALL' ? 'bg-[#cbf14e] text-[#1c240d] font-bold shadow-2xs' : 'text-neutral-600'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setFilter('PENDING_APPROVAL')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                filter === 'PENDING_APPROVAL' ? 'bg-amber-400 text-neutral-950 font-bold shadow-2xs' : 'text-neutral-600'
              }`}
            >
              <span>Perlu Izin</span>
              {pendingDebts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-extrabold animate-pulse">
                  {pendingDebts.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNPAID')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filter === 'UNPAID' ? 'bg-[#cbf14e] text-[#1c240d] font-bold shadow-2xs' : 'text-neutral-600'
              }`}
            >
              Belum
            </button>
            <button
              type="button"
              onClick={() => setFilter('PARTIAL')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filter === 'PARTIAL' ? 'bg-[#cbf14e] text-[#1c240d] font-bold shadow-2xs' : 'text-neutral-600'
              }`}
            >
              Cicil
            </button>
            <button
              type="button"
              onClick={() => setFilter('PAID')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filter === 'PAID' ? 'bg-[#cbf14e] text-[#1c240d] font-bold shadow-2xs' : 'text-neutral-600'
              }`}
            >
              Lunas
            </button>
            <button
              type="button"
              onClick={() => setFilter('REJECTED')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filter === 'REJECTED' ? 'bg-neutral-300 text-neutral-900 font-bold shadow-2xs' : 'text-neutral-600'
              }`}
            >
              Ditolak
            </button>
          </div>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs mt-4 overflow-hidden">
        {/* Table Header */}
        <div className="bg-[#eef3e2] border-b border-neutral-200/80 px-5 py-3">
          <div className="grid grid-cols-12 gap-3 text-[11px] font-extrabold tracking-wider text-neutral-600 uppercase">
            <div className="col-span-3">PELANGGAN</div>
            <div className="col-span-2">TOTAL &amp; SUDAH BAYAR</div>
            <div className="col-span-2">SISA KASBON</div>
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
              const isOverdue =
                (debt.status === 'UNPAID' || debt.status === 'PARTIAL') && hariTelat > 0;
              const paidAmount = Number(debt.paid_amount) || 0;
              const remainingAmount = Number(debt.remaining_amount ?? (debt.amount - paidAmount));

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
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-neutral-900 text-xs sm:text-sm">
                          {debt.customer_name}
                        </p>
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        {debt.customer_phone || '-'}
                      </div>
                      {debt.notes && (
                        <p className="text-[10px] text-neutral-500 italic line-clamp-2 max-w-xs mt-0.5" title={debt.notes}>
                          {debt.notes}
                        </p>
                      )}
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                          Terlewat {hariTelat} hari
                        </span>
                      )}
                    </div>

                    {/* Total Utang & Sudah Bayar */}
                    <div className="col-span-2">
                      <div className="font-bold text-neutral-900 text-xs">
                        Rp {debt.amount.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        Dibayar: Rp {paidAmount.toLocaleString('id-ID')}
                      </div>
                    </div>

                    {/* Sisa Kasbon */}
                    <div className="col-span-2">
                      <div
                        className={`font-black text-xs sm:text-sm ${
                          debt.status === 'PAID'
                            ? 'text-neutral-400 line-through'
                            : 'text-rose-600'
                        }`}
                      >
                        Rp {remainingAmount.toLocaleString('id-ID')}
                      </div>
                      {paidAmount > 0 && debt.status !== 'PAID' && (
                        <span className="text-[10px] text-amber-700 font-bold block mt-0.5">
                          Tersisa {Math.round((remainingAmount / debt.amount) * 100)}%
                        </span>
                      )}
                    </div>

                    {/* Jatuh Tempo */}
                    <div className="col-span-2 text-neutral-700 font-medium">
                      {new Date(debt.due_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>

                    {/* Status Badge */}
                    <div className="col-span-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          debt.status === 'PAID'
                            ? 'bg-[#eef5db] border-[#d6e5b4] text-[#465427]'
                            : debt.status === 'PARTIAL'
                            ? 'bg-amber-100 border-amber-300 text-amber-800'
                            : debt.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-100 border-amber-400 text-amber-900 font-black'
                            : debt.status === 'REJECTED'
                            ? 'bg-neutral-100 border-neutral-300 text-neutral-600'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        {debt.status === 'PAID'
                          ? 'LUNAS'
                          : debt.status === 'PARTIAL'
                          ? 'CICIL'
                          : debt.status === 'PENDING_APPROVAL'
                          ? 'PERLU IZIN'
                          : debt.status === 'REJECTED'
                          ? 'DITOLAK'
                          : 'BELUM'}
                      </span>
                    </div>

                    {/* Aksi */}
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      {debt.status === 'PENDING_APPROVAL' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setApproveTarget(debt)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                            title="Setujui pengajuan kasbon"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Setujui</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectTarget(debt);
                              setRejectReason('');
                            }}
                            className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                            title="Tolak pengajuan kasbon"
                          >
                            <X className="w-3 h-3" />
                            <span>Tolak</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Tombol Bayar / Cicil */}
                          {debt.status !== 'PAID' && debt.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => setPayModalTarget(debt)}
                              className="px-2.5 py-1 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                              title="Catat pelunasan atau cicilan"
                            >
                              <Coins className="w-3 h-3" />
                              <span>Bayar</span>
                            </button>
                          )}

                          {/* Tombol Riwayat Log Pembayaran */}
                          {debt.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => setLogsModalTarget(debt)}
                              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
                              title="Lihat riwayat cicilan"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Tombol Tagih WA */}
                          {debt.status !== 'PAID' && debt.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => {
                                const msg = buatPesanTagih({
                                  nama: debt.customer_name,
                                  nominal: remainingAmount,
                                  hariTelat: hariTelat,
                                  toko: 'Wadira',
                                });
                                setPreviewMessage(msg);
                                setPreviewDebt(debt);
                                setPreviewPhone(debt.customer_phone || '');
                              }}
                              className="p-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Kirim tagihan WhatsApp"
                            >
                              <Send className="w-3 h-3" />
                            </button>
                          )}

                          {/* Edit */}
                          {debt.status !== 'REJECTED' && (
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
                          )}

                          {/* Hapus */}
                          <button
                            type="button"
                            onClick={() => setDeleteDebtTarget(debt)}
                            className="p-1 text-neutral-400 hover:text-red-600 transition cursor-pointer rounded"
                            title="Hapus catatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 sm:p-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#eef5db] text-[#465427] flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-neutral-900">
                Belum ada catatan kasbon yang cocok.
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-xl leading-relaxed">
                Tambahkan catatan kasbon baru untuk mulai memantau utang pelanggan warung.
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
                <span>Catat Kasbon Baru</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="px-5 py-3.5 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-2 bg-[#fbfcfa]">
          <div>{filteredDebts.length} catatan kasbon ditampilkan</div>
          <div>Filter Status: {filter}</div>
        </div>
      </div>

      {/* 5. Bottom Info Callout */}
      <div className="flex items-start gap-2.5 text-xs text-neutral-500 mt-6 bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
        <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-neutral-800">
            Catatan kasbon belanja barang warung Madura tersimpan rapi.
          </p>
          <p className="text-neutral-500 mt-0.5">
            Pelanggan dapat melunasi atau mencicil tagihan belanja barangnya. Setiap cicilan tercatat otomatis di buku kasbon.
          </p>
        </div>
      </div>

      {/* MODAL 1: Catat Kasbon Baru ([DEL-5] Barang vs Pinjaman Tunai) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl relative border border-neutral-200">
            <div className="bg-[#cbf14e] px-6 py-5 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold tracking-wider text-[#354614] uppercase block">
                  BUKU PIUTANG / CATATAN BARU
                </span>
                <h3 className="text-xl font-black text-[#1c240d] mt-0.5">
                  Catat Kasbon Pelanggan
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

            <div className="p-6">
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
                    Nama Pelanggan *
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    required
                    placeholder="Contoh: Pak Budi / Bu Siti"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#465427] shadow-xs"
                  />
                </div>

                {/* Nomor WhatsApp */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Nomor HP / WhatsApp Pelanggan
                  </label>
                  <input
                    type="tel"
                    name="customer_phone"
                    placeholder="Contoh: 08123456789"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#465427] shadow-xs"
                  />
                </div>

                {/* Nominal & Jatuh Tempo */}
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
                      placeholder="Contoh: 50000"
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 font-extrabold focus:outline-none focus:border-[#465427] shadow-xs"
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
                      defaultValue={defaultDueDate}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-[#465427] shadow-xs font-medium"
                    />
                  </div>
                </div>

                {/* Catatan */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Keterangan Barang Belanjaan (Opsional)
                  </label>
                  <input
                    type="text"
                    name="notes"
                    placeholder="Contoh: Beras 5kg, Telur 1kg, Minyak 1L"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#465427] shadow-xs"
                  />
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{loading ? 'Menyimpan...' : 'Simpan Kasbon'}</span>
                  </button>
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
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-[#465427] shadow-xs font-bold"
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
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-[#465427] shadow-xs"
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
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 font-bold focus:outline-none focus:border-[#465427] shadow-xs"
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
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-[#465427] shadow-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Keterangan
                  </label>
                  <input
                    type="text"
                    name="notes"
                    defaultValue={editDebt.notes || ''}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs text-neutral-800 focus:outline-none focus:border-[#465427] shadow-xs"
                  />
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
                      className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2.5 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
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

      {/* MODAL 3: Tagih WA Preview */}
      {previewDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl relative border border-neutral-200">
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
              <div className="p-3 bg-[#f6fbe9] border border-[#e2f3b8] rounded-2xl flex items-center justify-between text-xs text-[#2c3810]">
                <div>
                  <div className="font-bold text-neutral-900 text-xs">{previewDebt.customer_name}</div>
                  <div className="text-[11px] text-neutral-500 font-medium">
                    Sisa Kasbon: <span className="font-bold text-rose-700">Rp {Number(previewDebt.remaining_amount ?? previewDebt.amount).toLocaleString('id-ID')}</span>
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
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-[#465427] shadow-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Isi Pesan WhatsApp
                </label>
                <textarea
                  rows={4}
                  value={previewMessage}
                  onChange={(e) => setPreviewMessage(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-xs text-neutral-800 focus:outline-none focus:border-[#465427] shadow-xs font-sans leading-relaxed resize-none"
                />
              </div>

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDebt(null)}
                  className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 transition cursor-pointer"
                >
                  Batal
                </button>

                <a
                  href={linkWa(previewPhone, previewMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    updateLastBilled(previewDebt.id);
                    if (previewPhone !== previewDebt.customer_phone) {
                      updateDebtPhone(previewDebt.id, previewPhone);
                    }
                    setPreviewDebt(null);
                  }}
                  className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Buka WhatsApp &amp; Kirim</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Bayar / Cicil Kasbon */}
      <PayDebtModal
        debt={payModalTarget}
        isOpen={Boolean(payModalTarget)}
        onClose={() => setPayModalTarget(null)}
        onSuccess={handlePaymentSuccess}
      />

      {/* MODAL 5: Riwayat Cicilan (Payment Logs) */}
      <PaymentLogsModal
        debt={logsModalTarget}
        isOpen={Boolean(logsModalTarget)}
        onClose={() => setLogsModalTarget(null)}
      />

      {/* CONFIRM DELETE MODAL */}
      {deleteDebtTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-sm p-6 shadow-2xl relative border border-neutral-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-neutral-900 text-base">Hapus Catatan Kasbon?</h4>
              <p className="text-xs text-neutral-500 mt-1">
                Catatan kasbon milik <strong>{deleteDebtTarget.customer_name}</strong> dan seluruh riwayat cicilannya akan dihapus permanen.
              </p>
            </div>
            <div className="flex items-center gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeleteDebtTarget(null)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-xs font-bold text-neutral-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteDebt}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {loading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM APPROVE MODAL */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-md p-6 shadow-2xl relative border border-neutral-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h4 className="font-extrabold text-neutral-900 text-base">Setujui Kasbon Pelanggan?</h4>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Pengajuan kasbon atas nama <strong>{approveTarget.customer_name}</strong> sebesar{' '}
                <strong className="text-neutral-900">Rp {approveTarget.amount.toLocaleString('id-ID')}</strong> (Kasbon Barang) akan disetujui dan dicatat ke buku kasbon aktif warung.
              </p>
            </div>
            {approveTarget.notes && (
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-left text-[11px] text-neutral-700 leading-relaxed max-h-32 overflow-y-auto">
                <span className="font-bold text-neutral-900 block mb-0.5">Rincian Barang / Catatan:</span>
                {approveTarget.notes}
              </div>
            )}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div className="flex items-center gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setApproveTarget(null);
                  setErrorMessage('');
                }}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-xs font-bold text-neutral-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApproveConfirm}
                disabled={loading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Ya, Setujui Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-md p-6 shadow-2xl relative border border-neutral-200 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <X className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="font-extrabold text-neutral-900 text-base">Tolak Pengajuan Kasbon</h4>
                <p className="text-xs text-neutral-500">
                  Pemohon: <strong>{rejectTarget.customer_name}</strong> (Rp {rejectTarget.amount.toLocaleString('id-ID')})
                </p>
              </div>
            </div>

            {rejectTarget.notes && (
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-[11px] text-neutral-700 leading-relaxed max-h-28 overflow-y-auto">
                <span className="font-bold text-neutral-900 block mb-0.5">Rincian Pengajuan:</span>
                {rejectTarget.notes}
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Alasan Penolakan (Opsional)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Masih ada tunggakan kasbon sebelumnya yang belum dilunasi."
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setErrorMessage('');
                }}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-xs font-bold text-neutral-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={loading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Tolak Pengajuan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
