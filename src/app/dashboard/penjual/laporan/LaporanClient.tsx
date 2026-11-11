'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { UserSession, Product, Debt } from '@/types';
import {
  Transaction,
  PeriodeFilter,
  filterByPeriode,
  hitungRingkasan,
  hitungLabaRugi,
  hitungPiutang,
  hitungNilaiPersediaan,
  buatBukuBesar,
} from '@/lib/ledger';
import { deleteTransaction } from '@/app/actions/transaksi';
import {
  History,
  Printer,
  Plus,
  FileText,
  BookOpen,
  Trash2,
  ChevronDown,
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

  // Tab View: Riwayat Transaksi Lengkap vs Buku Besar / Jurnal Kas Manual
  const [viewTab, setViewTab] = useState<'RIWAYAT' | 'JURNAL'>('RIWAYAT');
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter transactions
  const filteredTrx = filterByPeriode(transactions, periode, customStart, customEnd);

  // Specific Type Filter for Riwayat view
  const displayTrx = filteredTrx.filter((t) => {
    if (filterType === 'IN') return t.type === 'IN';
    if (filterType === 'OUT') return t.type === 'OUT';
    return true;
  });

  // Computations
  const ringkasan = hitungRingkasan(filteredTrx);
  const labaRugi = hitungLabaRugi(filteredTrx);
  const piutang = hitungPiutang(debts);
  const persediaan = hitungNilaiPersediaan(products);
  const bukuBesar = buatBukuBesar(filteredTrx, 0);

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

  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const displayCount = viewTab === 'RIWAYAT' ? displayTrx.length : bukuBesar.length;

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto pb-12 font-sans print:max-w-none print:w-full print:bg-white print:text-black">
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
          {/* Col 1: Kas Masuk / Penjualan */}
          <div>
            <div className="border-t border-[#1c240d]/15 pt-2.5 mb-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#354614] uppercase block">
                KAS MASUK / PENJUALAN
              </span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1c240d] tracking-tight">
              Rp {ringkasan.kasMasuk.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Col 2: Kas Keluar / Kulakan (Red Amount as in mockup) */}
          <div>
            <div className="border-t border-[#1c240d]/15 pt-2.5 mb-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#354614] uppercase block">
                KAS KELUAR / KULAKAN
              </span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#cc1818] tracking-tight">
              Rp {ringkasan.kasKeluar.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Col 3: Selisih Kas Bersih */}
          <div>
            <div className="border-t border-[#1c240d]/15 pt-2.5 mb-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#354614] uppercase block">
                SELISIH KAS BERSIH
              </span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1c240d] tracking-tight">
              Rp {ringkasan.selisih.toLocaleString('id-ID')}
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
              Rp {labaRugi.labaBersih.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: 2 White Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Card 1: Laporan Laba Rugi */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900 mb-4">
              Laporan laba rugi
            </h2>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-600">Total penjualan</span>
                <span className="font-semibold text-neutral-900">
                  Rp {labaRugi.penjualan.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-neutral-100">
                <span className="text-neutral-600">Harga pokok (kulakan)</span>
                <span className="font-semibold text-neutral-900">
                  - Rp {labaRugi.hpp.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-neutral-100">
                <span className="font-bold text-neutral-900">Laba kotor</span>
                <span className="font-bold text-neutral-900">
                  Rp {labaRugi.labaKotor.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-neutral-100">
                <span className="text-neutral-600">Biaya operasional</span>
                <span className="font-semibold text-neutral-900">
                  - Rp {labaRugi.biaya.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-neutral-100">
                <span className="font-bold text-neutral-900">Laba bersih</span>
                <span className="font-bold text-neutral-900">
                  Rp {labaRugi.labaBersih.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Posisi Piutang & Persediaan */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900 mb-4">
              Posisi piutang &amp; persediaan
            </h2>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-600">Total piutang (kasbon)</span>
                <span className="font-semibold text-neutral-900">
                  Rp {piutang.totalAktif.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-neutral-100">
                <span className="text-neutral-600">Pelanggan berutang</span>
                <span className="font-semibold text-neutral-900">
                  {piutang.jumlahPelanggan} orang
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-neutral-100">
                <span className="text-neutral-600">Estimasi nilai persediaan</span>
                <span className="font-semibold text-neutral-900">
                  Rp {persediaan.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-neutral-100">
                <span className="text-neutral-600">Jumlah SKU tersedia</span>
                <span className="font-semibold text-neutral-900">
                  {products.length} SKU
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
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                viewTab === 'RIWAYAT'
                  ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                  : 'bg-transparent hover:bg-neutral-50 text-neutral-600 font-medium'
              }`}
            >
              Riwayat Transaksi Lengkap ({filteredTrx.length})
            </button>
            <button
              type="button"
              onClick={() => setViewTab('JURNAL')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                viewTab === 'JURNAL'
                  ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                  : 'bg-transparent hover:bg-neutral-50 text-neutral-600 font-medium'
              }`}
            >
              Buku Besar / Jurnal Kas Manual ({bukuBesar.length})
            </button>
          </div>

          {/* Sub-filter chips for Tab 1 (Image 0) */}
          {viewTab === 'RIWAYAT' && (
            <div className="flex items-center gap-1.5 print:hidden">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterType === 'ALL'
                    ? 'bg-[#cbf14e] text-[#1c240d] font-bold shadow-2xs'
                    : 'bg-transparent hover:bg-neutral-50 text-neutral-600 font-medium'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterType('IN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterType === 'IN'
                    ? 'bg-[#cbf14e] text-[#1c240d] font-bold shadow-2xs'
                    : 'bg-transparent hover:bg-neutral-50 text-neutral-600 font-medium'
                }`}
              >
                Penjualan
              </button>
              <button
                type="button"
                onClick={() => setFilterType('OUT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterType === 'OUT'
                    ? 'bg-[#cbf14e] text-[#1c240d] font-bold shadow-2xs'
                    : 'bg-transparent hover:bg-neutral-50 text-neutral-600 font-medium'
                }`}
              >
                Kulakan
              </button>
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
                            className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] ${
                              isSale ? 'bg-[#eef5db] text-[#465427]' : 'bg-amber-50 text-amber-700'
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
                              className={`block text-[10px] font-bold mt-0.5 ${
                                trx.payment_status === 'PAID' || trx.payment_status === 'SETTLEMENT'
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

                        {/* Nilai */}
                        <div
                          className={`col-span-2 font-black ${
                            isSale ? 'text-[#465427]' : 'text-[#cc1818]'
                          }`}
                        >
                          {isSale ? '+' : '-'} Rp {trx.total_amount.toLocaleString('id-ID')}
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
