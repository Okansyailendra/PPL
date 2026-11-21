'use client';

import React from 'react';
import { ShoppingBag, Truck, CreditCard } from 'lucide-react';

export default function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#d4f952] text-neutral-950 p-6 sm:p-7 shadow-xs border border-[#c4ec3e]">
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Sisi Kiri: Heading Utama & Deskripsi */}
        <div className="space-y-1.5 max-w-2xl lg:max-w-3xl">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight text-neutral-950">
            Kebutuhan rumah, dari warung tetangga.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-medium max-w-xl lg:max-w-2xl">
            Pesan sembako harian dan belanjaan dapur lewat katalog online, pesanan langsung disiapkan kasir Toko Wadira.
          </p>
        </div>

        {/* Sisi Kanan: Panel 3 Keunggulan Toko Terpadu (Bersih, Kontras Tajam, Tanpa Warna Pastel Slop) */}
        <div className="bg-white/95 rounded-2xl border border-neutral-950/10 p-3 sm:p-3.5 shadow-xs space-y-2.5 shrink-0 w-full lg:w-auto lg:min-w-[280px]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-950 text-[#d4f952] flex items-center justify-center shrink-0 shadow-2xs">
              <Truck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs font-black text-neutral-950 leading-tight">
                Siap Antar ke Rumah
              </div>
              <div className="text-[10px] text-neutral-600 font-medium">
                Radius pemukiman Kamal
              </div>
            </div>
          </div>

          <div className="h-px bg-neutral-100" />

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-950 text-[#d4f952] flex items-center justify-center shrink-0 shadow-2xs">
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs font-black text-neutral-950 leading-tight">
                Ambil di Warung
              </div>
              <div className="text-[10px] text-neutral-600 font-medium">
                Langsung siap tanpa antre
              </div>
            </div>
          </div>

          <div className="h-px bg-neutral-100" />

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-950 text-[#d4f952] flex items-center justify-center shrink-0 shadow-2xs">
              <CreditCard className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs font-black text-neutral-950 leading-tight">
                Tunai &amp; QRIS
              </div>
              <div className="text-[10px] text-neutral-600 font-medium">
                Bisa bayar di kasir / COD
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
