'use client';

import React, { useState, useEffect } from 'react';
import { X, History, Calendar, CheckCircle2, Clock, Wallet } from 'lucide-react';
import type { Debt, PaymentLog } from '@/types';
import { getPaymentLogs } from '@/app/actions/piutang';

interface PaymentLogsModalProps {
  debt: Debt | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentLogsModal({ debt, isOpen, onClose }: PaymentLogsModalProps) {
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && debt) {
      setLoading(true);
      getPaymentLogs(debt.id).then((res) => {
        if (isMounted) {
          if (res?.success && res.logs) {
            setLogs(res.logs);
          } else {
            setLogs([]);
          }
          setLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, debt]);

  if (!isOpen || !debt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl relative border border-neutral-200">
        {/* Header */}
        <div className="bg-[#cbf14e] px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-[#1c240d] flex items-center justify-center font-bold text-xs shadow-2xs">
              <History className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold tracking-wider text-[#354614] uppercase block">
                HISTORI PEMBAYARAN
              </span>
              <h3 className="text-xl font-black text-[#1c240d]">
                Riwayat Cicilan Kasbon
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-xs cursor-pointer transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Tutup</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="p-3 bg-[#f6fbe9] border border-[#e2f3b8] rounded-2xl flex items-center justify-between text-xs mb-4">
            <div>
              <span className="text-neutral-500 block text-[10px]">Pelanggan</span>
              <strong className="text-neutral-900">{debt.customer_name}</strong>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 block text-[10px]">Total Kasbon</span>
              <strong className="text-neutral-900">Rp {debt.amount.toLocaleString('id-ID')}</strong>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              Memuat riwayat pembayaran...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center space-y-1">
              <Clock className="w-8 h-8 text-neutral-300 mx-auto" />
              <p className="text-xs font-bold text-neutral-700">Belum Ada Riwayat Cicilan</p>
              <p className="text-[11px] text-neutral-400">
                Belum ada transaksi pembayaran atau cicilan yang dicatat untuk kasbon ini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 max-h-72 overflow-y-auto space-y-2 pr-1">
              {logs.map((log, idx) => (
                <div key={log.id || idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-neutral-900">
                        Rp {Number(log.amount_paid).toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 bg-neutral-100 rounded text-neutral-600 font-semibold uppercase">
                          {log.payment_method || 'CASH'}
                        </span>
                        <span>•</span>
                        <span>{log.payment_date ? new Date(log.payment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      </div>
                      {log.notes && (
                        <p className="text-[11px] text-neutral-600 italic mt-0.5">
                          &ldquo;{log.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    Berhasil
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between mt-4 text-xs text-neutral-400">
            <span>Total {logs.length} kali pembayaran</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

