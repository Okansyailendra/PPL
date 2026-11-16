'use client';

import React from 'react';
import { MapPin, Clock, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-14 pt-8 pb-12 border-t border-neutral-200/80 text-xs text-neutral-500 font-medium space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-sans font-black text-neutral-900 text-base">Wadira.</span>
            <span>• Warung Madura &amp; Pembayaran Digital PPOB</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-600">
            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span>Jl. Mangga Raya No. 28, Perumnas Kamal, Banyuajuh, Kamal</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-neutral-600">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold text-neutral-800">Buka Setiap Hari: 08.30 – 21.00 WIB</span>
          </div>

          <a
            href="https://wa.me/6289516201846?text=Halo%20Toko%20Wadira,%20mau%20tanya%20stok%20barang"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold transition"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Hubungi WhatsApp Kasir</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
