'use client';

import React from 'react';
import Header from '@/components/admin/Header';
import type { UserSession } from '@/types';

interface DashboardShellProps {
  user: UserSession | null;
  children: React.ReactNode;
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[#f8faf6] text-neutral-900 flex flex-col font-sans antialiased">
      <Header user={user} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
