'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  Package, 
  ShoppingCart, 
  MessageCircle, 
  ArrowRight, 
  CheckCircle2, 
  ExternalLink,
  RefreshCw,
  TrendingDown
} from 'lucide-react';
import type { Product } from '@/types';
import { linkWa } from '@/lib/penagih';
import { evaluateRestockRule } from '@/lib/stock-algorithm';

interface WidgetStokMenipisProps {
  products: Product[];
  storeName?: string;
}

export default function WidgetStokMenipis({ products, storeName = 'Toko Wadira' }: WidgetStokMenipisProps) {
  const [filterMode, setFilterMode] = useState<'ALL' | 'CRITICAL'>('ALL');

  // Filter barang yang stoknya <= min_stock
  const lowStockItems = products.filter((p) => {
    const stock = Number(p.stock) || 0;
    const minStock = Number(p.min_stock) || 5;
    return stock <= minStock;
  });

  // Urutkan dari stok terendah (stok 0 paling atas)
  const sortedLowStock = [...lowStockItems].sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));

  // Kritis jika stok <= 2
  const criticalItems = sortedLowStock.filter((p) => (Number(p.stock) || 0) <= 2);

  const displayedItems = filterMode === 'CRITICAL' ? criticalItems : sortedLowStock;

  // Nomor default supplier / agen warung (bisa dikustomisasi)
  const defaultSupplierPhone = '081234567890';

  const generateSupplierOrderWa = (product: Product, recommendedQty: number) => {
    const text = `Halo Agen / Supplier,\nSaya dari *${storeName}* ingin memesan restok barang berikut:\n- *Barang*: ${product.name}\n- *Stok Saat Ini*: ${product.stock} ${product.unit || 'pcs'}\n- *Jumlah Pesanan*: ${recommendedQty} ${product.unit || 'pcs'}\n\nMohon konfirmasi ketersediaan dan total tagihannya. Terima kasih!`;
    return linkWa(defaultSupplierPhone, text);
  };

  if (lowStockItems.length === 0) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-[#f2f7ec] border border-emerald-200/80 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                Inventaris Aman
              </span>
              <span className="text-xs text-neutral-500 font-medium">
                {products.length} SKU terpantau
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-neutral-900 mt-1.5">
              Semua persediaan barang berada di atas batas minimum.
            </h3>
            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
              Sistem kasir dan etalase pembeli tidak mendeteksi adanya barang kritis atau habis. Warung Anda siap melayani transaksi pelanggan dengan lancar.
            </p>
          </div>
          <Link
            href="/dashboard/penjual/stok"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-bold text-neutral-800 hover:bg-neutral-50 shadow-2xs transition"
          >
            <span>Buka Stok</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-amber-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-neutral-900 text-base sm:text-lg tracking-tight">
                Notifikasi Stok Menipis &amp; Restock
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-100 text-rose-700 animate-pulse">
                {criticalItems.length > 0 ? `${criticalItems.length} Kritis` : 'Perlu Diisi'}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              {lowStockItems.length} barang berada pada atau di bawah batas minimum stok warung.
            </p>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-neutral-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1 rounded-lg transition ${
              filterMode === 'ALL'
                ? 'bg-white text-neutral-900 shadow-2xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Semua Menipis ({lowStockItems.length})
          </button>
          <button
            onClick={() => setFilterMode('CRITICAL')}
            className={`px-3 py-1 rounded-lg transition ${
              filterMode === 'CRITICAL'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Kritis ({criticalItems.length})
          </button>
        </div>
      </div>

      {/* Item List */}
      <div className="divide-y divide-neutral-100 max-h-[360px] overflow-y-auto pr-1 space-y-2">
        {displayedItems.map((product) => {
          const analysis = evaluateRestockRule(product);
          const stock = analysis.currentStock;
          const minStock = analysis.minStock;
          const isCritical = analysis.alertLevel === 'CRITICAL';
          const recommendedOrder = analysis.recommendedRestockQty;

          // Progress persentase terhadap batas aman (minStock * 2)
          const safeTarget = Math.max(1, minStock * 2);
          const percent = Math.min(100, Math.round((stock / safeTarget) * 100));

          return (
            <div
              key={product.id}
              className="pt-2.5 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-neutral-50/70 p-2 rounded-xl transition"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isCritical
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  <Package className="w-4 h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-neutral-900 text-xs sm:text-sm truncate">
                      {product.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                        stock === 0
                          ? 'bg-neutral-900 text-white'
                          : isCritical
                            ? 'bg-rose-500 text-white'
                            : 'bg-amber-400 text-neutral-950'
                      }`}
                    >
                      {stock === 0 ? 'Habis (0)' : isCritical ? 'Sangat Kritis' : 'Menipis'}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      {product.categoryLabel || product.category || 'Barang'}
                    </span>
                  </div>

                  {/* Stock vs Min & Progress Bar */}
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="w-24 sm:w-36 bg-neutral-200 rounded-full h-1.5 overflow-hidden shrink-0">
                      <div
                        className={`h-full rounded-full ${
                          stock === 0
                            ? 'bg-rose-600'
                            : isCritical
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-xs text-neutral-600 font-semibold">
                      Sisa: <strong className={isCritical ? 'text-rose-600' : 'text-amber-700'}>{stock}</strong> / Min: {minStock} {product.unit || 'pcs'}
                    </span>
                    <span className="hidden sm:inline-block text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                      {stock === 0 ? 'Habis' : `Habis ~${analysis.runoutDays} hr`} (MA: {analysis.movingAverageDailySales}/hr)
                    </span>
                    <span className="hidden md:inline-block text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      Saran restok: +{recommendedOrder} {product.unit || 'pcs'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {/* WA Supplier Order */}
                <a
                  href={generateSupplierOrderWa(product, recommendedOrder)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Pesan restok via WhatsApp ke Agen Supplier"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition shadow-2xs"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden sm:inline">Pesan WA</span>
                </a>

                {/* Kasir Restock / Kulakan */}
                <Link
                  href={`/dashboard/penjual/transaksi`}
                  title="Input kulakan di kasir"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d5ed70] hover:bg-[#c6e558] text-[#1c240d] font-bold text-xs transition shadow-2xs"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-[#1c240d]" />
                  <span>Kulakan</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info & Shortcut */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-2 border-t border-neutral-100">
        <span>
          💡 Rekomendasi restock dihitung berdasarkan batas minimum stok dan perputaran barang warung.
        </span>
        <Link
          href="/dashboard/penjual/stok"
          className="font-bold text-neutral-800 hover:text-emerald-700 flex items-center gap-1 transition shrink-0"
        >
          <span>Kelola inventaris penuh</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

