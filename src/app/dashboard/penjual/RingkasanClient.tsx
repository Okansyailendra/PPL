'use client';

import React from 'react';
import Link from 'next/link';
import type { Debt, Product, UserSession } from '@/types';
import {
  ShoppingCart,
  FileText,
  Package,
  BookOpen,
  ArrowUpRight,
  Plus,
  Bot,
  CheckCircle2,
} from 'lucide-react';

interface RingkasanClientProps {
  user: UserSession | null;
  products: Product[];
  debts: Debt[];
}

export default function RingkasanClient({
  user,
  products,
  debts,
}: RingkasanClientProps) {
  const unpaidDebts = debts.filter((d) => d.status === 'UNPAID');
  const totalPiutang = unpaidDebts.reduce((acc, curr) => acc + curr.amount, 0);
  const totalNilaiStok = products.reduce((acc, curr) => acc + curr.price * curr.stock, 0);
  const lowStockItems = products.filter((p) => p.stock <= (p.min_stock ?? 5));

  const storeName = user?.store_name || user?.warung_name || 'HelwiyahStore';
  const ownerName = user?.owner_name || 'Helwiyah';

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-6">
      {/* 1. Breadcrumb & Header Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase mb-1">
            MEJA OPERASIONAL / RINGKASAN
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral-900 tracking-tight">
            Selamat datang, {ownerName}.
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Satu tempat untuk melihat keuangan, persediaan, dan langkah berikutnya.
          </p>
        </div>

        {/* Action Button: Buka kasir */}
        <Link
          href="/dashboard/penjual/transaksi"
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-[#d5ed70] hover:bg-[#c6e558] text-[#1c240d] font-bold text-xs sm:text-sm shadow-2xs transition group shrink-0"
        >
          <ShoppingCart className="w-4 h-4 text-[#1c240d] group-hover:scale-105 transition" />
          <span>Buka kasir</span>
        </Link>
      </div>

      {/* 2. Hero Card: POSISI WARUNG SAAT INI (Chartreuse/Lime Banner) */}
      <div className="bg-[#d5ed70] rounded-2xl p-6 sm:p-8 text-[#1c240d] shadow-2xs">
        {/* Top meta inside card */}
        <div className="flex items-center justify-between text-xs font-bold text-[#343f17]">
          <span className="uppercase tracking-wider">POSISI WARUNG SAAT INI</span>
          <span className="font-semibold">{storeName}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-[#1c240d]/15 my-4 sm:my-5" />

        {/* 3 Metrics Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {/* Metric 1: Aset stok */}
          <div>
            <span className="text-xs font-bold text-[#343f17] block">Aset stok</span>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#1c240d] mt-1.5">
              Rp {totalNilaiStok.toLocaleString('id-ID')}
            </div>
            <span className="text-xs font-medium text-[#4a5823] block mt-1.5">
              {products.length} SKU dalam inventaris
            </span>
          </div>

          {/* Metric 2: Piutang aktif */}
          <div>
            <span className="text-xs font-bold text-[#343f17] block">Piutang aktif</span>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#1c240d] mt-1.5">
              Rp {totalPiutang.toLocaleString('id-ID')}
            </div>
            <span className="text-xs font-medium text-[#4a5823] block mt-1.5">
              {unpaidDebts.length} orang memiliki tagihan
            </span>
          </div>

          {/* Metric 3: Perlu restock */}
          <div>
            <span className="text-xs font-bold text-[#343f17] block">Perlu restock</span>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#1c240d] mt-1.5">
              {lowStockItems.length} barang
            </div>
            <span className="text-xs font-medium text-[#4a5823] block mt-1.5">
              Status: {lowStockItems.length > 0 ? 'Perlu Restok' : 'Aman'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Cards (Grid 4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Kasir & input transaksi */}
        <Link
          href="/dashboard/penjual/transaksi"
          className="bg-white hover:bg-neutral-50/90 border border-neutral-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 transition group shadow-2xs hover:shadow-xs"
        >
          <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-[#d5ed70] group-hover:text-[#1c240d] transition shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-xs sm:text-sm text-neutral-900 group-hover:text-neutral-950 truncate">
                Kasir &amp; input transaksi
              </span>
              <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition shrink-0" />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 truncate">
              Catat penjualan dan kulakan.
            </p>
          </div>
        </Link>

        {/* Card 2: Pembukuan & laporan */}
        <Link
          href="/dashboard/penjual/laporan"
          className="bg-white hover:bg-neutral-50/90 border border-neutral-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 transition group shadow-2xs hover:shadow-xs"
        >
          <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-[#d5ed70] group-hover:text-[#1c240d] transition shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-xs sm:text-sm text-neutral-900 group-hover:text-neutral-950 truncate">
                Pembukuan &amp; laporan
              </span>
              <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition shrink-0" />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 truncate">
              Periksa arus kas dan laba rugi.
            </p>
          </div>
        </Link>

        {/* Card 3: Kelola stok */}
        <Link
          href="/dashboard/penjual/stok"
          className="bg-white hover:bg-neutral-50/90 border border-neutral-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 transition group shadow-2xs hover:shadow-xs"
        >
          <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-[#d5ed70] group-hover:text-[#1c240d] transition shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-xs sm:text-sm text-neutral-900 group-hover:text-neutral-950 truncate">
                Kelola stok
              </span>
              <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition shrink-0" />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 truncate">
              Atur barang dan batas minimum.
            </p>
          </div>
        </Link>

        {/* Card 4: Buku piutang */}
        <Link
          href="/dashboard/penjual/piutang"
          className="bg-white hover:bg-neutral-50/90 border border-neutral-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 transition group shadow-2xs hover:shadow-xs"
        >
          <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-[#d5ed70] group-hover:text-[#1c240d] transition shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-xs sm:text-sm text-neutral-900 group-hover:text-neutral-950 truncate">
                Buku piutang
              </span>
              <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition shrink-0" />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 truncate">
              Catat kasbon dan pelunasan.
            </p>
          </div>
        </Link>
      </div>

      {/* 4. Two-Column Lower Section: Mulai dari Inventaris & Rekomendasi Copilot AI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: MULAI DARI INVENTARIS */}
        <div className="col-span-12 lg:col-span-5 bg-[#e5eccc] border border-[#d2dcb6] rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-[#54652d] uppercase block mb-3">
              MULAI DARI INVENTARIS
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-950 tracking-tight leading-snug mb-3">
              Siapkan barang, lalu mulai berjualan.
            </h2>
            <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed mb-6">
              Tambahkan nama barang, harga jual, dan stok awal. Kasir akan memakai daftar yang sama dan memperbarui stok secara otomatis.
            </p>
            <Link
              href="/dashboard/penjual/stok"
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-[#54652d] hover:bg-[#435222] text-white font-bold text-xs sm:text-sm transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{products.length === 0 ? 'Tambah barang pertama' : 'Tambah barang inventaris'}</span>
            </Link>
          </div>
          <p className="text-[11px] text-neutral-600 mt-6 pt-4 border-t border-[#54652d]/15">
            Atau gunakan{' '}
            <Link href="/dashboard/penjual/scan" className="font-bold text-[#54652d] hover:underline">
              Scanner AI
            </Link>{' '}
            untuk membaca nota supplier.
          </p>
        </div>

        {/* Right Column: Rekomendasi Copilot AI */}
        <div className="col-span-12 lg:col-span-7 bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-2xs">
          <div>
            {/* Header Rekomendasi */}
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
                Rekomendasi Copilot AI
              </h2>
              <Link
                href="/dashboard/penjual/chat"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-800 font-bold text-xs transition shadow-2xs"
              >
                <Bot className="w-4 h-4 text-neutral-700" />
                <span>Tanya Copilot</span>
              </Link>
            </div>

            {/* Recommendation Item List */}
            <div className="space-y-4">
              {/* Item 1: Status Inventaris / Stok */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-neutral-50/60 border border-neutral-100">
                <div className="p-2 rounded-lg bg-white border border-neutral-200/70 text-neutral-700 shrink-0 shadow-2xs">
                  <Package className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-neutral-900 leading-snug">
                    {products.length === 0
                      ? 'Belum ada inventaris untuk dipantau'
                      : lowStockItems.length > 0
                        ? `Perhatian: ${lowStockItems.length} barang perlu restock`
                        : 'Inventaris warung terpantau aman'}
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    {products.length === 0
                      ? 'Tambahkan barang warung Anda agar Copilot dapat membantu memantau stok dan kebutuhan restock.'
                      : lowStockItems.length > 0
                        ? `Barang seperti ${lowStockItems.slice(0, 3).map((p) => `${p.name} (sisa ${p.stock})`).join(', ')} sudah mendekati batas minimum.`
                        : 'Semua barang warung Anda berada dalam jumlah aman di atas batas restock.'}
                  </p>
                </div>
              </div>

              {/* Item 2: Status Piutang / Kasbon */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-neutral-50/60 border border-neutral-100">
                <div className="p-2 rounded-lg bg-white border border-neutral-200/70 text-emerald-700 shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-neutral-900 leading-snug">
                    {totalPiutang === 0
                      ? 'Kas lancar, tanpa piutang tertunggak'
                      : `Kas tertahan: Rp ${totalPiutang.toLocaleString('id-ID')} piutang`}
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    {totalPiutang === 0
                      ? 'Tidak ada catatan kasbon yang belum dibayar. Jika ada pelanggan berutang, catat agar tagihannya mudah dipantau.'
                      : `Terdapat ${unpaidDebts.length} catatan kasbon yang belum lunas. Catat dan tagih tepat waktu agar arus kas lancar.`}
                  </p>
                  <div className="mt-3">
                    <Link
                      href="/dashboard/penjual/piutang"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-50 border border-neutral-200/80 text-neutral-800 font-bold text-xs transition shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Catat piutang baru</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Footer Bar */}
      <footer className="pt-6 pb-8 border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-2">
        <span>Wadira / Meja operasional warung</span>
        <span>{storeName}</span>
      </footer>
    </div>
  );
}
