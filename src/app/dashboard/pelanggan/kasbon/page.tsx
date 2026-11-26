'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  User,
  Receipt,
  RefreshCw,
  LogIn,
  Clock,
  Send,
  ShoppingBag,
  XCircle,
} from 'lucide-react';
import type { Debt, UserSession } from '@/types';

interface PaymentLog {
  id: string;
  debt_id: string;
  amount_paid: number;
  payment_method: string;
  notes?: string;
  payment_date?: string;
  created_at?: string;
}

export default function KasbonPelangganPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const [debts, setDebts] = useState<Debt[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [isLoadingDebts, setIsLoadingDebts] = useState(true);
  const [requireLogin, setRequireLogin] = useState(false);

  // Filter Tab: 'SEMUA' | 'BELANJA' | 'PEMBAYARAN'
  const [activeTab, setActiveTab] = useState<'SEMUA' | 'BELANJA' | 'PEMBAYARAN'>('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');

  // Sesi User
  const fetchSession = async () => {
    try {
      setIsLoadingSession(true);
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      const data = await res.json();
      if (data?.success && data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Data Kasbon
  const fetchDebts = async (customSearch?: string) => {
    try {
      setIsLoadingDebts(true);
      const searchParam = typeof customSearch === 'string' ? customSearch : searchQuery;
      const url = searchParam
        ? `/api/customer/debts?search=${encodeURIComponent(searchParam)}`
        : '/api/customer/debts';

      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();

      if (data?.success) {
        setDebts(data.debts || []);
        setPaymentLogs(data.paymentLogs || []);
        setRequireLogin(Boolean(data.requireLogin));
      } else {
        setDebts([]);
        setPaymentLogs([]);
      }
    } catch (err) {
      console.error('Gagal mengambil data kasbon:', err);
    } finally {
      setIsLoadingDebts(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (!isLoadingSession) {
      fetchDebts();
    }
  }, [isLoadingSession]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  // Kategorisasi Debts
  const activeDebts = useMemo(() => {
    return debts.filter((d) => d.status === 'UNPAID' || d.status === 'PARTIAL');
  }, [debts]);

  const pendingDebts = useMemo(() => {
    return debts.filter((d) => d.status === 'PENDING_APPROVAL');
  }, [debts]);

  const paidDebts = useMemo(() => {
    return debts.filter((d) => d.status === 'PAID');
  }, [debts]);

  const rejectedDebts = useMemo(() => {
    return debts.filter((d) => d.status === 'REJECTED');
  }, [debts]);

  // Ringkasan Finansial Kasbon
  const totalRemaining = useMemo(() => {
    return activeDebts.reduce((acc, curr) => {
      const rem = Number(curr.remaining_amount ?? (curr.amount - (curr.paid_amount || 0)));
      return acc + rem;
    }, 0);
  }, [activeDebts]);

  const totalPending = useMemo(() => {
    return pendingDebts.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [pendingDebts]);

  const totalPaid = useMemo(() => {
    return paidDebts.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) +
      activeDebts.reduce((acc, curr) => acc + Number(curr.paid_amount || 0), 0);
  }, [paidDebts, activeDebts]);

  // Tanggal Jatuh Tempo Terdekat dari Kasbon Aktif
  const closestDueDate = useMemo(() => {
    if (activeDebts.length === 0) return '-';
    const sorted = [...activeDebts].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );
    return formatDate(sorted[0].due_date);
  }, [activeDebts]);

  // Nama & Detail Pelanggan
  const customerDisplayName = useMemo(() => {
    if (debts.length > 0 && debts[0].customer_name) {
      return debts[0].customer_name;
    }
    if (user?.owner_name) return user.owner_name;
    return 'Pelanggan Wadira';
  }, [debts, user]);

  const customerPhone = useMemo(() => {
    if (debts.length > 0 && debts[0].customer_phone) {
      return debts[0].customer_phone;
    }
    if (user?.phone_number) return user.phone_number;
    return '0895-1620-1846';
  }, [debts, user]);

  // Bangun daftar mutasi riwayat kasbon yang sudah disetujui (Belanja & Pembayaran)
  const ledgerEntries = useMemo(() => {
    const list: {
      id: string;
      date: string;
      type: 'belanja' | 'pembayaran';
      title: string;
      subtitle: string;
      status: string;
      mutation: number;
      remaining: number;
    }[] = [];

    // Hanya kasbon yang telah disetujui / aktif / lunas yang masuk ke buku saldo
    const confirmedDebts = debts.filter(
      (d) => d.status === 'UNPAID' || d.status === 'PARTIAL' || d.status === 'PAID'
    );

    const sortedDebts = [...confirmedDebts].sort(
      (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
    );

    let runningBalance = 0;

    for (const d of sortedDebts) {
      runningBalance += Number(d.amount);
      list.push({
        id: `debt-${d.id}`,
        date: d.created_at || '',
        type: 'belanja',
        title: 'Belanja warung (Disetujui)',
        subtitle: d.notes || `WADIRA-${d.id.slice(0, 4).toUpperCase()} • Jatuh tempo ${formatDate(d.due_date)}`,
        status: d.status,
        mutation: Number(d.amount),
        remaining: runningBalance,
      });

      const relatedLogs = paymentLogs.filter((l) => l.debt_id === d.id);
      if (relatedLogs.length > 0) {
        for (const l of relatedLogs) {
          runningBalance -= Number(l.amount_paid);
          list.push({
            id: `pay-${l.id}`,
            date: l.payment_date || l.created_at || '',
            type: 'pembayaran',
            title: 'Pembayaran kasbon',
            subtitle: `${l.payment_method || 'Tunai'} • diterima kasir Wadira`,
            status: 'PAID',
            mutation: -Number(l.amount_paid),
            remaining: Math.max(0, runningBalance),
          });
        }
      } else if (d.paid_amount && d.paid_amount > 0) {
        runningBalance -= Number(d.paid_amount);
        list.push({
          id: `pay-fallback-${d.id}`,
          date: d.updated_at || d.created_at || '',
          type: 'pembayaran',
          title: 'Pembayaran kasbon',
          subtitle: 'Tunai • diterima kasir Wadira',
          status: 'PAID',
          mutation: -Number(d.paid_amount),
          remaining: Math.max(0, runningBalance),
        });
      }
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [debts, paymentLogs]);

  const filteredLedger = useMemo(() => {
    if (activeTab === 'BELANJA') {
      return ledgerEntries.filter((e) => e.type === 'belanja');
    }
    if (activeTab === 'PEMBAYARAN') {
      return ledgerEntries.filter((e) => e.type === 'pembayaran');
    }
    return ledgerEntries;
  }, [ledgerEntries, activeTab]);

  const dateRangeText = useMemo(() => {
    if (ledgerEntries.length === 0) return 'Belum ada transaksi';
    const dates = ledgerEntries.map((e) => e.date).filter(Boolean);
    if (dates.length === 0) return '';
    const earliest = formatDate(dates[dates.length - 1]);
    const latest = formatDate(dates[0]);
    return earliest === latest ? earliest : `${earliest} – ${latest}`;
  }, [ledgerEntries]);

  const waPaymentLink = `https://wa.me/6289516201846?text=${encodeURIComponent(
    `Halo Toko Wadira, saya atas nama *${customerDisplayName}* ingin konfirmasi pembayaran kasbon.\n` +
      `Sisa tagihan saya saat ini: ${formatRupiah(totalRemaining)}.\n` +
      `Mohon info rekening atau QRIS untuk pelunasan. Terima kasih.`
  )}`;

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase block">
            BUKU KASBON PELANGGAN
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral-950 tracking-tight">
            Kasbon saya, jelas catatannya.
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Pantau tagihan kasbon barang, status persetujuan pesanan keranjang, dan riwayat cicilan Anda di Toko Wadira.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {/* Tombol Belanja & Ajukan di Keranjang */}
          <Link
            href="/dashboard/pelanggan"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#cbf14e] hover:bg-[#bde53f] text-[#1c240d] font-bold text-xs sm:text-sm shadow-xs transition-colors"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.25]" />
            <span>Belanja Barang</span>
          </Link>

          {/* Tombol Tanya Pembayaran WhatsApp */}
          <a
            href={waPaymentLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Tanya Pembayaran</span>
          </a>
        </div>
      </div>

      {/* Notifikasi Login jika belum masuk */}
      {!isLoadingSession && !user && requireLogin && (
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white">
              Buku Kasbon Pribadi Anda
            </h3>
            <p className="text-xs text-neutral-300">
              Masuk dengan akun Google untuk melihat catatan utang dan transaksi yang terhubung ke nomor Anda.
            </p>
          </div>

          <Link
            href="/login?redirect=/dashboard/pelanggan/kasbon"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#cbf14e] text-[#1c240d] font-bold text-xs transition-colors shrink-0"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk dengan Google</span>
          </Link>
        </div>
      )}

      {/* 2. Top Metric Cards (Tanpa Limit, Berbasis Persetujuan) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Tagihan Aktif (Merah) */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-red-600">
            <BookOpen className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              TOTAL TAGIHAN AKTIF
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">
            {formatRupiah(totalRemaining)}
          </div>
          <p className="text-xs text-neutral-500">
            {activeDebts.length > 0
              ? `${activeDebts.length} kasbon aktif disetujui kasir.`
              : 'Tidak ada tagihan kasbon aktif saat ini.'}
          </p>
        </div>

        {/* Card 2: Menunggu Persetujuan (Kuning / Oranye) */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-amber-700">
            <Clock className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              MENUNGGU PERSETUJUAN
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
            {formatRupiah(totalPending)}
          </div>
          <p className="text-xs text-neutral-500">
            {pendingDebts.length > 0
              ? `${pendingDebts.length} pengajuan sedang ditinjau kasir/admin.`
              : 'Tidak ada pengajuan kasbon yang tertunda.'}
          </p>
        </div>

        {/* Card 3: Total Sudah Dilunasi (Hijau) */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              TOTAL SUDAH DILUNASI
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            {formatRupiah(totalPaid)}
          </div>
          <p className="text-xs text-neutral-500">
            Riwayat cicilan & kasbon yang lunas tercatat.
          </p>
        </div>
      </div>

      {/* 3. Section Khusus: Daftar Pengajuan Menunggu Persetujuan */}
      {pendingDebts.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Pengajuan Kasbon Anda Menunggu Verifikasi ({pendingDebts.length})
                </h3>
                <p className="text-xs text-amber-700">
                  Kasir Toko Wadira akan meninjau dan memberi persetujuan sebelum dana/barang dapat diambil.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingDebts.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-amber-200 p-4 space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-neutral-500">
                    {formatDate(item.created_at)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Menunggu Izin Admin
                  </span>
                </div>

                <div className="text-lg font-black text-neutral-900">
                  {formatRupiah(item.amount)}
                </div>

                <div className="text-xs text-neutral-600 space-y-1">
                  <div>
                    <span className="font-semibold text-neutral-700">Rencana Jatuh Tempo:</span>{' '}
                    {formatDate(item.due_date)}
                  </div>
                  {item.notes && (
                    <div className="text-[11px] text-neutral-500 italic line-clamp-2">
                      &ldquo;{item.notes}&rdquo;
                    </div>
                  )}
                </div>

                <a
                  href={`https://wa.me/6289516201846?text=${encodeURIComponent(
                    `Halo Toko Wadira, saya atas nama *${item.customer_name}* mengajukan kasbon barang sebesar ${formatRupiah(
                      item.amount
                    )} pada ${formatDate(item.created_at)}. Mohon konfirmasi persetujuan. Terima kasih.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send className="w-3 h-3 text-[#465427]" />
                  <span>Kirim Pesan WhatsApp ke Warung</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Buku Kasbon & Mutasi (~65%) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
            {/* Header Riwayat Kasbon & Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                  Buku catatan kasbon
                </h2>
                <p className="text-xs text-neutral-500">
                  Riwayat transaksi belanja tempo dan pelunasan yang telah disetujui.
                </p>
              </div>

              {/* Tabs: Semua | Belanja | Pembayaran */}
              <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl self-start sm:self-auto">
                {(
                  [
                    { label: 'Semua', val: 'SEMUA' },
                    { label: 'Belanja', val: 'BELANJA' },
                    { label: 'Pembayaran', val: 'PEMBAYARAN' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.val}
                    type="button"
                    onClick={() => setActiveTab(tab.val)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      activeTab === tab.val
                        ? 'bg-neutral-200 text-neutral-900 shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Riwayat Kasbon */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    <th className="py-2.5 font-bold">TANGGAL</th>
                    <th className="py-2.5 font-bold">KETERANGAN</th>
                    <th className="py-2.5 font-bold text-right">MUTASI</th>
                    <th className="py-2.5 font-bold text-right">SISA UTANG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {isLoadingDebts ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-neutral-500 font-medium">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#465427] mb-2" />
                        Memuat riwayat kasbon...
                      </td>
                    </tr>
                  ) : filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-neutral-500">
                        {activeTab === 'PEMBAYARAN'
                          ? 'Belum ada riwayat pembayaran yang tercatat.'
                          : activeTab === 'BELANJA'
                          ? 'Belum ada riwayat belanja tempo/kasbon aktif.'
                          : 'Tidak ada catatan kasbon aktif yang disetujui.'}
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((row) => (
                      <tr key={row.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3.5 pr-3 text-neutral-600 whitespace-nowrap align-top">
                          {formatDate(row.date)}
                        </td>
                        <td className="py-3.5 px-3 align-top">
                          <div className="font-bold text-neutral-900 text-xs sm:text-sm">
                            {row.title}
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            {row.subtitle}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap align-top">
                          <span
                            className={`font-bold text-xs sm:text-sm ${
                              row.type === 'pembayaran'
                                ? 'text-emerald-600'
                                : 'text-neutral-900'
                            }`}
                          >
                            {row.mutation > 0 ? `+${formatRupiah(row.mutation)}` : `-${formatRupiah(Math.abs(row.mutation))}`}
                          </span>
                        </td>
                        <td className="py-3.5 pl-3 text-right font-bold text-neutral-900 text-xs sm:text-sm whitespace-nowrap align-top">
                          {formatRupiah(row.remaining)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
              <span>
                {filteredLedger.length} catatan disetujui • {dateRangeText}
              </span>
              <span>Saldo awal Rp0</span>
            </div>
          </div>

          {/* Callout Banner: Ketentuan Kasbon Baru */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 sm:p-5 shadow-2xs flex items-start gap-3.5">
            <MessageSquare className="w-5 h-5 text-[#465427] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900">
                Cara Kasbon &amp; Pelunasan
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Untuk mengajukan kasbon barang secara online, masukkan barang ke Keranjang lalu pilih metode pembayaran <strong>Kasbon / Bayar Tempo</strong> saat checkout (wajib persetujuan kasir), atau ajukan langsung ke kasir saat berbelanja di warung.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar Widgets (~35%) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Pengingat Pembayaran */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-neutral-950">
              Pengingat Pembayaran
            </h3>

            {closestDueDate !== '-' ? (
              <div className="pt-1">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                  Jatuh tempo terdekat: {closestDueDate}
                </span>
              </div>
            ) : (
              <div className="pt-1">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Semua kasbon aman / tidak ada utang jatuh tempo
                </span>
              </div>
            )}

            <div className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight pt-1">
              {formatRupiah(totalRemaining)}
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Bisa dibayar langsung ke kasir warung. Jika ingin mencicil atau mengatur jadwal pelunasan, kabari Toko Wadira, ya.
            </p>

            <a
              href={waPaymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer mt-2"
            >
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
              <span>Konfirmasi Pelunasan ke Warung</span>
            </a>
          </div>

          {/* Card 2: Akun Kasbon Pelanggan */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-neutral-950 truncate">
              Akun kasbon {customerDisplayName}
            </h3>

            <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium">
              <User className="w-3.5 h-3.5 text-neutral-500" />
              <span>Pelanggan terdaftar</span>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              {customerDisplayName} • {customerPhone} • Perumnas Kamal, Kab. Bangkalan
            </p>

            <Link
              href="/dashboard/pelanggan/struk"
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer mt-2"
            >
              <Receipt className="w-3.5 h-3.5 text-neutral-600" />
              <span>Lihat struk belanja</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Section Riwayat Pengajuan Ditolak (jika ada) */}
      {rejectedDebts.length > 0 && (
        <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-red-800">
            <XCircle className="w-4 h-4 shrink-0" />
            <h3 className="text-sm font-bold">
              Pengajuan Kasbon Ditolak ({rejectedDebts.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rejectedDebts.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-red-200 p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-500">{formatDate(item.created_at)}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">Ditolak Admin</span>
                </div>
                <div className="font-black text-neutral-900 text-sm">{formatRupiah(item.amount)}</div>
                {item.notes && (
                  <p className="text-[11px] text-neutral-600 leading-relaxed line-clamp-3">{item.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Footer */}
      <footer className="pt-8 border-t border-neutral-200/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-400">
        <div>© 2026 Wadira Digital • Toko Wadira</div>
        <div>Belanja dekat rumah, tetap akrab.</div>
      </footer>
    </div>
  );
}
