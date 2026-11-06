'use client';

import React from 'react';
import { ShoppingBag, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function HeroBanner() {
  const { fulfillmentType, setFulfillmentType } = useCart();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 shadow-sm">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-16 w-48 h-48 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-lg">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Kebutuhan rumah, dari warung tetangga.
          </h2>
          <p className="text-xs md:text-sm text-emerald-100/90 leading-relaxed">
            Order sampai dus. Pesan lewat WhatsApp, pesanan disiapkan langsung oleh warung Alin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-emerald-950/40 p-1.5 rounded-xl border border-emerald-700/50 backdrop-blur-xs">
          <button
            onClick={() => setFulfillmentType('pickup')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              fulfillmentType === 'pickup'
                ? 'bg-white text-emerald-955 shadow-sm'
                : 'text-emerald-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ambil di warung</span>
          </button>

          <button
            onClick={() => setFulfillmentType('delivery')}
            className={`flex flex-col items-start px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              fulfillmentType === 'delivery'
                ? 'bg-white text-emerald-950 shadow-sm'
                : 'text-emerald-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Antar ke rumah</span>
            </div>
            <span className="text-[10px] text-emerald-300 font-normal">
              Bisa di jam non-ramai
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
