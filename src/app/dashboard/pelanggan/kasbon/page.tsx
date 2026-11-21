'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  MessageSquare,
  User,
  Receipt,
  Search,
  RefreshCw,
  LogIn,
  X,
  ChevronRight,
  Phone,
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

  // Search
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

  // Plafon Limit Kasbon (Kredit dari Toko Wadira)
  const LIMIT_KASBON = 500000;

  // Ringkasan Utang
  const totalRemaining = useMemo(() => {
    return debts.reduce((acc, curr) => {
      if (curr.status === 'PAID') return acc;
      const rem = Number(curr.remaining_amount ?? (curr.amount - (curr.paid_amount || 0)));
      return acc + rem;
    }, 0);
  }, [debts]);

  const sisaLimit = Math.max(0, LIMIT_KASBON - totalRemaining);
  const percentageUsed = Math.min(100, Math.round((totalRemaining / LIMIT_KASBON) * 100));

  // Tanggal Jatuh Tempo Terdekat
  const closestDueDate = useMemo(() => {
    const activeWithDue = debts.filter((d) => d.status !== 'PAID' && d.due_date);
    if (activeWithDue.length === 0) return '10 Nov 2026';
    return formatDate(activeWithDue[0].due_date);
  }, [debts]);

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

  // Bangun daftar mutasi riwayat kasbon (Belanja & Pembayaran)
  const ledgerEntries = useMemo(() => {
    const list: {
      id: string;
      date: string;
      type: 'belanja' | 'pembayaran';
      title: string;
      subtitle: string;
      mutation: number;
      remaining: number;
    }[] = [];

    // Urutkan debts dari yang paling awal untuk menghitung saldo berjalan
    const sortedDebts = [...debts].sort(
      (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
    );

    let runningBalance = 0;

    for (const d of sortedDebts) {
      runningBalance += Number(d.amount);
      list.push({
        id: `debt-${d.id}`,
        date: d.created_at || '',
        type: 'belanja',
        title: d.type === 'PINJAMAN_TUNAI' ? 'Pinjaman tunai' : 'Belanja warung',
        subtitle: d.notes || `WADIRA-${d.id.slice(0, 4).toUpperCase()} • Kebutuhan warung`,
        mutation: Number(d.amount),
        remaining: runningBalance,
      });

      // Cari pembayaran terkait
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
          mutation: -Number(d.paid_amount),
          remaining: Math.max(0, runningBalance),
        });
      }
    }

    // Urutkan kembali dari yang terbaru di atas untuk tabel
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [debts, paymentLogs]);

  // Filter Tab (Semua, Belanja, Pembayaran)
  const filteredLedger = useMemo(() => {
    if (activeTab === 'BELANJA') {
      return ledgerEntries.filter((e) => e.type === 'belanja');
    }
    if (activeTab === 'PEMBAYARAN') {
      return ledgerEntries.filter((e) => e.type === 'pembayaran');
    }
    return ledgerEntries;
  }, [ledgerEntries, activeTab]);

  // Rentang Tanggal Riwayat
  const dateRangeText = useMemo(() => {
    if (ledgerEntries.length === 0) return 'Belum ada transaksi';
    const dates = ledgerEntries.map((e) => e.date).filter(Boolean);
    if (dates.length === 0) return '';
    const earliest = formatDate(dates[dates.length - 1]);
    const latest = formatDate(dates[0]);
    return earliest === latest ? earliest : `${earliest} – ${latest}`;
  }, [ledgerEntries]);

  // WhatsApp Link Tanya Pembayaran
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
            Pantau utang dan sisa limit belanja Anda. Semua tercatat bersama warung tetangga.
          </p>
        </div>

        {/* Tombol Tanya Pembayaran (Hijau Lime) */}
        <a
          href={waPaymentLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#cbf14e] hover:bg-[#bde53f] text-[#1c240d] font-bold text-xs sm:text-sm shadow-xs transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>Tanya pembayaran</span>
        </a>
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

      {/* 2. Top 3 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Limit Kasbon */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-neutral-500">
            <CreditCard className="w-4 h-4 text-neutral-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              LIMIT KASBON
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            {formatRupiah(LIMIT_KASBON)}
          </div>
          <p className="text-xs text-neutral-500">
            Plafon kredit dari Toko Wadira.
          </p>
        </div>

        {/* Card 2: Pemakaian / Sisa Utang (Merah) */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-red-600">
            <BookOpen className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              PEMAKAIAN / SISA UTANG
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">
            {formatRupiah(totalRemaining)}
          </div>
          <p className="text-xs text-neutral-500">
            Saldo utang yang belum dibayar.
          </p>
        </div>

        {/* Card 3: Sisa Limit */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-neutral-600">
            <CheckCircle2 className="w-4 h-4 text-neutral-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              SISA LIMIT
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            {formatRupiah(sisaLimit)}
          </div>
          <p className="text-xs text-neutral-500">
            Limit tersedia untuk belanja berikutnya.
          </p>
        </div>
      </div>

      {/* 3. Progress Bar Card: Pemakaian Limit */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-neutral-900">
              Pemakaian limit
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eef5db] text-[#465427]">
              {percentageUsed}% terpakai
            </span>
          </div>
          <div className="text-xs font-medium text-neutral-500">
            {formatRupiah(totalRemaining)} dari {formatRupiah(LIMIT_KASBON)}
          </div>
        </div>

        {/* Track Bar */}
        <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-[#cbf14e] h-full rounded-full transition-all duration-300"
            style={{ width: `${percentageUsed}%` }}
          />
        </div>

        <p className="text-[11px] text-neutral-500 leading-relaxed">
          Limit bukan saldo uang. Pemakaian baru dicatat setelah disetujui kasir. Pesanan tunai yang masih draf tidak termasuk utang di atas.
        </p>
      </div>

      {/* 4. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Riwayat Kasbon (~65%) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
            {/* Header Riwayat Kasbon & Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-100">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                Riwayat kasbon
              </h2>

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
                          ? 'Belum ada riwayat belanja tempo/kasbon.'
                          : 'Tidak ada catatan riwayat kasbon aktif.'}
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
                {filteredLedger.length} catatan • {dateRangeText}
              </span>
              <span>Saldo awal Rp0</span>
            </div>
          </div>

          {/* Callout Banner: Ada catatan yang kurang sesuai? */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 sm:p-5 shadow-2xs flex items-start gap-3.5">
            <MessageSquare className="w-5 h-5 text-[#465427] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900">
                Ada catatan yang kurang sesuai?
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Simpan struk belanja dan hubungi Toko Wadira. Riwayat kasbon hanya dapat diperbarui oleh kasir setelah pembayaran diterima atau koreksi disepakati.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar Widgets (~35%) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Pengingat Pembayaran */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-neutral-950">
              Pengingat pembayaran
            </h3>

            {/* Pill Jatuh Tempo */}
            <div className="pt-1">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                Jatuh tempo {closestDueDate}
              </span>
            </div>

            {/* Nominal Tagihan Besar Merah */}
            <div className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight pt-1">
              {formatRupiah(totalRemaining)}
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Bisa dibayar langsung ke warung. Jika perlu mencicil atau mengatur tanggal, kabari Toko Wadira, ya.
            </p>

            <a
              href={waPaymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer mt-2"
            >
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
              <span>Lihat contoh pengingat</span>
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
              <span>Lihat struk terakhir</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Footer Sederhana Sesuai Referensi Gambar */}
      <footer className="pt-8 border-t border-neutral-200/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-400">
        <div>
          © 2026 Wadira Digital • Toko Wadira
        </div>
        <div>
          Belanja dekat rumah, tetap akrab.
        </div>
      </footer>
    </div>
  );
}
