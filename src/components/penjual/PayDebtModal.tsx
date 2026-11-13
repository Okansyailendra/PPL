'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Wallet, QrCode, Building, Save, AlertCircle } from 'lucide-react';
import type { Debt } from '@/types';
import { recordDebtPayment } from '@/app/actions/piutang';

interface PayDebtModalProps {
  debt: Debt | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (res: any) => void;
}

export default function PayDebtModal({ debt, isOpen, onClose, onSuccess }: PayDebtModalProps) {
  const [payType, setPayType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const totalAmount = Number(debt?.amount) || 0;
  const currentPaid = Number(debt?.paid_amount) || 0;
  const remainingAmount = Number(debt?.remaining_amount ?? (totalAmount - currentPaid));

  useEffect(() => {
    if (debt) {
      setErrorMessage('');
      setNotes('');
      setPaymentMethod('CASH');
      if (payType === 'FULL') {
        setAmountPaid(String(remainingAmount));
      } else {
        setAmountPaid(String(Math.min(remainingAmount, Math.round(remainingAmount / 2))));
      }
    }
  }, [debt, payType, remainingAmount]);

  if (!isOpen || !debt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const parsedAmount = parseInt(amountPaid, 10);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Nominal pembayaran harus berupa angka positif.');
      return;
    }

    if (parsedAmount > remainingAmount) {
      setErrorMessage(`Nominal pembayaran melebihi sisa kasbon (Rp ${remainingAmount.toLocaleString('id-ID')}).`);
      return;
    }

    setLoading(true);
    try {
      const res = await recordDebtPayment({
        debtId: debt.id,
        amountPaid: parsedAmount,
        paymentMethod,
        notes,
      });

      if (res?.error) {
        setErrorMessage(res.error);
        setLoading(false);
      } else {
        setLoading(false);
        onSuccess(res);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menyimpan pembayaran');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl relative border border-neutral-200">
        {/* Header Lime Green */}
        <div className="bg-[#cbf14e] px-6 py-5 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-extrabold tracking-wider text-[#354614] uppercase block">
              CATAT PEMBAYARAN KASBON
            </span>
            <h3 className="text-xl font-black text-[#1c240d] mt-0.5">
              Bayar / Cicil Kasbon
            </h3>
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
          {/* Info Pelanggan & Sisa */}
          <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase">Pelanggan</span>
                <p className="font-extrabold text-neutral-900 text-sm">{debt.customer_name}</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eef5db] text-[#465427] border border-[#d6e5b4]">
                {debt.type === 'PINJAMAN_TUNAI' ? 'Pinjaman Tunai' : 'Kasbon Barang'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200/60 text-xs">
              <div>
                <span className="text-[10px] text-neutral-500 block">Total Utang</span>
                <span className="font-bold text-neutral-800">Rp {totalAmount.toLocaleString('id-ID')}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block">Sudah Dibayar</span>
                <span className="font-bold text-emerald-700">Rp {currentPaid.toLocaleString('id-ID')}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block">Sisa Tagihan</span>
                <span className="font-black text-rose-600">Rp {remainingAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pilihan: Bayar Lunas vs Cicil Sebagian */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1.5">
                Pilih Jenis Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPayType('FULL');
                    setAmountPaid(String(remainingAmount));
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    payType === 'FULL'
                      ? 'border-[#c4ec3e] bg-[#f5fae8] ring-2 ring-[#cbf14e]'
                      : 'border-neutral-200 bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">Bayar Lunas</span>
                    {payType === 'FULL' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                    Lunasi seluruh sisa tagihan (Rp {remainingAmount.toLocaleString('id-ID')})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPayType('PARTIAL');
                    setAmountPaid('');
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    payType === 'PARTIAL'
                      ? 'border-[#c4ec3e] bg-[#f5fae8] ring-2 ring-[#cbf14e]'
                      : 'border-neutral-200 bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">Cicil Sebagian</span>
                    {payType === 'PARTIAL' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                    Bayar sebagian dari tagihan yang ada
                  </span>
                </button>
              </div>
            </div>

            {/* Input Nominal Pembayaran */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Nominal Pembayaran (Rp) *
              </label>
              <input
                type="number"
                required
                min="500"
                max={remainingAmount}
                step="500"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="Contoh: 25000"
                className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 font-extrabold focus:outline-none focus:border-[#465427] shadow-xs"
              />
              {payType === 'PARTIAL' && amountPaid && (
                <span className="text-[11px] text-neutral-500 mt-1 block">
                  Perkiraan sisa setelah dicicil: <strong>Rp {Math.max(0, remainingAmount - (parseInt(amountPaid, 10) || 0)).toLocaleString('id-ID')}</strong>
                </span>
              )}
            </div>

            {/* Pilihan Metode Bayar */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1.5">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                    paymentMethod === 'CASH'
                      ? 'border-neutral-900 bg-neutral-900 text-white font-bold'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 font-medium'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span className="text-[11px]">Tunai / Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('QRIS')}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                    paymentMethod === 'QRIS'
                      ? 'border-neutral-900 bg-neutral-900 text-white font-bold'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 font-medium'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span className="text-[11px]">QRIS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFER')}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                    paymentMethod === 'TRANSFER'
                      ? 'border-neutral-900 bg-neutral-900 text-white font-bold'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 font-medium'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span className="text-[11px]">Transfer</span>
                </button>
              </div>
            </div>

            {/* Catatan Pembayaran */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Catatan Pembayaran (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Titip uang lewat istri / bayar cicilan ke-1"
                className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#465427] shadow-xs"
              />
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{loading ? 'Menyimpan...' : 'Simpan Pembayaran'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

