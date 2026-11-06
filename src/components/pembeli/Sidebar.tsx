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

export default function Sidebar() {
  const pathname = usePathname();
  const { totalItems, setIsCartOpen } = useCart();

  const navItems = [
    {
      label: 'Etalase warung',
      href: '/',
      icon: Store,
      active: pathname === '/',
    },
    {
      label: 'Keranjang saya',
      href: '#',
      icon: ShoppingCart,
      active: false,
      badge: totalItems > 0 ? `${totalItems}` : undefined,
      onClick: () => setIsCartOpen(true),
    },
    {
      label: 'Kasbon saya',
      href: '/kasbon',
      icon: BookOpen,
      active: pathname === '/kasbon',
    },
    {
      label: 'Struk & pengingat',
      href: '/struk',
      icon: Receipt,
      active: pathname === '/struk',
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
      <div className="p-4 space-y-4">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
            <span className="font-extrabold text-lg">🏪</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 tracking-tight text-base">
                WarungCopilot
              </span>
            </div>
          </div>
        </div>

        {/* Store Branch Box */}
        <div className="bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 rounded-xl p-3 flex items-center gap-3 transition">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-semibold">
            🏬
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-800 text-sm leading-tight truncate">
              AlinStore
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Cabang Utama
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
                    ? 'bg-emerald-100 text-emerald-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      item.active ? 'text-emerald-800 stroke-[2.5]' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
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

      <div className="p-4 space-y-3 border-t border-slate-100">
        {/* Warung Info Card */}
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-200/60 px-2 py-0.5 rounded-md">
              Warung Buka
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <div className="space-y-1 text-xs text-slate-600 pt-0.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Setiap hari: 06.00 - 21.00</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate">Jl. Melati No. 12, RT 02/RW 03</span>
            </div>
          </div>

          <a
            href="https://wa.me/6281234567890?text=Halo%20AlinStore,%20mau%20tanya%20stok%20warung"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-1.5 py-1.5 px-2 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tanya WA ke WhatsApp</span>
          </a>
        </div>

        {/* User Profile Info & Admin Link */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              SH
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">
                Siti Rahma
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Pelanggan bersama
              </div>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition shrink-0"
            title="Buka Dasbor Kasir / Admin"
          >
            Kasir &rarr;
          </Link>
        </div>
      </div>
    </aside>
  );
}
