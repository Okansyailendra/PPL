'use client';

import React from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw, Home } from 'lucide-react';

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[#f8faf6] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-200 p-8 text-center shadow-sm space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-[#465427]/10 text-[#465427] flex items-center justify-center mx-auto">
          <WifiOff className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-[#cbf14e]/40 text-[#333d1c] text-[11px] font-extrabold uppercase tracking-wider">
            Mode Offline
          </span>
          <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">
            Koneksi Internet Terputus
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Aplikasi <strong>Wadira</strong> sedang tidak terhubung ke jaringan. Pastikan WiFi atau paket data ponsel aktif untuk menyinkronkan kasir, stok, dan pembukuan.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 rounded-xl bg-[#465427] hover:bg-[#38441f] text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Coba Muat Ulang</span>
          </button>

          <Link
            href="/"
            className="w-full py-2.5 px-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Halaman Utama</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
