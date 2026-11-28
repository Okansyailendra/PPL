import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Wadira — Warung Digital Madura',
    short_name: 'Wadira',
    description:
      'Sistem kasir POS, manajemen stok warung, pembukuan keuangan, dan belanja online Toko Wadira.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8faf6',
    theme_color: '#465427',
    lang: 'id',
    categories: ['business', 'finance', 'shopping'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Kasir & Transaksi',
        short_name: 'Kasir POS',
        description: 'Buka mesin kasir warung & scan barcode',
        url: '/dashboard/penjual/transaksi',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Stok & Restock',
        short_name: 'Cek Stok',
        description: 'Pantau persediaan dan kulakan barang warung',
        url: '/dashboard/penjual/stok',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Piutang & Kasbon',
        short_name: 'Kasbon',
        description: 'Lihat catatan utang pelanggan warung',
        url: '/dashboard/penjual/piutang',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Etalase Belanja',
        short_name: 'Etalase',
        description: 'Lihat katalog belanja pelanggan Toko Wadira',
        url: '/dashboard/pelanggan',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
