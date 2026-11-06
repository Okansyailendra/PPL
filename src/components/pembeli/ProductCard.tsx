'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus, Check } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 900);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 flex flex-col justify-between hover:shadow-md hover:border-emerald-300 transition-all duration-200 group">
      <div>
        <div className="relative w-full aspect-4/3 rounded-xl bg-slate-100 overflow-hidden mb-3 flex items-center justify-center">
          <Image
            src={product.image || '/assets/logo.png'}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.isLowStock && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500/90 text-white font-bold text-[10px] tracking-wide shadow-2xs">
              Stok Menipis
            </span>
          )}
        </div>

        <div className="space-y-0.5 mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            {product.categoryLabel || product.category || 'Produk'}
          </span>
          <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-1 group-hover:text-emerald-800 transition">
            {product.name}
          </h4>
          <p className="text-[11px] text-slate-500 truncate">
            {product.brand || product.unit || ''}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-auto">
        <div>
          <div className="font-extrabold text-slate-900 text-sm tracking-tight">
            Rp {product.price.toLocaleString('id-ID')}
          </div>
          <div
            className={`text-[11px] font-medium ${
              product.isLowStock ? 'text-amber-600 font-semibold' : 'text-slate-400'
            }`}
          >
            Tersedia {product.stock} {product.unit}
          </div>
        </div>

        <button
          onClick={handleAdd}
          type="button"
          aria-label={`Tambah ${product.name} ke keranjang`}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
            justAdded
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 bg-white'
          }`}
        >
          {justAdded ? (
            <Check className="w-4 h-4 animate-scale-in" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
