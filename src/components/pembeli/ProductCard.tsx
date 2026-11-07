'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Check } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 900);
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/90 p-3.5 flex flex-col justify-between hover:shadow-md hover:border-neutral-400 transition-all duration-200 group">
      <Link href={`/dashboard/pelanggan/produk/${product.id}`} className="block">
        <div className="relative w-full aspect-4/3 rounded-xl bg-neutral-100 overflow-hidden mb-3 flex items-center justify-center">
          <Image
            src={product.image || '/assets/logo.png'}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.isLowStock && (
            <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] tracking-wide shadow-2xs">
              Stok Menipis
            </span>
          )}
        </div>

        <div className="space-y-0.5 mb-2">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
            {product.categoryLabel || product.category || 'Produk'}
          </span>
          <h4 className="font-bold text-neutral-950 text-sm leading-snug line-clamp-1 group-hover:text-emerald-700 transition">
            {product.name}
          </h4>
          <p className="text-[11px] text-neutral-500 truncate">
            {product.brand || product.unit || ''}
          </p>
        </div>
      </Link>

      <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between mt-auto">
        <div>
          <div className="font-black text-neutral-950 text-sm tracking-tight">
            Rp {product.price.toLocaleString('id-ID')}
          </div>
          <div
            className={`text-[11px] font-medium ${
              product.isLowStock ? 'text-amber-700 font-bold' : 'text-neutral-400'
            }`}
          >
            Tersedia {product.stock} {product.unit}
          </div>
        </div>

        <button
          onClick={handleAdd}
          type="button"
          aria-label={`Tambah ${product.name} ke keranjang`}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
            justAdded
              ? 'bg-[#d4f952] text-neutral-950 font-bold border border-[#c4ec3e] shadow-xs'
              : 'border border-neutral-300 hover:border-[#c4ec3e] hover:bg-[#d4f952] text-neutral-800 hover:text-neutral-950 bg-white shadow-2xs'
          }`}
        >
          {justAdded ? (
            <Check className="w-4 h-4 stroke-[3]" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
