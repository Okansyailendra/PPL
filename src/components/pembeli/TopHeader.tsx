'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingCart, MessageCircle, MapPin, Clock } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface TopHeaderProps {
  onToggleMobileSidebar?: () => void;
}

export default function TopHeader({ onToggleMobileSidebar }: TopHeaderProps) {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Store Info */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href="/dashboard/pelanggan" className="flex items-center gap-2 shrink-0 group">
            <span className="font-sans text-2xl font-black tracking-tight text-neutral-950 hover:opacity-85 transition">
              Wadira
            </span>
          </Link>

          {/* Store Hours & Location (Bersih, Minimal, Tanpa Cliché Dot Hijau) */}
          <div className="hidden sm:flex items-center gap-2.5 text-xs pl-3.5 sm:pl-4 border-l border-neutral-200">
            <div className="flex items-center gap-1.5 font-medium text-neutral-700">
              <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>08.30 – 21.00 WIB</span>
            </div>
            <span className="text-neutral-300 hidden md:inline">•</span>
            <div className="hidden md:flex items-center gap-1.5 text-neutral-500">
              <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="truncate max-w-xs">Jl. Mangga Raya No. 28, Kamal</span>
            </div>
          </div>
        </div>

        {/* Quick Contact & Cart CTA */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <a
            href="https://wa.me/6289516201846?text=Halo%20Toko%20Wadira,%20mau%20tanya%20stok%20barang"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-emerald-700 text-xs font-semibold shadow-2xs transition"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tanya Kasir</span>
          </a>

          <Link
            href="/dashboard/pelanggan/keranjang"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4f952] hover:bg-[#c4ec3e] border border-[#c4ec3e] text-neutral-950 font-black text-xs sm:text-sm transition shadow-xs group"
            title="Lihat Keranjang Belanja"
          >
            <ShoppingCart className="w-4 h-4 text-neutral-950 group-hover:scale-110 transition shrink-0 stroke-[2.5]" />
            <span>{totalItems} unit</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
