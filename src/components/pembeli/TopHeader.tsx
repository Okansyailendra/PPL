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

        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-sans text-xl sm:text-2xl font-black tracking-tight text-neutral-950">
            Wadira
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block mb-0.5" />
          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-[#f2f7ec] text-emerald-800 border border-[#e2edd8] ml-1">
            Etalase Pelanggan
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col text-right leading-tight">
          <span className="text-xs font-bold text-neutral-900">Halo, Bu Siti</span>
          <span className="text-[11px] text-neutral-500 font-medium">Melati • Blok B No. 7</span>
        </div>

        <Link
          href="/dashboard/pelanggan/keranjang"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4f952] hover:bg-[#c4ec3e] border border-[#c4ec3e] text-neutral-950 font-bold text-xs sm:text-sm transition shadow-xs group"
        >
          <ShoppingCart className="w-4 h-4 text-neutral-950 group-hover:scale-110 transition" />
          <span>{totalItems} unit</span>
        </Link>
      </div>
    </header>
  );
}
