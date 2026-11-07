'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Store,
  ShoppingCart,
  BookOpen,
  Receipt,
  Clock,
  MapPin,
  MessageCircle,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  active: boolean;
  badge?: string;
  onClick?: () => void;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { totalItems } = useCart();

  const navItems: NavItem[] = [
    {
      label: 'Etalase warung',
      href: '/dashboard/pelanggan',
      icon: Store,
      active: pathname === '/dashboard/pelanggan' || pathname === '/katalog',
    },
    {
      label: 'Keranjang saya',
      href: '/dashboard/pelanggan/keranjang',
      icon: ShoppingCart,
      active: pathname === '/dashboard/pelanggan/keranjang',
      badge: totalItems > 0 ? `${totalItems}` : undefined,
    },
    {
      label: 'Kasbon saya',
      href: '/dashboard/pelanggan/kasbon',
      icon: BookOpen,
      active: pathname === '/dashboard/pelanggan/kasbon',
    },
    {
      label: 'Struk & pengingat',
      href: '/dashboard/pelanggan/struk',
      icon: Receipt,
      active: pathname === '/dashboard/pelanggan/struk',
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
      <div className="p-4 space-y-4">
        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-2 px-2 py-1 group">
          <span className="font-sans text-2xl font-black tracking-tight text-neutral-950">
            Wadira
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block mb-0.5" />
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#f2f7ec] text-emerald-800 border border-[#e2edd8] ml-auto">
            Warung Madura
          </span>
        </Link>

        {/* Store Branch Box */}
        <div className="bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200/80 rounded-xl p-3 flex items-center gap-3 transition">
          <div className="w-8 h-8 rounded-lg bg-[#d4f952] text-neutral-950 flex items-center justify-center text-sm font-black shadow-xs">
            🏬
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-neutral-900 text-sm leading-tight truncate">
              Toko Wadira
            </div>
            <div className="text-[11px] text-neutral-500 font-medium">
              Toko Utama • Buka Tiap Hari
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1 pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <div
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  item.active
                    ? 'bg-[#d4f952] text-neutral-950 font-bold shadow-xs border border-[#c4ec3e]'
                    : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      item.active ? 'text-neutral-950 stroke-[2.5]' : 'text-neutral-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    item.active ? 'bg-neutral-950 text-white' : 'bg-[#d4f952] text-neutral-950'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
            );

            if (item.onClick) {
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  type="button"
                  className="w-full text-left"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link key={item.label} href={item.href}>
                {content}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 space-y-3 border-t border-neutral-100">
        {/* Warung Info Card (Sesuai Gaya Landing Page) */}
        <div className="bg-[#f2f7ec] border border-[#e2edd8] rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider bg-white/80 border border-[#e2edd8] px-2 py-0.5 rounded-md">
              Buka Setiap Hari
            </span>
            <span className="text-[10px] font-bold text-emerald-700">06.00 – 24.00</span>
          </div>

          <div className="space-y-1 text-xs text-neutral-600 pt-0.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="font-medium">06.00 – 24.00 WIB</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate">Jl. Lingkungan Warga No. 12</span>
            </div>
          </div>

          <button
            onClick={() => {
              const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
              const text = encodeURIComponent('Halo Toko Wadira, mau tanya stok barang');
              const url = isMobile
                ? `https://wa.me/6289516201846?text=${text}`
                : `https://web.whatsapp.com/send?phone=6289516201846&text=${text}`;
              window.open(url, '_blank');
            }}
            type="button"
            className="w-full mt-1 py-2 px-2.5 bg-[#d4f952] hover:bg-[#c4ec3e] border border-[#c4ec3e] text-neutral-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-800" />
            <span>Tanya WA ke Kasir</span>
          </button>
        </div>

        {/* User Profile Info */}
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-neutral-900 text-[#d4f952] font-black text-xs flex items-center justify-center shrink-0">
            SH
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-neutral-900 truncate">
              Siti Rahma
            </div>
            <div className="text-[11px] text-neutral-400 truncate">
              Pelanggan Toko Wadira
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
