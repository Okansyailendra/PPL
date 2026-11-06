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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
      <div className="relative flex-1 flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari beras, minyak, gas, atau kebutuhan lainnya..."
          className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent rounded-xl focus:outline-hidden"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 hover:text-slate-600 px-2"
          >
            Bersihkan
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-3 shrink-0">
        <button
          onClick={() => setStockFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
            stockFilter === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          Semua
        </button>

        <button
          onClick={() => setStockFilter('in_stock')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
            stockFilter === 'in_stock'
              ? 'bg-emerald-700 text-white'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          Tersedia
        </button>

        <button
          onClick={() => setStockFilter('low_stock')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
            stockFilter === 'low_stock'
              ? 'bg-amber-600 text-white'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          Menipis
        </button>
      </div>
    </div>
  );
}
