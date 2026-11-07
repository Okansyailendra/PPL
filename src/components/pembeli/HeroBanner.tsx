'use client';

import React from 'react';
import { ShoppingBag, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function HeroBanner() {
  const { fulfillmentType, setFulfillmentType } = useCart();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#d4f952] text-neutral-950 p-6 sm:p-7 shadow-xs border border-[#c4ec3e]">
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold text-neutral-900 mb-1 border border-neutral-900/10">
            <span>TOKO WADIRA (WARUNG MADURA)</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight text-neutral-950">
            Kebutuhan rumah, dari warung tetangga.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-medium">
            Pesan sembako harian dan belanjaan dapur lewat katalog online, pesanan langsung disiapkan kasir Toko Wadira.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-neutral-950/10 p-1.5 rounded-2xl border border-neutral-950/15">
          <button
            onClick={() => setFulfillmentType('pickup')}
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              fulfillmentType === 'pickup'
                ? 'bg-neutral-950 text-white shadow-xs'
                : 'text-neutral-800 hover:bg-white/60'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#d4f952]" />
            <span>Ambil di warung</span>
          </button>

          <button
            onClick={() => setFulfillmentType('delivery')}
            type="button"
            className={`flex flex-col items-start px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              fulfillmentType === 'delivery'
                ? 'bg-neutral-950 text-white shadow-xs'
                : 'text-neutral-800 hover:bg-white/60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#d4f952]" />
              <span>Antar ke rumah</span>
            </div>
            <span className={`text-[10px] font-normal ${fulfillmentType === 'delivery' ? 'text-neutral-300' : 'text-neutral-600'}`}>
              Radius pemukiman warga
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
