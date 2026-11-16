'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Store,
  ShoppingCart,
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
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
      <div className="p-4 space-y-4">
        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-2 px-2 py-1 group">
          <span className="font-sans text-2xl font-black tracking-tight text-neutral-950">
            Wadira
          </span>
        </Link>

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

      <div className="p-4 border-t border-neutral-100">
        {/* Warung Info & WhatsApp Contact Card */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-neutral-900 uppercase tracking-wide">
                Buka Setiap Hari
              </span>
            </div>
            <span className="text-[11px] font-medium text-neutral-500">
              06.00 – 24.00
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="truncate text-neutral-600 font-medium">
              Jl. Lingkungan Warga No. 12
            </span>
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
            className="w-full py-2.5 px-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white/20" />
            <span>Tanya WA ke Kasir</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
