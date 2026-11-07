'use client';

import React from 'react';
import {
  LayoutGrid,
  ShoppingBag,
  Cookie,
  Coffee,
  Flame,
  Sparkles,
  Zap,
  HeartPulse,
} from 'lucide-react';
import { CATEGORIES } from '../../data/mockProducts';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutGrid,
  ShoppingBag,
  Cookie,
  Coffee,
  Flame,
  Sparkles,
  Zap,
  HeartPulse,
};

interface CategorySidebarProps {
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

export default function CategorySidebar({
  selectedCategory,
  onSelectCategory,
}: CategorySidebarProps) {
  return (
    <div className="w-full lg:w-72 shrink-0 space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-sans font-black text-neutral-900 text-sm tracking-tight">
          Kategori Barang
        </h3>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200/80 p-2 space-y-1 shadow-2xs">
        {CATEGORIES.map((cat) => {
          const Icon = ICON_MAP[cat.iconName] || LayoutGrid;
          const isActive = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 group cursor-pointer ${
                isActive
                  ? 'bg-[#d4f952] text-neutral-950 font-bold border border-[#c4ec3e] shadow-xs'
                  : 'hover:bg-neutral-50 text-neutral-700'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition ${
                  isActive
                    ? 'bg-neutral-950 text-[#d4f952] shadow-xs'
                    : 'bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={`text-xs sm:text-sm font-bold truncate ${
                    isActive ? 'text-neutral-950' : 'text-neutral-800'
                  }`}
                >
                  {cat.name}
                </div>
                <div
                  className={`text-[11px] leading-tight mt-0.5 line-clamp-1 ${
                    isActive ? 'text-neutral-800 font-medium' : 'text-neutral-400'
                  }`}
                >
                  {cat.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-3.5 bg-[#f2f7ec] rounded-xl border border-[#e2edd8] text-[11px] text-neutral-700 leading-relaxed font-medium">
        <span className="font-bold text-emerald-800">Catatan:</span> Gambar sebagai referensi kemasan. Ketersediaan barang dan harga merupakan stok fisik riil di Toko Wadira.
      </div>
    </div>
  );
}
