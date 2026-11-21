'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Footer from '@/components/pembeli/Footer';
import {
  FileText,
  Search,
  Printer,
  MessageCircle,
  RefreshCw,
  LogIn,
  CheckCircle2,
  Clock,
  Calendar,
  X,
  CreditCard,
  ShoppingBag,
  Store,
  ChevronRight,
  Receipt,
  Share2,
} from 'lucide-react';
import type { Transaction, UserSession } from '@/types';

export default function StrukPelangganPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTrx, setIsLoadingTrx] = useState(true);
  const [requireLogin, setRequireLogin] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Target Struk Modal
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);

  // Fetch session
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

  // Fetch transactions
  const fetchTransactions = async (customSearch?: string) => {
    try {
      setIsLoadingTrx(true);
      const searchParam = typeof customSearch === 'string' ? customSearch : searchQuery;
      const url = searchParam
        ? `/api/customer/transactions?search=${encodeURIComponent(searchParam)}`
        : '/api/customer/transactions';

      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();

      if (data?.success) {
        setTransactions(data.transactions || []);
        setRequireLogin(Boolean(data.requireLogin));
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Gagal mengambil data transaksi struk:', err);
    } finally {
      setIsLoadingTrx(false);
    }
  };

  useEffect(() => {
    fetchSession();
    if (typeof window !== 'undefined') {
      const paramSearch = new URLSearchParams(window.location.search).get('search');
      if (paramSearch) {
        setSearchQuery(paramSearch);
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoadingSession) {
      if (typeof window !== 'undefined') {
        const paramSearch = new URLSearchParams(window.location.search).get('search');
        fetchTransactions(paramSearch || searchQuery);
      } else {
        fetchTransactions();
      }
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
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';
    } catch {
      return isoString;
    }
  };

  // Generate WhatsApp Share Message
  const getWaReceiptMessage = (trx: Transaction) => {
    let itemsText = '';
    if (trx.items && Array.isArray(trx.items)) {
      itemsText = trx.items
        .map(
          (it) =>
            `• ${it.name} (${it.quantity}x) = ${formatRupiah(
              (it.subtotal || it.price * it.quantity)
            )}`
        )
        .join('\n');
    }

    return encodeURIComponent(
      `*STRUK PEMBELIAN TOKO WADIRA*\n` +
        `--------------------------------\n` +
        `No. Struk: #${trx.id.slice(0, 16)}\n` +
        `Tanggal: ${formatDate(trx.created_at)}\n` +
        `Pelanggan: ${trx.customer_name || 'Pelanggan Wadira'}\n` +
        `--------------------------------\n` +
        `*DAFTAR BARANG:*\n${itemsText}\n` +
        `--------------------------------\n` +
        `*TOTAL: ${formatRupiah(trx.total_amount)}*\n` +
        `Metode: ${trx.payment_method} (${trx.payment_status || 'PAID'})\n` +
        `--------------------------------\n` +
        `Terima kasih telah berbelanja di Toko Wadira!`
    );
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb & Header Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
            <Link href="/dashboard/pelanggan" className="hover:text-neutral-700 transition">
              Wadira
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-neutral-800 font-bold">Struk &amp; Riwayat Belanja</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight flex items-center gap-2">
                <FileText className="w-7 h-7 text-[#4a5829]" />
                <span>Struk Belanja Saya</span>
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                Akses nota digital, cetak struk belanjaan, dan pantau riwayat belanja Anda di Toko Wadira.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchTransactions()}
              disabled={isLoadingTrx}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 shadow-2xs transition self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-neutral-600 ${isLoadingTrx ? 'animate-spin' : ''}`} />
              <span>Perbarui Data</span>
            </button>
          </div>
        </div>

        {/* Notifikasi Belum Login */}
        {!isLoadingSession && !user && requireLogin && (
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#4a5829] to-[#36401e] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#d5ed70] text-[#333d1c] text-[11px] font-black uppercase tracking-wider">
                Akses Nota Digital
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Masuk untuk Melihat Riwayat Transaksi Anda
              </h2>
              <p className="text-xs sm:text-sm text-neutral-200 max-w-xl">
                Riwayat transaksi kasir dan pesanan online otomatis tersimpan di akun Google Anda.
              </p>
            </div>

            <Link
              href="/login?redirect=/dashboard/pelanggan/struk"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#d5ed70] hover:bg-[#c2dc58] text-[#293214] font-black text-xs sm:text-sm transition shrink-0 shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk dengan Google</span>
            </Link>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchTransactions(searchQuery);
            }}
            className="relative"
          >
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari struk berdasarkan No. Pesanan / Transaksi, nama pembeli, atau No. HP..."
              className="w-full pl-10 pr-24 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#4a5829] focus:bg-white transition"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#4a5829] text-[#e8f699] text-xs font-bold hover:bg-[#3d4922] transition"
            >
              Cari Struk
            </button>
          </form>
        </div>

        {/* Loading State */}
        {isLoadingTrx && (
          <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200/80 space-y-3">
            <RefreshCw className="w-8 h-8 text-[#4a5829] animate-spin mx-auto" />
            <p className="text-sm font-bold text-neutral-700">Memuat riwayat struk belanja...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingTrx && transactions.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200/80 space-y-4">
            <div className="w-16 h-16 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center mx-auto">
              <Receipt className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-black text-neutral-900">
                Tidak Ada Struk Ditemukan
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500">
                {searchQuery
                  ? `Tidak ada transaksi dengan kata kunci "${searchQuery}". Coba gunakan nomor pesanan atau nomor telepon Anda.`
                  : user
                  ? 'Belum ada riwayat transaksi belanja yang tercatat untuk akun ini. Belanja sekarang di katalog Wadira!'
                  : 'Silakan masuk dengan Google atau cari berdasarkan nomor telepon atau ID pesanan di kolom pencarian di atas.'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
                <span className="text-neutral-400">Contoh pencarian nota:</span>
                {['Budi Santoso', 'Pak RT Bambang', 'Siti Rahma'].map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setSearchQuery(name);
                      fetchTransactions(name);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold transition-colors cursor-pointer"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/dashboard/pelanggan"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4a5829] text-[#e8f699] font-bold text-xs hover:bg-[#3d4922] transition shadow-xs"
              >
                <Store className="w-4 h-4" />
                <span>Belanja di Katalog</span>
              </Link>
            </div>
          </div>
        )}

        {/* Transaction Cards List */}
        {!isLoadingTrx && transactions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {transactions.map((trx) => {
              const itemsCount = trx.items?.length || 0;
              const isPaid = trx.payment_status === 'PAID' || trx.payment_status === 'SETTLEMENT';

              return (
                <div
                  key={trx.id}
                  className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs hover:shadow-xs transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: ID & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">
                          #{trx.id.slice(0, 18)}
                        </span>
                        <h4 className="text-sm font-extrabold text-neutral-950">
                          {trx.customer_name || 'Pelanggan Wadira'}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          <span>{formatDate(trx.created_at)}</span>
                        </div>
                      </div>

                      {/* Payment Status Badge */}
                      <div>
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            LUNAS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            {trx.payment_status || 'PENDING'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Preview Items */}
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-1.5 text-xs">
                      <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Daftar Belanja</span>
                        <span>{itemsCount} jenis barang</span>
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {trx.items && trx.items.length > 0 ? (
                          trx.items.slice(0, 3).map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-neutral-700">
                              <span className="truncate max-w-[170px]">
                                {it.name} <span className="text-neutral-400">×{it.quantity}</span>
                              </span>
                              <span className="font-semibold text-neutral-900 text-right">
                                {formatRupiah((it.subtotal || it.price * it.quantity))}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-neutral-400 italic">Item tidak tercatat detail</span>
                        )}

                        {itemsCount > 3 && (
                          <div className="text-[10px] text-neutral-400 italic pt-0.5">
                            +{itemsCount - 3} barang lainnya...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total & Payment Method */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-neutral-400">Metode Bayar</div>
                        <div className="text-xs font-bold text-neutral-800 uppercase mt-0.5">
                          {trx.payment_method || 'CASH'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-neutral-400">Total Pembelian</div>
                        <div className="text-base font-black text-[#4a5829] mt-0.5">
                          {formatRupiah(trx.total_amount)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-neutral-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTrx(trx)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#4a5829] hover:bg-[#3d4922] text-[#e8f699] text-xs font-bold shadow-2xs transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Lihat &amp; Cetak Struk</span>
                    </button>

                    <a
                      href={`https://wa.me/6289516201846?text=${getWaReceiptMessage(trx)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Bagikan Struk via WhatsApp"
                      className="p-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-emerald-600 transition"
                    >
                      <Share2 className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Footer />

      {/* Modal Digital Receipt (Struk Thermal Wadira) */}
      {selectedTrx && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Actions Header */}
            <div className="flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Struk Digital Resmi
              </span>
              <button
                type="button"
                onClick={() => setSelectedTrx(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Box (Thermal Printer Style) */}
            <div
              id="printable-receipt"
              className="overflow-y-auto p-6 bg-[#fafaf7] rounded-2xl border border-neutral-200 font-mono text-neutral-800 text-xs space-y-4 shadow-inner"
            >
              {/* Store Header */}
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black tracking-tight text-neutral-950 font-sans">
                  WADIRA
                </h3>
                <p className="text-[11px] text-neutral-600 font-sans">
                  Warung Madura &amp; Layanan Digital
                </p>
                <p className="text-[10px] text-neutral-500">
                  Jl. Mangga Raya No. 28, Perumnas Kamal
                </p>
                <p className="text-[10px] text-neutral-500">
                  WhatsApp: 0895-1620-1846
                </p>
              </div>

              <div className="border-t border-dashed border-neutral-300 my-2" />

              {/* Meta Info */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-neutral-500">No. Nota</span>
                  <span className="font-bold text-neutral-900">#{selectedTrx.id.slice(0, 16)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Waktu</span>
                  <span>{formatDate(selectedTrx.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Pelanggan</span>
                  <span className="font-bold">{selectedTrx.customer_name || 'Umum'}</span>
                </div>
                {selectedTrx.customer_phone && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">No. HP</span>
                    <span>{selectedTrx.customer_phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-500">Kasir</span>
                  <span>Kasir Toko Wadira</span>
                </div>
              </div>

              <div className="border-t border-dashed border-neutral-300 my-2" />

              {/* Items List */}
              <div className="space-y-2 text-[11px]">
                {selectedTrx.items && selectedTrx.items.length > 0 ? (
                  selectedTrx.items.map((it, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-bold text-neutral-900">{it.name}</div>
                      <div className="flex justify-between text-neutral-600 pl-2">
                        <span>
                          {it.quantity} {it.unit || 'x'} × {formatRupiah(it.price)}
                        </span>
                        <span className="font-semibold text-neutral-900">
                          {formatRupiah(it.subtotal || it.price * it.quantity)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="italic text-neutral-400">Rincian belanja tersimpan di kasir</div>
                )}
              </div>

              <div className="border-t border-dashed border-neutral-300 my-2" />

              {/* Total & Payment */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal Belanja</span>
                  <span>{formatRupiah(selectedTrx.total_amount)}</span>
                </div>
                {Number(selectedTrx.shipping_cost || 0) > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Ongkos Kirim</span>
                    <span>{formatRupiah(Number(selectedTrx.shipping_cost))}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-neutral-950 pt-1 border-t border-neutral-300">
                  <span>TOTAL AKHIR</span>
                  <span>{formatRupiah(selectedTrx.total_amount)}</span>
                </div>
                <div className="flex justify-between text-neutral-600 pt-1">
                  <span>Metode Pembayaran</span>
                  <span className="font-bold uppercase">{selectedTrx.payment_method}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Status Transaksi</span>
                  <span className="font-bold text-emerald-700 uppercase">
                    {selectedTrx.payment_status || 'PAID (LUNAS)'}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-neutral-300 my-2" />

              {/* Footer Note */}
              <div className="text-center text-[10px] text-neutral-500 space-y-1 pt-1 font-sans">
                <p className="font-bold text-neutral-700">
                  *** TERIMA KASIH TELAH BERBELANJA ***
                </p>
                <p>Barang yang sudah dibeli dapat ditukar jika kemasan rusak saat diterima.</p>
                <p className="text-[9px] text-neutral-400 pt-1">
                  Wadira Digital POS • warungppl.local
                </p>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="space-y-2 shrink-0 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#4a5829] hover:bg-[#3d4922] text-[#e8f699] font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Struk</span>
                </button>

                <a
                  href={`https://wa.me/6289516201846?text=${getWaReceiptMessage(selectedTrx)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim ke WhatsApp</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTrx(null)}
                className="w-full py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
