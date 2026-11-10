'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserSession } from '@/types';

interface SidebarProps {
  user: UserSession | null;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavLinkItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}

export default function Sidebar({ user, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const links: NavLinkItem[] = [
    { href: '/dashboard/penjual', label: 'Beranda & Arus Kas', icon: 'dashboard' },
    { href: '/dashboard/penjual/transaksi', label: 'Kasir & Transaksi', icon: 'point_of_sale', badge: 'Input' },
    { href: '/dashboard/penjual/laporan', label: 'Buku Besar & Laporan', icon: 'receipt_long' },
    { href: '/dashboard/penjual/chat', label: 'Copilot AI Chat', icon: 'smart_toy', badge: 'Online' },
    { href: '/dashboard/penjual/piutang', label: 'Buku Piutang & Kasbon', icon: 'menu_book' },
    { href: '/dashboard/penjual/stok', label: 'Stok & Restock', icon: 'inventory_2' },
    { href: '/dashboard/penjual/scan', label: 'Scanner AI (Foto)', icon: 'document_scanner', badge: 'New' }
  ];

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-surface-container-lowest shadow-[4px_0_24px_rgba(0,0,0,0.10)] z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0`}
      >
        <div className="flex flex-col flex-1">
          {/* App Brand & Logo */}
          <div className="h-[80px] px-space-md flex items-center gap-3 bg-surface-container-low/40">
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-headline-sm text-primary leading-tight font-bold tracking-tight">Wadira</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Portal Kasir &amp; Pengelola</span>
            </div>
          </div>

          {/* Store Profile */}
          <div className="px-space-md py-space-sm">
            <div className="p-space-sm bg-surface-container rounded-xl flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-lg shrink-0">store</span>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-on-surface font-bold truncate">
                  {user?.store_name || user?.warung_name || 'Warung Berkah'}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Cabang Utama</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-space-md py-space-sm space-y-1 overflow-y-auto">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-space-md py-space-sm rounded-xl font-label-lg text-label-lg transition-all ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-xl">{link.icon}</span>
                    <span>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className="flex items-center gap-1 bg-secondary-container/50 px-2 py-0.5 rounded-full font-label-sm text-label-sm text-on-secondary-container">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Quick link to buyer catalog */}
          <div className="p-space-md border-t border-outline/10">
            <Link
              href="/dashboard/pelanggan"
              className="flex items-center justify-between w-full p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700 text-lg">storefront</span>
                <span>Lihat Etalase Toko</span>
              </div>
              <span className="material-symbols-outlined text-sm text-on-surface-variant">open_in_new</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
