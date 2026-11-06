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
        <h3 className="font-bold text-slate-800 text-sm tracking-tight">
          Kategori Barang
        </h3>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 space-y-1 shadow-2xs">
        {CATEGORIES.map((cat) => {
          const Icon = ICON_MAP[cat.iconName] || LayoutGrid;
          const isActive = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 group ${
                isActive
                  ? 'bg-emerald-100/80 text-emerald-950 font-semibold'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={`text-xs sm:text-sm font-semibold truncate ${
                    isActive ? 'text-emerald-950' : 'text-slate-800'
                  }`}
                >
                  {cat.name}
                </div>
                <div
                  className={`text-[11px] leading-tight mt-0.5 line-clamp-1 ${
                    isActive ? 'text-emerald-800 font-normal' : 'text-slate-400'
                  }`}
                >
                  {cat.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 leading-relaxed">
        <span className="font-semibold text-slate-700">Catatan:</span> Gambar hanya ilustrasi. Ketersediaan stok merupakan estimasi fisik di warung.
      </div>
    </div>
  );
}
