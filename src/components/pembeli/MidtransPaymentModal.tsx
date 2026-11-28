'use client';

import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { PaymentChannel } from '@/lib/midtrans';

export interface MidtransChargeData {
  orderId: string;
  grossAmount: number;
  paymentChannel: PaymentChannel;
  channelLabel: string;
  qrImageUrl: string | null;
  qrString: string | null;
  vaNumber: string | null;
  bank: string | null;
  expiryTime: string | null;
  waUrl: string;
}

interface MidtransPaymentModalProps {
  charge: MidtransChargeData;
  onClose: () => void;
  onPaidSuccess: (charge: MidtransChargeData) => void;
}

function formatRemainingTime(expiryTime: string | null): string {
  if (!expiryTime) return '15:00';
  const normalized = expiryTime.includes('T') ? expiryTime : expiryTime.replace(' ', 'T') + '+07:00';
  const targetMs = new Date(normalized).getTime();
  if (Number.isNaN(targetMs)) return expiryTime;
  const diffSec = Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
  if (diffSec === 0) return 'Kedaluwarsa';
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function MidtransPaymentModal({
  charge,
  onClose,
  onPaidSuccess,
}: MidtransPaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [isExpiredOrFailed, setIsExpiredOrFailed] = useState(false);
  const [countdown, setCountdown] = useState(() => formatRemainingTime(charge.expiryTime));

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(formatRemainingTime(charge.expiryTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [charge.expiryTime]);

  const checkPaymentStatus = async (isManual = false) => {
    if (checking) return;
    try {
      if (isManual) setChecking(true);
      const res = await fetch(`/api/payment/status?orderId=${encodeURIComponent(charge.orderId)}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (data?.paymentStatus === 'SETTLEMENT') {
        onPaidSuccess(charge);
        return;
      }

      if (data?.paymentStatus === 'EXPIRE' || data?.paymentStatus === 'CANCEL' || data?.paymentStatus === 'FAILED') {
        setIsExpiredOrFailed(true);
        setStatusNote('Tagihan pembayaran telah kedaluwarsa atau dibatalkan. Silakan buat tagihan ulang.');
        return;
      }

      if (isManual) {
        setStatusNote('Pembayaran belum terkonfirmasi. Jika Anda baru saja membayar, tunggu beberapa detik lalu cek lagi.');
      }
    } catch {
      if (isManual) {
        setStatusNote('Gagal mengecek status pembayaran. Periksa koneksi internet Anda.');
      }
    } finally {
      if (isManual) setChecking(false);
    }
  };

  useEffect(() => {
    if (isExpiredOrFailed) return;
    const poller = setInterval(() => {
      checkPaymentStatus(false);
    }, 5000);
    return () => clearInterval(poller);
  }, [charge.orderId, isExpiredOrFailed]);

  const handleCopyVa = async () => {
    if (!charge.vaNumber) return;
    try {
      await navigator.clipboard.writeText(charge.vaNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const isQris = charge.paymentChannel === 'qris';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#d6e5c5] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header bertema Wadira Olive */}
        <div className="bg-[#465427] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight">wadira.</span>
              <span className="px-2 py-0.5 rounded-full bg-[#cbf14e] text-[#1c240d] text-[10px] font-extrabold uppercase tracking-wide">
                {isQris ? 'QRIS Instan' : `${charge.bank || 'VA'} Transfer`}
              </span>
            </div>
            <p className="text-[11px] text-white/80 mt-0.5">
              Pembayaran Aman • Midtrans Core Gateway
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela pembayaran"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Ringkasan Tagihan & Countdown */}
        <div className="bg-[#f4f8ed] border-b border-[#d6e5c5] px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-[#465427] uppercase tracking-wider block">
              Total Pembayaran
            </span>
            <div className="text-2xl font-black text-neutral-950 tracking-tight">
              Rp {Number(charge.grossAmount || 0).toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] font-mono text-neutral-600">
              #{charge.orderId}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-neutral-500 uppercase block">
              Batas Waktu
            </span>
            <div className="mt-0.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-[#c9dcb0] text-xs font-extrabold text-[#2b3617]">
              <Clock className="w-3.5 h-3.5 text-[#465427]" />
              <span>{countdown}</span>
            </div>
          </div>
        </div>

        {/* Konten Pembayaran (QRIS atau Virtual Account) */}
        <div className="p-6 space-y-4">
          {isQris ? (
            <div className="space-y-3 text-center">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#465427]">
                <QrCode className="w-4 h-4" />
                <span>Scan kode QRIS di bawah ini untuk membayar</span>
              </div>

              <div className="mx-auto w-60 h-60 rounded-2xl border-2 border-[#d6e5c5] bg-white p-3 flex items-center justify-center shadow-2xs">
                {charge.qrImageUrl ? (
                  <img
                    src={charge.qrImageUrl}
                    alt="Kode QRIS Pembayaran Wadira"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-neutral-500">
                    QR Code tidak tersedia. Silakan coba ulangi.
                  </div>
                )}
              </div>

              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Buka aplikasi <strong>GoPay, OVO, DANA, ShopeePay, LinkAja</strong> atau{' '}
                <strong>Mobile Banking</strong> Anda lalu scan QR di atas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#465427]" />
                  <span>Nomor Virtual Account {charge.bank || ''}</span>
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-[#eef5db] text-[#465427]">
                  {charge.bank || 'BANK'} VA
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#fbfcfa] border-2 border-[#d6e5c5] flex items-center justify-between gap-3">
                <div className="font-mono font-black text-lg sm:text-xl text-neutral-950 tracking-wider break-all">
                  {charge.vaNumber || '-'}
                </div>
                <button
                  type="button"
                  onClick={handleCopyVa}
                  className="shrink-0 px-3 py-2 rounded-xl bg-[#cbf14e] hover:bg-[#bde53f] text-[#1c240d] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-600 space-y-1 leading-relaxed">
                <div className="font-bold text-neutral-800">Cara Pembayaran:</div>
                <p>1. Buka Mobile Banking / ATM {charge.bank || 'Bank'} Anda.</p>
                <p>2. Pilih menu <strong>Transfer Virtual Account</strong> dan masukkan nomor di atas.</p>
                <p>3. Pastikan nominal sesuai <strong>Rp {Number(charge.grossAmount || 0).toLocaleString('id-ID')}</strong> lalu selesaikan transaksi.</p>
              </div>
            </div>
          )}

          {statusNote && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border ${
                isExpiredOrFailed
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {statusNote}
            </div>
          )}

          {/* Tombol Aksi */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              disabled={checking || isExpiredOrFailed}
              onClick={() => checkPaymentStatus(true)}
              className="w-full py-3 px-4 rounded-xl bg-[#0F4A3C] hover:bg-[#0c3c31] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memeriksa Pembayaran...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#cbf14e]" />
                  <span>Saya Sudah Bayar • Cek Status</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Otomatis terverifikasi tiap 5 detik</span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="font-semibold text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
