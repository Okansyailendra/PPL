'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ShoppingCart, 
  MessageCircle, 
  LogIn, 
  LogOut, 
  LayoutDashboard 
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { logout } from '@/app/actions/auth';
import type { UserSession } from '@/types';

interface TopHeaderProps {
  initialUser?: UserSession | null;
}

export default function TopHeader({ initialUser = null }: TopHeaderProps) {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(initialUser);

  // Sync jika initialUser berubah
  useEffect(() => {
    if (initialUser) {
      setCurrentUser(initialUser);
    }
  }, [initialUser]);

  // Cek active link sederhana dan cepat seperti di header admin
  const isLinkActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href || pathname?.startsWith('/dashboard/pelanggan/produk');
    }
    return pathname?.startsWith(href);
  };

  const navLinks = [
    { label: 'Katalog Belanja', href: '/dashboard/pelanggan', exact: true },
    { label: 'Keranjang', href: '/dashboard/pelanggan/keranjang', badge: totalItems > 0 ? totalItems : undefined },
    { label: 'Kasbon', href: '/dashboard/pelanggan/kasbon' },
    { label: 'Struk', href: '/dashboard/pelanggan/struk' },
  ];

  const userName = currentUser?.owner_name || 'Pelanggan';
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'P';

  return (
    <header className="w-full bg-[#465427] text-white sticky top-0 z-50 shadow-sm">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand wadira. | Warung Madura Digital */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/pelanggan" className="flex items-center gap-2 group">
            <span className="font-sans text-2xl font-black tracking-tight text-white group-hover:opacity-90 transition-opacity">
              wadira.
            </span>
          </Link>
          <div className="h-4 w-px bg-white/20 hidden sm:block" />
          <span className="text-xs text-white/80 font-medium hidden sm:inline-block">
            Warung Digital Madura
          </span>
        </div>

        {/* Right Actions: Tanya Kasir, Keranjang, User Auth */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Tanya Kasir WhatsApp */}
          <a
            href="https://wa.me/6289516201846?text=Halo%20Toko%20Wadira,%20mau%20tanya%20stok%20barang"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#cbf14e]" />
            <span>Tanya Kasir</span>
          </a>

          {/* Shortcut Keranjang Belanja */}
          <Link
            href="/dashboard/pelanggan/keranjang"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#cbf14e] hover:bg-[#bde53f] text-[#1c240d] font-bold text-xs transition-colors shadow-xs"
            title="Lihat Keranjang Belanja"
          >
            <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
            <span>{totalItems} unit</span>
          </Link>

          {/* User Auth Info */}
          {currentUser ? (
            <div className="flex items-center gap-2.5 pl-1 sm:border-l sm:border-white/20">
              {currentUser.role === 'penjual' || currentUser.role === 'admin' ? (
                <Link
                  href="/dashboard/penjual"
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors"
                  title="Masuk ke Dashboard Admin"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#cbf14e]" />
                  <span>Admin</span>
                </Link>
              ) : null}

              {/* Avatar Initial & Name */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white text-[#465427] font-extrabold text-xs flex items-center justify-center shadow-xs">
                  {userInitial}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-xs font-bold text-white tracking-tight max-w-[120px] truncate">
                    {userName}
                  </span>
                  <span className="text-[11px] text-white/70">
                    {currentUser.role === 'penjual' || currentUser.role === 'admin' ? 'Pemilik warung' : 'Pelanggan'}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => logout()}
                title="Keluar dari akun"
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href={`/login?redirect=${encodeURIComponent(pathname || '/dashboard/pelanggan')}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk</span>
            </Link>
          )}
        </div>
      </div>

      {/* Desktop Navigation Tabs */}
      <div className="border-t border-white/10 hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <nav className="flex items-center gap-1.5">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    active
                      ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{link.label}</span>
                  {typeof link.badge === 'number' && link.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black leading-none ${
                        active ? 'bg-[#1c240d] text-[#cbf14e]' : 'bg-white text-[#465427]'
                      }`}
                    >
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Horizontal Scrollable Tabs */}
      <div className="border-t border-white/10 sm:hidden overflow-x-auto no-scrollbar px-4 py-2">
        <nav className="flex items-center gap-1.5 whitespace-nowrap min-w-max">
          {navLinks.map((link) => {
            const active = isLinkActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  active
                    ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{link.label}</span>
                {typeof link.badge === 'number' && link.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black leading-none ${
                      active ? 'bg-[#1c240d] text-[#cbf14e]' : 'bg-white text-[#465427]'
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
