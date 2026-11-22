'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { UserSession, Product, Debt } from '@/types';
import {
  Transaction,
  PeriodeFilter,
  filterByPeriode,
  hitungRingkasan,
  hitungPiutang,
  hitungNilaiPersediaan,
  buatBukuBesar,
} from '@/lib/ledger';
import {
  generateFinancialSummary,
  calculateTransactionProfit,
  type FinancialSummaryResult,
} from '@/lib/financial-analytics';
import { deleteTransaction } from '@/app/actions/transaksi';
import {
  History,
  Printer,
  Plus,
  FileText,
  BookOpen,
  Trash2,
  ChevronDown,
  Banknote,
  QrCode,
  CreditCard,
  TrendingUp,
  BarChart3,
  ExternalLink,
  Layers,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';

interface LaporanClientProps {
  user: UserSession | null;
  initialTransactions: Transaction[];
  products: Product[];
  debts: Debt[];
}

export default function LaporanClient({
  user,
  initialTransactions,
  products,
  debts,
}: LaporanClientProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [periode, setPeriode] = useState<PeriodeFilter>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Tab View: Riwayat Transaksi Lengkap vs Buku Besar vs Analitik Finansial (ZAKI DEL-7)
  const [viewTab, setViewTab] = useState<'RIWAYAT' | 'JURNAL' | 'ANALYTICS'>('RIWAYAT');
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [filterPayment, setFilterPayment] = useState<'ALL' | 'CASH' | 'QRIS' | 'CREDIT'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter transactions
  const filteredTrx = filterByPeriode(transactions, periode, customStart, customEnd);

  // Specific Type & Payment Method Filter for Riwayat view
  const displayTrx = filteredTrx.filter((t) => {
    if (filterType === 'IN' && t.type !== 'IN') return false;
    if (filterType === 'OUT' && t.type !== 'OUT') return false;
    if (filterPayment !== 'ALL' && t.payment_method !== filterPayment) return false;
    return true;
  });

  // Computations
  const ringkasan = hitungRingkasan(filteredTrx);
  const piutang = hitungPiutang(debts);
  const persediaan = hitungNilaiPersediaan(products);
  const bukuBesar = buatBukuBesar(filteredTrx, 0);

  const getPeriodeLabel = (p: PeriodeFilter) => {
    switch (p) {
      case 'ALL':
        return 'Semua waktu';
      case 'THIS_MONTH':
        return 'Bulan ini';
      case 'LAST_MONTH':
        return 'Bulan lalu';
      case 'LAST_3_MONTHS':
        return '3 bulan terakhir';
      case 'CUSTOM':
        if (customStart && customEnd) {
          return `${new Date(customStart).toLocaleDateString('id-ID')} - ${new Date(customEnd).toLocaleDateString('id-ID')}`;
        }
        return 'Kustom';
    }
  };

  // Mesin Analitik Finansial & HPP [ZAKI - TASK-79 & DEL-7]
  const financialSummary = useMemo(() => {
    return generateFinancialSummary(
      filteredTrx as any,
      debts,
      products,
      {
        name: getPeriodeLabel(periode),
        start_date: customStart || null,
        end_date: customEnd || null,
      }
    );
  }, [filteredTrx, debts, products, periode, customStart, customEnd]);

  // Map selisih harga jual dengan harga beli modal per transaksi [ZAKI DEL-7]
  const trxProfitMap = useMemo(() => {
    const map = new Map<string, { cogs: number; profit: number; margin: number }>();
    financialSummary.transactions_breakdown.forEach((t) => {
      map.set(t.transaction_id, {
        cogs: t.total_cogs,
        profit: t.gross_profit,
        margin: t.profit_margin_pct,
      });
    });
    return map;
  }, [financialSummary]);

  // Ringkasan per Metode Pembayaran Penjualan
  const penjualanTrx = filteredTrx.filter((t) => t.type === 'IN');
  const totalTunaiMasuk = penjualanTrx
    .filter((t) => t.payment_method === 'CASH')
    .reduce((sum, t) => sum + t.total_amount, 0);

  const totalQrisMasuk = penjualanTrx
    .filter((t) => t.payment_method === 'QRIS' && t.payment_status !== 'FAILED' && t.payment_status !== 'CANCEL')
    .reduce((sum, t) => sum + t.total_amount, 0);

  const totalKasbon = penjualanTrx
    .filter((t) => t.payment_method === 'CREDIT')
    .reduce((sum, t) => sum + t.total_amount, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteTrx = async (trxId: string) => {
    if (
      !confirm(
        'Apakah Anda yakin ingin membatalkan transaksi ini? Stok barang akan dikembalikan otomatis ke inventaris.'
      )
    ) {
      return;
    }

    setDeletingId(trxId);
    try {
      const res = await deleteTransaction(trxId, true);
      if (res.error) {
        alert(res.error);
      } else {
        setTransactions((prev) => prev.filter((t) => t.id !== trxId));
      }
    } catch (err: any) {
      alert('Gagal menghapus transaksi: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const displayCount =
    viewTab === 'RIWAYAT'
      ? displayTrx.length
      : viewTab === 'JURNAL'
        ? bukuBesar.length
        : financialSummary.top_products.length;

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto pb-12 font-sans print:max-w-none print:w-full print:bg-white print:text-black">
      {/* HEADER PRINT ONLY */}
      <div className="hidden print:block mb-8 text-center border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase">
          {user?.store_name || user?.warung_name || 'Warung Wadira'}
        </h1>
        <p className="text-sm">Laporan Keuangan, Pembukuan &amp; Riwayat Transaksi</p>
        <p className="text-sm mt-1">Periode: {getPeriodeLabel(periode)}</p>
        <p className="text-xs mt-1 italic">Tanggal Cetak: {todayStr}</p>
      </div>

      {/* 1. Page Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 print:hidden">
        <div>
          <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase mb-1 block">
            KEUANGAN / PEMBUKUAN
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Buku besar &amp; laporan
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Arus kas, laba rugi, piutang, dan persediaan dalam satu ruang pembukuan.
          </p>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Time Filter Select */}
          <div className="relative">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-800 shadow-xs transition cursor-pointer">
              <History className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
              <select
                value={periode}
                onChange={(e) => setPeriode(e.target.value as PeriodeFilter)}
                className="appearance-none bg-transparent pr-4 font-semibold text-xs text-neutral-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua waktu</option>
                <option value="THIS_MONTH">Bulan ini</option>
                <option value="LAST_MONTH">Bulan lalu</option>
                <option value="LAST_3_MONTHS">3 bulan terakhir</option>
                <option value="CUSTOM">Kustom tanggal</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Custom Date Pickers if selected */}
          {periode === 'CUSTOM' && (
            <div className="flex items-center gap-1.5 bg-white border border-neutral-300 rounded-xl px-2.5 py-1 text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-transparent text-xs focus:outline-none"
              />
              <span className="text-neutral-400">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-transparent text-xs focus:outline-none"
              />
            </div>
          )}

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-700" />
            <span>Cetak</span>
          </button>

          {/* CTA Kasir */}
          <Link
            href="/dashboard/penjual/transaksi"
            className="px-4 py-2 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Input transaksi / Kasir</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Metrics Box (Full-width Lime Green Container) */}
      <div className="bg-[#cbf14e] rounded-2xl p-6 sm:p-7 shadow-xs mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Col 1: Omset Kotor / Penjualan */}
          <div>
            <div className="border-t border-[#1c240d]/15 pt-2.5 mb-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#354614] uppercase block">
                OMSET KOTOR (PENJUALAN)
              </span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1c240d] tracking-tight">
              Rp {financialSummary.metrics.gross_revenue.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Col 2: HPP / Modal Barang (COGS) */}
          <div>
            <div className="border-t border-[#1c240d]/15 pt-2.5 mb-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#354614] uppercase block">
                HPP (MODAL BARANG TERJUAL)
              </span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#cc1818] tracking-tight">
              Rp {financialSummary.metrics.cogs.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Col 3: Laba Kotor (Gross Profit) */}
          <div>
            <div className="border-t border-[#1c240d]/15 pt-2.5 mb-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#354614] uppercase block">
                LABA KOTOR ({financialSummary.metrics.gross_profit_margin_pct}%)
              </span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1c240d] tracking-tight">
              Rp {financialSummary.metrics.gross_profit.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Col 4: Estimasi Laba Bersih */}
          <div>
            <div className="border-t border-[#1c240d]/15 pt-2.5 mb-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#354614] uppercase block">
                ESTIMASI LABA BERSIH
              </span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1c240d] tracking-tight">
              Rp {financialSummary.metrics.net_profit.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* 2b. Ringkasan Metode Pembayaran Penjualan (Tunai, QRIS, Kasbon) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 print:grid-cols-3">
        {/* Card 1: Total Tunai */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-neutral-500 uppercase block mb-1">
              TOTAL TUNAI MASUK
            </span>
            <div className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              Rp {totalTunaiMasuk.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-neutral-400 mt-0.5 block">
              Pembayaran langsung tunai
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total QRIS */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#465427] uppercase block mb-1">
              TOTAL QRIS MASUK
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#344415] tracking-tight">
              Rp {totalQrisMasuk.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-neutral-400 mt-0.5 block">
              Pembayaran digital / non-tunai
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#eef5db] text-[#465427] flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Total Kasbon */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-amber-700 uppercase block mb-1">
              TOTAL KASBON (PIUTANG)
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-800 tracking-tight">
              Rp {totalKasbon.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-neutral-400 mt-0.5 block">
              Penjualan kasbon dicatat
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Middle Section: 2 White Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Card 1: Laporan Laba Rugi Berbasis Analisis HPP [DEL-7] */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-neutral-900">
                Laporan laba rugi
              </h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#eef5db] text-[#3b4c1a] uppercase">
                COGS Analitik [DEL-7]
              </span>
            </div>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-600">Omset Penjualan Kotor</span>
                <span className="font-semibold text-neutral-900">
                  Rp {financialSummary.metrics.gross_revenue.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-neutral-100">
                <span className="text-neutral-600">HPP / Modal Terjual (COGS)</span>
                <span className="font-semibold text-red-600">
                  - Rp {financialSummary.metrics.cogs.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-neutral-100">
                <span className="font-bold text-neutral-900">Laba kotor</span>
                <div className="text-right">
                  <span className="font-bold text-neutral-900 block">
                    Rp {financialSummary.metrics.gross_profit.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium">
                    Margin: {financialSummary.metrics.gross_profit_margin_pct}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-neutral-100">
                <span className="text-neutral-600">Biaya operasional kas keluar</span>
                <span className="font-semibold text-red-600">
                  - Rp {financialSummary.metrics.operational_expenses.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-neutral-100 bg-[#fbfdf7] -mx-2 px-2 rounded-lg">
                <span className="font-bold text-[#354614]">Estimasi laba bersih</span>
                <div className="text-right">
                  <span className="font-black text-base text-[#354614] block">
                    Rp {financialSummary.metrics.net_profit.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-[#465427] font-semibold">
                    Net Margin: {financialSummary.metrics.net_profit_margin_pct}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Posisi Piutang & Rekapitulasi Arus Kas [DEL-7] */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-neutral-900">
                Posisi piutang &amp; arus kas
              </h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 uppercase">
                Cash Flow Riil
              </span>
            </div>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-600">Piutang belum tertagih (Outstanding)</span>
                <span className="font-bold text-amber-700">
                  Rp {financialSummary.metrics.outstanding_receivables.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-neutral-100">
                <span className="text-neutral-600">Piutang sudah dilunasi</span>
                <span className="font-semibold text-emerald-700">
                  Rp {financialSummary.metrics.collected_receivables.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-neutral-100">
                <span className="text-neutral-600">Arus kas bersih (Net Cash Flow)</span>
                <span className="font-bold text-neutral-900">
                  Rp {financialSummary.cash_flow.net_cash_flow.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-neutral-100">
                <span className="text-neutral-600">Estimasi nilai persediaan</span>
                <span className="font-semibold text-neutral-900">
                  Rp {persediaan.toLocaleString('id-ID')} ({products.length} SKU)
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs text-neutral-400 mt-4 pt-2">
            Nilai akan diperbarui mengikuti catatan transaksi dan inventaris warung.
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Tabs & Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs mt-6 overflow-hidden">
        {/* Tab Switcher & Sub-filter Bar */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewTab('RIWAYAT')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${viewTab === 'RIWAYAT'
                ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                : 'bg-transparent hover:bg-neutral-50 text-neutral-600 font-medium'
                }`}
            >
              Riwayat Transaksi Lengkap ({displayTrx.length})
            </button>
            <button
              type="button"
              onClick={() => setViewTab('JURNAL')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${viewTab === 'JURNAL'
                ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                : 'bg-transparent hover:bg-neutral-50 text-neutral-600 font-medium'
                }`}
            >
              Buku Besar / Jurnal Kas Manual ({bukuBesar.length})
            </button>
            <button
              type="button"
              onClick={() => setViewTab('ANALYTICS')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${viewTab === 'ANALYTICS'
                ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                : 'bg-transparent hover:bg-neutral-50 text-neutral-600 font-medium'
                }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analitik Laba &amp; Arus Kas [DEL-7]</span>
            </button>
          </div>

          {/* Sub-filter chips for Tab 1 (Tipe & Metode Pembayaran) */}
          {viewTab === 'RIWAYAT' && (
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {/* Tipe Transaksi */}
              <div className="flex items-center bg-white border border-neutral-200/90 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setFilterType('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filterType === 'ALL'
                    ? 'bg-[#cbf14e] text-[#1c240d] font-bold shadow-2xs'
                    : 'hover:bg-neutral-50 text-neutral-600 font-medium'
                    }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('IN')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filterType === 'IN'
                    ? 'bg-[#cbf14e] text-[#1c240d] font-bold shadow-2xs'
                    : 'hover:bg-neutral-50 text-neutral-600 font-medium'
                    }`}
                >
                  Penjualan
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('OUT')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filterType === 'OUT'
                    ? 'bg-[#cbf14e] text-[#1c240d] font-bold shadow-2xs'
                    : 'hover:bg-neutral-50 text-neutral-600 font-medium'
                    }`}
                >
                  Kulakan
                </button>
              </div>

              {/* Metode Pembayaran */}
              <div className="flex items-center bg-white border border-neutral-200/90 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setFilterPayment('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filterPayment === 'ALL'
                    ? 'bg-[#1c240d] text-white font-bold shadow-2xs'
                    : 'hover:bg-neutral-50 text-neutral-600 font-medium'
                    }`}
                >
                  Semua Cara Bayar
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPayment('CASH')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${filterPayment === 'CASH'
                    ? 'bg-[#1c240d] text-white font-bold shadow-2xs'
                    : 'hover:bg-neutral-50 text-neutral-600 font-medium'
                    }`}
                >
                  <span>Tunai</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPayment('QRIS')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${filterPayment === 'QRIS'
                    ? 'bg-[#1c240d] text-white font-bold shadow-2xs'
                    : 'hover:bg-neutral-50 text-neutral-600 font-medium'
                    }`}
                >
                  <span>QRIS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPayment('CREDIT')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${filterPayment === 'CREDIT'
                    ? 'bg-[#1c240d] text-white font-bold shadow-2xs'
                    : 'hover:bg-neutral-50 text-neutral-600 font-medium'
                    }`}
                >
                  <span>Kasbon</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TAB 1: RIWAYAT TRANSAKSI LENGKAP */}
        {viewTab === 'RIWAYAT' && (
          <div>
            {/* Table Header (Soft Sage Tint) */}
            <div className="bg-[#eef3e2] border-y border-neutral-200/80 px-5 py-3">
              <div className="grid grid-cols-12 gap-3 text-[11px] font-extrabold tracking-wider text-neutral-600 uppercase">
                <div className="col-span-3">TRANSAKSI</div>
                <div className="col-span-2">JENIS</div>
                <div className="col-span-2">PEMBAYARAN</div>
                <div className="col-span-2">NILAI</div>
                <div className="col-span-3">KETERANGAN</div>
              </div>
            </div>

            {/* Content or Empty State */}
            {displayTrx.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {displayTrx.map((trx) => {
                  const isSale = trx.type === 'IN';
                  const dateStr = new Date(trx.transaction_date || trx.created_at).toLocaleString(
                    'id-ID',
                    {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  );

                  return (
                    <div
                      key={trx.id}
                      className="px-5 py-3.5 hover:bg-neutral-50/60 transition-colors"
                    >
                      <div className="grid grid-cols-12 gap-3 items-center text-xs">
                        {/* Transaksi Date & ID */}
                        <div className="col-span-3">
                          <p className="font-semibold text-neutral-900">{dateStr}</p>
                          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                            #{trx.id.slice(-6).toUpperCase()}
                          </p>
                        </div>

                        {/* Jenis */}
                        <div className="col-span-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] ${isSale ? 'bg-[#eef5db] text-[#465427]' : 'bg-amber-50 text-amber-700'
                              }`}
                          >
                            {isSale ? 'Penjualan' : 'Kulakan'}
                          </span>
                        </div>

                        {/* Pembayaran */}
                        <div className="col-span-2 text-neutral-700 font-medium">
                          <span>
                            {trx.payment_method === 'CASH'
                              ? 'Tunai'
                              : trx.payment_method === 'QRIS'
                                ? 'QRIS'
                                : trx.payment_method === 'ONLINE'
                                  ? 'Online'
                                  : trx.payment_method === 'TRANSFER'
                                    ? 'Transfer'
                                    : 'Kasbon'}
                          </span>
                          {trx.payment_status && (
                            <span
                              className={`block text-[10px] font-bold mt-0.5 ${trx.payment_status === 'PAID' || trx.payment_status === 'SETTLEMENT'
                                ? 'text-emerald-700'
                                : trx.payment_status === 'PENDING'
                                  ? 'text-amber-700'
                                  : 'text-red-600'
                                }`}
                            >
                              {trx.payment_status}
                            </span>
                          )}
                        </div>

                        {/* Nilai Transaksi & Selisih Laba Bersih [ZAKI DEL-7] */}
                        <div className="col-span-2">
                          <div
                            className={`font-black ${isSale ? 'text-[#465427]' : 'text-[#cc1818]'
                              }`}
                          >
                            {isSale ? '+' : '-'} Rp {trx.total_amount.toLocaleString('id-ID')}
                          </div>
                          {isSale && trxProfitMap.has(trx.id) && (
                            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex flex-wrap items-center gap-1">
                              <span>Laba: +Rp {trxProfitMap.get(trx.id)!.profit.toLocaleString('id-ID')}</span>
                              <span className="text-neutral-400">({trxProfitMap.get(trx.id)!.margin}%)</span>
                            </div>
                          )}
                        </div>

                        {/* Keterangan & Action */}
                        <div className="col-span-3 flex items-center justify-between gap-2">
                          <div className="truncate text-neutral-500">
                            {trx.items && trx.items.length > 0
                              ? trx.items.map((i: any) => `${i.name} (${i.quantity || 1})`).join(', ')
                              : trx.category || 'Transaksi Umum'}
                          </div>

                          <button
                            type="button"
                            disabled={deletingId === trx.id}
                            onClick={() => handleDeleteTrx(trx.id)}
                            className="text-neutral-400 hover:text-red-600 transition-colors p-1 print:hidden cursor-pointer shrink-0"
                            title="Batalkan transaksi dan kembalikan stok"
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
              /* Empty State matching Image 0 */
              <div className="p-8 sm:p-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#eef5db] text-[#465427] flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 stroke-[1.75]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-neutral-900">
                    Belum ada riwayat transaksi.
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xl leading-relaxed">
                    Belum ada transaksi pada periode yang dipilih. Mulai dari kasir agar penjualan tercatat dan stok terpotong otomatis.
                  </p>
                  <Link
                    href="/dashboard/penjual/transaksi"
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Buka kasir &amp; input transaksi</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BUKU BESAR / JURNAL KAS MANUAL */}
        {viewTab === 'JURNAL' && (
          <div>
            {/* Table Header (Soft Sage Tint) */}
            <div className="bg-[#eef3e2] border-y border-neutral-200/80 px-5 py-3">
              <div className="grid grid-cols-12 gap-3 text-[11px] font-extrabold tracking-wider text-neutral-600 uppercase">
                <div className="col-span-3">TANGGAL</div>
                <div className="col-span-3">KETERANGAN</div>
                <div className="col-span-2 text-right">DEBIT / MASUK</div>
                <div className="col-span-2 text-right">KREDIT / KELUAR</div>
                <div className="col-span-2 text-right">SALDO</div>
              </div>
            </div>

            {/* Content or Empty State */}
            {bukuBesar.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {bukuBesar.map((row, idx) => (
                  <div
                    key={idx}
                    className="px-5 py-3 hover:bg-neutral-50/60 transition-colors"
                  >
                    <div className="grid grid-cols-12 gap-3 items-center text-xs">
                      <div className="col-span-3 text-neutral-700 font-medium">
                        {new Date(row.tanggal).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="col-span-3 font-medium text-neutral-900 truncate">
                        {row.keterangan}
                      </div>
                      <div className="col-span-2 text-right font-semibold text-[#465427]">
                        {row.masuk > 0 ? `Rp ${row.masuk.toLocaleString('id-ID')}` : '-'}
                      </div>
                      <div className="col-span-2 text-right font-semibold text-[#cc1818]">
                        {row.keluar > 0 ? `Rp ${row.keluar.toLocaleString('id-ID')}` : '-'}
                      </div>
                      <div className="col-span-2 text-right font-bold text-neutral-900">
                        Rp {row.saldo.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State matching Image 1 */
              <div className="p-8 sm:p-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#eef5db] text-[#465427] flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 stroke-[1.75]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-neutral-900">
                    Jurnal kas manual masih kosong.
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xl leading-relaxed">
                    Belum ada mutasi jurnal kas di periode ini. Catatan kas masuk dan keluar akan ditampilkan di buku ini.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DATA ANALYTICS & REKAPITULASI ARUS KAS [ZAKI DEL-7 & TASK-79] */}
        {viewTab === 'ANALYTICS' && (
          <div className="p-6 space-y-6">
            {/* Top Insight Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#fcfdfa] border border-[#d6e5b4] rounded-2xl p-4">
                <span className="text-[10px] font-extrabold text-[#4a5829] uppercase tracking-wider block">
                  OMSET KOTOR (REVENUE)
                </span>
                <span className="text-xl font-black text-neutral-900 mt-1 block">
                  Rp {financialSummary.metrics.gross_revenue.toLocaleString('id-ID')}
                </span>
                <span className="text-[11px] text-neutral-500 mt-0.5 block">
                  Penjualan masuk periode ini
                </span>
              </div>

              <div className="bg-[#fcfdfa] border border-[#d6e5b4] rounded-2xl p-4">
                <span className="text-[10px] font-extrabold text-red-700 uppercase tracking-wider block">
                  COGS / MODAL HPP
                </span>
                <span className="text-xl font-black text-red-600 mt-1 block">
                  Rp {financialSummary.metrics.cogs.toLocaleString('id-ID')}
                </span>
                <span className="text-[11px] text-neutral-500 mt-0.5 block">
                  Harga beli modal barang
                </span>
              </div>

              <div className="bg-[#fcfdfa] border border-[#d6e5b4] rounded-2xl p-4">
                <span className="text-[10px] font-extrabold text-[#3b4c1a] uppercase tracking-wider block">
                  LABA KOTOR (GROSS PROFIT)
                </span>
                <span className="text-xl font-black text-[#354614] mt-1 block">
                  Rp {financialSummary.metrics.gross_profit.toLocaleString('id-ID')}
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">
                  Margin: {financialSummary.metrics.gross_profit_margin_pct}%
                </span>
              </div>

              <div className="bg-[#fcfdfa] border border-[#d6e5b4] rounded-2xl p-4">
                <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider block">
                  PIUTANG BELUM TERTAGIH
                </span>
                <span className="text-xl font-black text-amber-800 mt-1 block">
                  Rp {financialSummary.metrics.outstanding_receivables.toLocaleString('id-ID')}
                </span>
                <span className="text-[11px] text-neutral-500 mt-0.5 block">
                  Kasbon pelanggan aktif
                </span>
              </div>
            </div>

            {/* Top Products by Profit */}
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#4a5829]" />
                    <span>Top 10 Produk Paling Menguntungkan</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Produk dengan kontribusi margin keuntungan terbesar berdasarkan data penjualan
                  </p>
                </div>
              </div>

              {financialSummary.top_products.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200/80 text-[11px] font-extrabold text-neutral-500 uppercase">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Nama Produk</th>
                        <th className="py-2.5 px-3 text-center">Terjual</th>
                        <th className="py-2.5 px-3 text-right">Total Omset</th>
                        <th className="py-2.5 px-3 text-right">Total Modal (HPP)</th>
                        <th className="py-2.5 px-3 text-right">Total Laba</th>
                        <th className="py-2.5 px-3 text-right">Margin (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {financialSummary.top_products.map((prod, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50/60 transition">
                          <td className="py-3 px-3 font-bold text-neutral-400">{idx + 1}</td>
                          <td className="py-3 px-3 font-bold text-neutral-900">{prod.name}</td>
                          <td className="py-3 px-3 text-center text-neutral-600">
                            {prod.quantity_sold} {prod.unit}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-neutral-800">
                            Rp {prod.total_revenue.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-neutral-500">
                            Rp {prod.total_cogs.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-700">
                            +Rp {prod.total_profit.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-[#354614]">
                            {prod.profit_margin_pct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-neutral-400">
                  Belum ada data produk terjual di periode ini.
                </div>
              )}
            </div>

            {/* REST API Analytics Endpoint Documentation Box */}
            <div className="bg-[#fbfcf8] border border-[#d6e5b4] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#cbf14e] text-[#1c240d] flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold tracking-wider text-[#4a5829] uppercase block">
                    ENDPOINT DATA ANALYTICS AKTIF [ZAKI - TASK-79]
                  </span>
                  <p className="text-xs font-mono font-bold text-neutral-800 mt-0.5">
                    GET /api/reports/financial-summary?period={periode === 'ALL' ? 'all' : periode.toLowerCase()}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Menyediakan data JSON otomatis untuk integrasi laporan, audit kasir, dan analitik performa toko.
                  </p>
                </div>
              </div>

              <a
                href={`/api/reports/financial-summary?period=${periode === 'ALL' ? 'all' : periode.toLowerCase()}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-[#4a5829] hover:bg-[#3d4922] text-[#d5ed70] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition shrink-0 cursor-pointer"
              >
                <span>Uji Output JSON</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Bottom Table Footer Bar */}
        <div className="px-5 py-3.5 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-2 bg-[#fbfcfa]">
          <div>
            {displayCount} catatan &middot; Periode: {getPeriodeLabel(periode)}
          </div>
          <div>Seluruh nilai sesuai data pembukuan warung</div>
        </div>
      </div>

      {/* FOOTER PRINT ONLY */}
      <div className="hidden print:block mt-8 pt-4 border-t border-black text-center text-xs italic">
        Laporan dibuat otomatis dari catatan transaksi Toko Wadira.
        <br />
        Angka bergantung pada kelengkapan pencatatan transaksi kasir.
      </div>

      {/* PRINT CSS STYLES */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          aside,
          header,
          nav {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
