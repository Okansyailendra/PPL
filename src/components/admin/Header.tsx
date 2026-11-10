'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions/auth';
import type { UserSession } from '@/types';
import { Menu, X, LogOut } from 'lucide-react';

interface HeaderProps {
  user: UserSession | null;
}

export default function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const ownerName = user?.owner_name || 'Helwiyah';
  const ownerInitial = ownerName.trim().charAt(0).toUpperCase() || 'H';

  const navLinks = [
    { label: 'Ringkasan', href: '/dashboard/penjual', exact: true },
    { label: 'Kasir & transaksi', href: '/dashboard/penjual/transaksi' },
    { label: 'Laporan', href: '/dashboard/penjual/laporan' },
    { label: 'Copilot AI', href: '/dashboard/penjual/chat' },
    { label: 'Piutang & kasbon', href: '/dashboard/penjual/piutang' },
    { label: 'Stok & restock', href: '/dashboard/penjual/stok' },
    { label: 'Scanner AI', href: '/dashboard/penjual/scan' },
  ];

  const isLinkActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="w-full bg-[#465427] text-white sticky top-0 z-50 shadow-sm">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand wadira. | Warung Madura Digital */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/penjual" className="flex items-center gap-2 group">
            <span className="font-sans text-2xl font-black tracking-tight text-white group-hover:opacity-90 transition">
              wadira.
            </span>
          </Link>
          <div className="h-4 w-px bg-white/20 hidden sm:block" />
          <span className="text-xs text-white/80 font-medium hidden sm:inline-block">
            Warung Madura Digital
          </span>
        </div>

        {/* Right: Avatar, Owner & Logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* User Profile */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white text-[#465427] font-extrabold text-xs flex items-center justify-center shadow-xs">
              {ownerInitial}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-xs font-bold text-white tracking-tight">{ownerName}</span>
              <span className="text-[11px] text-white/70">Pemilik warung</span>
            </div>
          </div>

          {/* Logout Action */}
          <button
            onClick={() => logout()}
            title="Keluar dari akun"
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Desktop Navigation Tabs */}
      <div className="border-t border-white/10 hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <nav className="flex items-center gap-1.5">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Horizontal Scrollable Tabs or Expanded Menu */}
      <div className="border-t border-white/10 lg:hidden overflow-x-auto no-scrollbar px-4 py-2">
        <nav className="flex items-center gap-1.5 whitespace-nowrap min-w-max">
          {navLinks.map((link) => {
            const active = isLinkActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  active
                    ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Expanded Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/15 bg-[#465425] px-4 py-3 space-y-2">
          <div className="text-xs text-white/70 pb-2 border-b border-white/15 flex items-center justify-between">
            <span className="font-semibold text-white">{ownerName}</span>
            <span className="text-white/70">Pemilik warung</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors block text-center ${
                    active
                      ? 'bg-[#d5ed70] text-[#1c240d]'
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
