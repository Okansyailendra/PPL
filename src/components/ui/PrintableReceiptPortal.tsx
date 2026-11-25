'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface PrintableReceiptItem {
  name: string;
  quantity: number;
  unit?: string;
  price: number;
  subtotal?: number;
}

export interface PrintableReceiptProps {
  storeName: string;
  storeSubtitle?: string;
  storeAddress?: string;
  storePhone?: string;
  receiptNumber: string;
  dateLabel: string;
  customerName?: string | null;
  customerPhone?: string | null;
  cashierName?: string | null;
  items: PrintableReceiptItem[];
  totalAmount: number;
  shippingCost?: number;
  paymentMethodLabel: string;
  paymentStatus?: string;
  cashReceived?: number;
  change?: number;
  notes?: string | null;
  footerTitle?: string;
  footerNote?: string;
}

function formatRupiah(val: number): string {
  return `Rp ${Math.round(Number(val) || 0).toLocaleString('id-ID')}`;
}

/**
 * Tampilan struk murni untuk pelanggan (tanpa teks internal kasir, info sisa stok, atau tombol aksi).
 * Mode "print" menggunakan lebar penuh kertas dengan kontras hitam-putih tajam.
 */
export function CustomerReceiptView({
  receipt,
  variant = 'screen',
}: {
  receipt: PrintableReceiptProps;
  variant?: 'screen' | 'print';
}) {
  const isPrint = variant === 'print';

  return (
    <div
      className={
        isPrint
          ? 'w-full bg-white text-black font-mono text-xs leading-relaxed p-2'
          : 'w-full bg-[#fafaf7] rounded-2xl border border-neutral-200 p-4 sm:p-5 font-mono text-neutral-800 text-xs space-y-3 shadow-inner'
      }
    >
      {/* Header Toko */}
      <div className={`text-center space-y-0.5 ${isPrint ? 'pb-3' : ''}`}>
        <h3
          className={`font-black tracking-tight font-sans uppercase ${
            isPrint ? 'text-xl text-black' : 'text-base sm:text-lg text-neutral-950'
          }`}
        >
          {receipt.storeName}
        </h3>
        {receipt.storeSubtitle && (
          <p className={`font-sans ${isPrint ? 'text-xs text-black' : 'text-[11px] text-neutral-600'}`}>
            {receipt.storeSubtitle}
          </p>
        )}
        {receipt.storeAddress && (
          <p className={isPrint ? 'text-[11px] text-black' : 'text-[10px] text-neutral-500'}>
            {receipt.storeAddress}
          </p>
        )}
        {receipt.storePhone && (
          <p className={isPrint ? 'text-[11px] text-black' : 'text-[10px] text-neutral-500'}>
            {receipt.storePhone}
          </p>
        )}
      </div>

      <div className={`border-t border-dashed ${isPrint ? 'border-black my-3' : 'border-neutral-300 my-2'}`} />

      {/* Informasi Transaksi */}
      <div className={`space-y-1 ${isPrint ? 'text-xs' : 'text-[11px]'}`}>
        <div className="flex justify-between gap-4">
          <span className={isPrint ? 'text-black' : 'text-neutral-500'}>No. Struk</span>
          <span className="font-bold text-right">{receipt.receiptNumber}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className={isPrint ? 'text-black' : 'text-neutral-500'}>Tanggal</span>
          <span className="text-right">{receipt.dateLabel}</span>
        </div>
        {receipt.cashierName && (
          <div className="flex justify-between gap-4">
            <span className={isPrint ? 'text-black' : 'text-neutral-500'}>Kasir</span>
            <span className="text-right">{receipt.cashierName}</span>
          </div>
        )}
        {receipt.customerName && (
          <div className="flex justify-between gap-4">
            <span className={isPrint ? 'text-black' : 'text-neutral-500'}>Pelanggan</span>
            <span className="font-bold text-right">{receipt.customerName}</span>
          </div>
        )}
        {receipt.customerPhone && (
          <div className="flex justify-between gap-4">
            <span className={isPrint ? 'text-black' : 'text-neutral-500'}>No. HP</span>
            <span className="text-right">{receipt.customerPhone}</span>
          </div>
        )}
        {receipt.notes && (
          <div className="flex justify-between gap-4">
            <span className={isPrint ? 'text-black shrink-0' : 'text-neutral-500 shrink-0'}>Catatan</span>
            <span className="text-right">{receipt.notes}</span>
          </div>
        )}
      </div>

      <div className={`border-t border-dashed ${isPrint ? 'border-black my-3' : 'border-neutral-300 my-2'}`} />

      {/* Daftar Belanja */}
      <div className={`space-y-2 ${isPrint ? 'text-xs' : 'text-[11px]'}`}>
        {receipt.items.length > 0 ? (
          receipt.items.map((it, idx) => {
            const lineSubtotal = it.subtotal ?? it.quantity * it.price;
            return (
              <div key={idx} className="space-y-0.5">
                <div className={`font-bold ${isPrint ? 'text-black' : 'text-neutral-900'}`}>
                  {it.name}
                </div>
                <div
                  className={`flex justify-between pl-2 ${
                    isPrint ? 'text-black' : 'text-neutral-600'
                  }`}
                >
                  <span>
                    {it.quantity} {it.unit || 'pcs'} &times; {formatRupiah(it.price)}
                  </span>
                  <span className={`font-bold ${isPrint ? 'text-black' : 'text-neutral-900'}`}>
                    {formatRupiah(lineSubtotal)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="italic text-neutral-500">Tidak ada rincian barang</div>
        )}
      </div>

      <div className={`border-t border-dashed ${isPrint ? 'border-black my-3' : 'border-neutral-300 my-2'}`} />

      {/* Ringkasan Pembayaran */}
      <div className={`space-y-1.5 ${isPrint ? 'text-xs' : 'text-[11px]'}`}>
        {Number(receipt.shippingCost || 0) > 0 && (
          <>
            <div className="flex justify-between">
              <span>Subtotal Belanja</span>
              <span>{formatRupiah(receipt.totalAmount - Number(receipt.shippingCost || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span>Ongkos Kirim</span>
              <span>{formatRupiah(Number(receipt.shippingCost))}</span>
            </div>
          </>
        )}

        <div
          className={`flex justify-between font-black pt-1 border-t ${
            isPrint
              ? 'text-base text-black border-black'
              : 'text-sm text-neutral-950 border-neutral-300'
          }`}
        >
          <span>TOTAL BELANJA</span>
          <span>{formatRupiah(receipt.totalAmount)}</span>
        </div>

        <div className="flex justify-between pt-1">
          <span>Metode Bayar</span>
          <span className="font-bold uppercase">{receipt.paymentMethodLabel}</span>
        </div>

        {receipt.paymentStatus && (
          <div className="flex justify-between">
            <span>Status</span>
            <span className={`font-bold uppercase ${isPrint ? 'text-black' : 'text-emerald-700'}`}>
              {receipt.paymentStatus}
            </span>
          </div>
        )}

        {typeof receipt.cashReceived === 'number' && receipt.cashReceived > 0 && (
          <>
            <div className="flex justify-between">
              <span>Uang Diterima</span>
              <span className="font-semibold">{formatRupiah(receipt.cashReceived)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Kembalian</span>
              <span>{formatRupiah(receipt.change || 0)}</span>
            </div>
          </>
        )}
      </div>

      <div className={`border-t border-dashed ${isPrint ? 'border-black my-3' : 'border-neutral-300 my-2'}`} />

      {/* Footer Pelanggan */}
      <div className={`text-center font-sans space-y-1 pt-1 ${isPrint ? 'text-[11px] text-black' : 'text-[10px] text-neutral-500'}`}>
        <p className={`font-bold ${isPrint ? 'text-black' : 'text-neutral-700'}`}>
          {receipt.footerTitle || '*** TERIMA KASIH TELAH BERBELANJA ***'}
        </p>
        <p>
          {receipt.footerNote ||
            'Barang yang sudah dibeli dapat ditukar jika kemasan rusak saat diterima.'}
        </p>
      </div>
    </div>
  );
}

/**
 * Portal cetak khusus yang merender struk pelanggan langsung di bawah <body>
 * sehingga saat window.print() dipanggil hanya 1 halaman struk bersih yang tercetak.
 */
export default function PrintableReceiptPortal({
  receipt,
}: {
  receipt: PrintableReceiptProps | null;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !receipt) {
      document.body.classList.remove('has-print-receipt');
      return;
    }

    document.body.classList.add('has-print-receipt');
    return () => {
      document.body.classList.remove('has-print-receipt');
    };
  }, [mounted, receipt]);

  if (!mounted || !receipt) return null;

  return createPortal(
    <div id="wadira-print-receipt" className="hidden print:block">
      <CustomerReceiptView receipt={receipt} variant="print" />
    </div>,
    document.body
  );
}
