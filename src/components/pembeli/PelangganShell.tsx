'use client';

import React from 'react';
import { CartProvider } from '@/context/CartContext';
import TopHeader from '@/components/pembeli/TopHeader';
import type { UserSession } from '@/types';

interface PelangganShellProps {
  user: UserSession | null;
  children: React.ReactNode;
}

export default function PelangganShell({ user, children }: PelangganShellProps) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[#fbfbf9] text-neutral-900 flex flex-col font-sans antialiased">
        <TopHeader initialUser={user} />
        <div className="flex-1 w-full">
          {children}
        </div>
      </div>
    </CartProvider>
  );
}
