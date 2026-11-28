'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Check, Ban, ArrowRight, Zap } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const stock = typeof product.stock === 'number' ? product.stock : 0;
  const isOutOfStock = stock <= 0;
  const isLowStock = !isOutOfStock && (product.isLowStock || stock <= (product.min_stock || 5));
  const isPPOB = product.category === 'Tagihan & Pulsa' || product.categoryLabel === 'Tagihan & Pulsa';

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    if (isPPOB) {
      router.push(`/dashboard/pelanggan/produk/${product.id}`);
      return;
    }
    addToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 900);
  };

  return (
    <div className={`bg-white rounded-2xl border p-3.5 flex flex-col justify-between transition-all duration-200 group ${
      isOutOfStock 
        ? 'border-neutral-200 opacity-75' 
        : 'border-neutral-200/90 hover:shadow-md hover:border-neutral-400'
    }`}>
      <Link href={`/dashboard/pelanggan/produk/${product.id}`} className="flex-1 flex flex-col justify-between gap-3 mb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider truncate">
            {product.categoryLabel || product.category || 'Produk'}
          </span>
          {isOutOfStock ? (
            <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[10px] tracking-wide">
              Stok Habis
            </span>
          ) : isLowStock ? (
            <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] tracking-wide">
              Sisa {stock} {product.unit || 'pcs'}
            </span>
          ) : (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] tracking-wide">
              Tersedia
            </span>
          )}
        </div>

        <div className="space-y-1">
          <h4 className="font-bold text-neutral-950 text-sm sm:text-[15px] leading-snug line-clamp-2 group-hover:text-emerald-700 transition">
            {product.name}
          </h4>
          <p className="text-[11px] text-neutral-500 truncate">
            {[product.brand, product.unit ? `Satuan ${product.unit}` : ''].filter(Boolean).join(' • ') || 'Kebutuhan harian'}
          </p>
          {product.description && (
            <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed pt-0.5">
              {product.description}
            </p>
          )}
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition">
          <span>Lihat detail</span>
          <ArrowRight className="w-3 h-3" />
        </span>
      </Link>

      <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between mt-auto">
        <div>
          <div className="font-black text-neutral-950 text-sm tracking-tight">
            Rp {Number(product.price || 0).toLocaleString('id-ID')}
          </div>
          <div
            className={`text-[11px] font-medium ${
              isPPOB
                ? 'text-emerald-700 font-semibold'
                : isOutOfStock 
                  ? 'text-rose-600 font-bold' 
                  : isLowStock 
                    ? 'text-amber-700 font-bold' 
                    : 'text-neutral-500'
            }`}
          >
            {isPPOB ? 'Layanan Digital PPOB' : isOutOfStock ? 'Stok kosong' : `Stok: ${stock} ${product.unit || 'pcs'}`}
          </div>
        </div>

        <button
          onClick={handleAdd}
          type="button"
          disabled={isOutOfStock}
          aria-label={isPPOB ? `Pilih ${product.name}` : isOutOfStock ? `${product.name} habis` : `Tambah ${product.name} ke keranjang`}
          className={`h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
            isPPOB
              ? 'px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs gap-1 cursor-pointer'
              : `w-8 ${
                  isOutOfStock
                    ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                    : justAdded
                      ? 'bg-[#d4f952] text-neutral-950 font-bold border border-[#c4ec3e] shadow-xs cursor-pointer'
                      : 'border border-neutral-300 hover:border-[#c4ec3e] hover:bg-[#d4f952] text-neutral-800 hover:text-neutral-950 bg-white shadow-2xs cursor-pointer'
                }`
          }`}
        >
          {isPPOB ? (
            <>
              <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
              <span>Pilih</span>
            </>
          ) : isOutOfStock ? (
            <Ban className="w-4 h-4 text-neutral-400" />
          ) : justAdded ? (
            <Check className="w-4 h-4 stroke-[3]" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
