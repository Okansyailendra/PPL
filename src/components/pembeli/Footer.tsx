'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-14 pt-8 pb-10 border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 font-medium">
      <div className="flex items-center gap-2">
        <span className="font-sans font-black text-neutral-900 text-sm">Wadira.</span>
        <span>• Warung Madura &amp; Pembayaran Digital PPOB</span>
      </div>
      <div>
        Buka Setiap Hari: 06.00 – 24.00 WIB
      </div>
    </footer>
  );
}
