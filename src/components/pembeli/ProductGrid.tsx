'use client';

import React from 'react';
import { ArrowRight, PackageX } from 'lucide-react';
import { Product } from '../../types';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  totalProductsCount: number;
}

export default function ProductGrid({
  products,
  totalProductsCount,
}: ProductGridProps) {
  return (
    <div className="flex-1 space-y-4 min-w-0">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold text-slate-800 text-sm sm:text-base tracking-tight">
          Pilihan kebutuhan harian
        </h3>
        <span className="text-xs text-slate-500 font-medium">
          {products.length} dari {totalProductsCount} produk
        </span>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center space-y-2">
          <PackageX className="w-12 h-12 text-slate-300 stroke-1" />
          <h4 className="font-bold text-slate-700">Produk tidak ditemukan</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Coba gunakan kata kunci pencarian yang lain atau pilih kategori Semua.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {products.length > 0 && (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-200/60">
          <span>Menampilkan {products.length} dari {totalProductsCount} produk</span>
          <button
            type="button"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-semibold transition"
          >
            <span>Lihat produk lainnya</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
