'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Trash2, X } from 'lucide-react';

export type ConfirmTone = 'danger' | 'primary';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Fokuskan tombol batal agar aksi destruktif tidak terpicu tanpa sengaja.
    const focusTimer = window.setTimeout(() => cancelRef.current?.focus(), 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open, onCancel]);

  if (!mounted || !open) return null;

  const isDanger = tone === 'danger';

  return createPortal(
    <div
      className="dialog-overlay fixed inset-0 z-[100] flex items-center justify-center bg-[#1c240d]/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="dialog-panel w-full max-w-[26rem] overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-2xl"
      >
        <div className={`h-1 w-full ${isDanger ? 'bg-[#ba1a1a]' : 'bg-[#cbf14e]'}`} />

        <div className="flex items-start gap-4 px-6 pb-5 pt-5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
              isDanger
                ? 'border-[#ffdad6] bg-[#ffdad6]/60 text-[#ba1a1a]'
                : 'border-[#d6e5b4] bg-[#eef5db] text-[#465427]'
            }`}
          >
            {isDanger ? <Trash2 className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
              Konfirmasi tindakan
            </p>
            <h2
              id="confirm-dialog-title"
              className="mt-0.5 text-base font-extrabold tracking-tight text-neutral-900"
            >
              {title}
            </h2>
            {description && (
              <div
                id="confirm-dialog-description"
                className="mt-1.5 text-xs leading-relaxed text-neutral-500 sm:text-sm"
              >
                {description}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup dialog"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isDanger && (
          <div className="mx-6 mb-5 flex items-start gap-2 rounded-xl border border-[#ffdad6] bg-[#fff5f4] px-3 py-2.5 text-[11px] font-medium leading-relaxed text-[#93000a]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ba1a1a]" />
            <span>Tindakan ini tidak dapat dibatalkan.</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 bg-[#f8faf6] px-6 py-3.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-bold text-neutral-700 shadow-xs transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-1"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shadow-xs transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              isDanger
                ? 'bg-[#ba1a1a] text-white hover:bg-[#9d1414] focus:ring-[#ba1a1a]/40'
                : 'bg-[#cbf14e] text-[#1c240d] hover:bg-[#bde343] focus:ring-[#cbf14e]'
            }`}
          >
            {isDanger && <Trash2 className="h-3.5 w-3.5" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
