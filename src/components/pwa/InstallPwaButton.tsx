'use client';

import React, { useEffect, useState } from 'react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  X,
  Share,
  MoreVertical,
  Monitor,
} from 'lucide-react';

interface InstallPwaButtonProps {
  variant?: 'header' | 'card' | 'subtle';
  className?: string;
}

type PlatformTab = 'android' | 'ios' | 'desktop';

export default function InstallPwaButton({
  variant = 'header',
  className = '',
}: InstallPwaButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeTab, setActiveTab] = useState<PlatformTab>('android');
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    setMounted(true);

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as any).standalone);
    setIsInstalled(standalone);

    if (window.__wadiraInstallPrompt) {
      setHasNativePrompt(true);
    }

    // Deteksi platform awal untuk tab panduan
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/i.test(ua)) {
      setActiveTab('ios');
    } else if (/Android/i.test(ua)) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }

    const onInstallable = () => setHasNativePrompt(true);
    const onInstalled = () => {
      setHasNativePrompt(false);
      setIsInstalled(true);
      setJustInstalled(true);
      setShowGuideModal(false);
    };

    window.addEventListener('wadira:pwa-installable', onInstallable);
    window.addEventListener('wadira:pwa-installed', onInstalled);

    return () => {
      window.removeEventListener('wadira:pwa-installable', onInstallable);
      window.removeEventListener('wadira:pwa-installed', onInstalled);
    };
  }, []);

  if (!mounted || isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const promptEvent = window.__wadiraInstallPrompt;
    if (promptEvent && typeof promptEvent.prompt === 'function') {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice?.outcome === 'accepted') {
          window.__wadiraInstallPrompt = null;
          setHasNativePrompt(false);
          setJustInstalled(true);
          setIsInstalled(true);
          return;
        }
      } catch (err) {
        console.warn('Gagal memunculkan prompt instalasi PWA:', err);
      }
    }
    setShowGuideModal(true);
  };

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleInstallClick}
          title="Pasang pintasan aplikasi Wadira ke layar utama HP atau Laptop"
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#cbf14e] hover:bg-[#bde53f] text-[#1c240d] font-bold text-xs shadow-xs transition cursor-pointer ${className}`}
        >
          {justInstalled ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Download className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="hidden sm:inline">
            {hasNativePrompt ? 'Pasang App' : 'Pintasan HP'}
          </span>
          <span className="sm:hidden">Pasang</span>
        </button>
      )}

      {variant === 'subtle' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer ${className}`}
          title="Pasang aplikasi Wadira ke layar utama HP"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#cbf14e]" />
          <span className="hidden md:inline">Pasang App</span>
        </button>
      )}

      {variant === 'card' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`w-full py-2.5 px-4 rounded-xl bg-[#eef5db] hover:bg-[#e1ecc3] border border-[#cde09e] text-[#2f3d14] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${className}`}
        >
          <Smartphone className="w-4 h-4 text-[#465427]" />
          <span>Pasang Pintasan Aplikasi di Layar HP (PWA)</span>
        </button>
      )}

      {/* Modal Panduan Manual Pasang PWA di Layar Utama HP / Desktop */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#465427] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#cbf14e] text-[#1c240d] flex items-center justify-center font-black text-base shadow-xs">
                  w.
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">
                    Pasang Aplikasi Wadira di HP
                  </h3>
                  <p className="text-[11px] text-white/75">
                    Buka kasir &amp; warung 1-sentuhan dari layar utama
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
                aria-label="Tutup panduan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Switch Tabs */}
            <div className="px-6 pt-4">
              <div className="grid grid-cols-3 gap-1.5 bg-neutral-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                    activeTab === 'android'
                      ? 'bg-white text-[#1c240d] shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                    activeTab === 'ios'
                      ? 'bg-white text-[#1c240d] shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Share className="w-3.5 h-3.5" />
                  <span>iPhone</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('desktop')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                    activeTab === 'desktop'
                      ? 'bg-white text-[#1c240d] shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Laptop</span>
                </button>
              </div>
            </div>

            {/* Steps */}
            <div className="p-6 space-y-4">
              {activeTab === 'android' && (
                <ol className="space-y-3 text-xs text-neutral-700">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#eef5db] text-[#344415] font-extrabold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <p className="leading-relaxed pt-0.5">
                      Buka link website Wadira ini di browser{' '}
                      <strong className="text-neutral-900">Google Chrome</strong> HP Anda.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#eef5db] text-[#344415] font-extrabold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <p className="leading-relaxed pt-0.5">
                      Ketuk menu{' '}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-neutral-100 font-bold">
                        <MoreVertical className="w-3 h-3 mr-0.5" />
                        Titik Tiga
                      </span>{' '}
                      di pojok kanan atas browser.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#eef5db] text-[#344415] font-extrabold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <p className="leading-relaxed pt-0.5">
                      Pilih{' '}
                      <strong className="text-neutral-900">
                        &ldquo;Tambahkan ke layar utama&rdquo;
                      </strong>{' '}
                      atau <strong className="text-neutral-900">&ldquo;Instal aplikasi&rdquo;</strong>, lalu ketuk{' '}
                      <strong className="text-[#465427]">Instal</strong>.
                    </p>
                  </li>
                </ol>
              )}

              {activeTab === 'ios' && (
                <ol className="space-y-3 text-xs text-neutral-700">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#eef5db] text-[#344415] font-extrabold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <p className="leading-relaxed pt-0.5">
                      Pastikan halaman ini dibuka menggunakan aplikasi{' '}
                      <strong className="text-neutral-900">Safari</strong> di iPhone / iPad.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#eef5db] text-[#344415] font-extrabold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <p className="leading-relaxed pt-0.5">
                      Ketuk tombol{' '}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-neutral-100 font-bold">
                        <Share className="w-3 h-3 mr-1" />
                        Bagikan (Share)
                      </span>{' '}
                      di bilah bawah Safari.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#eef5db] text-[#344415] font-extrabold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <p className="leading-relaxed pt-0.5">
                      Gulir ke bawah, pilih{' '}
                      <strong className="text-neutral-900">
                        &ldquo;Tambahkan ke Layar Utama&rdquo;
                      </strong>{' '}
                      (<em>Add to Home Screen</em>), lalu ketuk{' '}
                      <strong className="text-[#465427]">Tambah</strong>.
                    </p>
                  </li>
                </ol>
              )}

              {activeTab === 'desktop' && (
                <ol className="space-y-3 text-xs text-neutral-700">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#eef5db] text-[#344415] font-extrabold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <p className="leading-relaxed pt-0.5">
                      Gunakan browser <strong className="text-neutral-900">Google Chrome</strong> atau{' '}
                      <strong className="text-neutral-900">Microsoft Edge</strong> di laptop kasir warung.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#eef5db] text-[#344415] font-extrabold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <p className="leading-relaxed pt-0.5">
                      Klik ikon{' '}
                      <strong className="text-neutral-900">Instal / App</strong> di ujung kanan kolom alamat URL (address bar), atau buka Menu ⋮ &rarr; <em>Save and share</em> &rarr; <em>Install page as app</em>.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#eef5db] text-[#344415] font-extrabold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <p className="leading-relaxed pt-0.5">
                      Pintasan aplikasi <strong>Wadira</strong> otomatis terpasang di Desktop / Start Menu laptop.
                    </p>
                  </li>
                </ol>
              )}

              <div className="p-3 rounded-xl bg-[#f7f9f2] border border-[#e2ebd0] text-[11px] text-[#4a5538] leading-relaxed">
                <strong>Info:</strong> Setelah dipasang, ikon <strong>Wadira</strong> akan muncul sejajar aplikasi lain di HP dan bisa dibuka penuh tanpa bilah browser.
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#465427] hover:bg-[#38441f] text-white font-bold text-xs transition cursor-pointer"
              >
                Mengerti &amp; Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
