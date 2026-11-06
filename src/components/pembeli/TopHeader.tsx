'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Menu } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface TopHeaderProps {
  onToggleMobileSidebar?: () => void;
}

export default function TopHeader({ onToggleMobileSidebar }: TopHeaderProps) {
  const { totalItems, setIsCartOpen } = useCart();
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const dayName = days[now.getDay()];
    const dateNum = String(now.getDate()).padStart(2, '0');
    const monthName = months[now.getMonth()];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    setCurrentDateTime(`${dayName}, ${dateNum} ${monthName} • ${hours}.${minutes} WIB`);
  }, []);

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white text-base font-bold shadow-2xs">
            🏬
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 text-lg tracking-tight">
              AlinStore
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Warga tetangga
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col text-right leading-tight">
          <span className="text-xs font-bold text-slate-800">Halo, Bu Siti</span>
          <span className="text-[11px] text-slate-400 font-medium">Melati • Blok B No. 7</span>
        </div>

        <Link
          href="/dashboard/pelanggan/keranjang"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/50 text-slate-800 font-semibold text-sm transition shadow-2xs group"
        >
          <ShoppingCart className="w-4 h-4 text-emerald-700 group-hover:scale-110 transition" />
          <span>{totalItems} unit</span>
        </Link>
      </div>
    </header>
  );
}
