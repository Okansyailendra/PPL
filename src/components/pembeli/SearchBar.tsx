'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  stockFilter: 'all' | 'in_stock' | 'low_stock';
  setStockFilter: (filter: 'all' | 'in_stock' | 'low_stock') => void;
}

export default function SearchBar({
  searchQuery,
  setSearchQuery,
  stockFilter,
  setStockFilter,
}: SearchBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-neutral-200/90 shadow-2xs">
      <div className="relative flex-1 flex items-center">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari beras, minyak, telur, gas 3kg, atau sembako..."
          className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 bg-transparent rounded-xl focus:outline-hidden font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-neutral-400 hover:text-neutral-700 px-2 font-medium"
          >
            Bersihkan
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 border-t sm:border-t-0 sm:border-l border-neutral-100 pt-2 sm:pt-0 sm:pl-3 shrink-0">
        <button
          onClick={() => setStockFilter('all')}
          type="button"
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            stockFilter === 'all'
              ? 'bg-neutral-950 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100'
          }`}
        >
          Semua
        </button>

        <button
          onClick={() => setStockFilter('in_stock')}
          type="button"
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            stockFilter === 'in_stock'
              ? 'bg-[#d4f952] text-neutral-950 border border-[#c4ec3e] shadow-xs'
              : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100'
          }`}
        >
          Tersedia
        </button>

        <button
          onClick={() => setStockFilter('low_stock')}
          type="button"
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            stockFilter === 'low_stock'
              ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100'
          }`}
        >
          Menipis
        </button>
      </div>
    </div>
  );
}
