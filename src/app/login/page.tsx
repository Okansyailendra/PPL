'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShoppingCart,
  Package,
  Home,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import InstallPwaButton from '@/components/pwa/InstallPwaButton';

/* =========================================================
 * GOOGLE "G" OFFICIAL LOGO SVG
 * ======================================================= */
function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

/* =========================================================
 * WARUNG STOREFRONT VECTOR ILLUSTRATION (SESUAI GAMBAR 1)
 * ======================================================= */
function WarungIllustration() {
  return (
    <div className="w-full flex items-center justify-center py-2 select-none">
      <svg
        viewBox="0 0 320 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[280px] h-auto drop-shadow-2xs"
      >
        {/* Soft background glow / circle */}
        <ellipse cx="160" cy="115" rx="140" ry="28" fill="#eaf1e1" fillOpacity="0.8" />
        <circle cx="160" cy="70" r="62" fill="#f4f8ee" fillOpacity="0.6" />

        {/* Decorative background tiny plus signs (+) */}
        <path d="M42 62h6M45 59v6" stroke="#9bb17e" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M280 48h6M283 45v6" stroke="#9bb17e" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M290 85h5M292.5 82.5v5" stroke="#9bb17e" strokeWidth="1" strokeLinecap="round" />
        <path d="M30 98h5M32.5 95.5v5" stroke="#9bb17e" strokeWidth="1" strokeLinecap="round" />

        {/* Paper Shopping Bag on the Left */}
        <g transform="translate(48, 72)">
          {/* Bag Handle */}
          <path
            d="M8 8 C8 0, 20 0, 20 8"
            stroke="#809960"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
          {/* Bag Body */}
          <path
            d="M2 8 L26 8 L24 38 L4 38 Z"
            fill="#e7efdb"
            stroke="#6f874f"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Subtle bag crease */}
          <path d="M14 8 L14 38" stroke="#bed3a7" strokeWidth="1" strokeDasharray="2 2" />
        </g>

        {/* Potted Plant on the Right */}
        <g transform="translate(242, 74)">
          {/* Stems & Leaves */}
          <path
            d="M14 18 C14 8, 4 4, 4 4 C4 4, 12 12, 14 18"
            fill="#88a565"
            stroke="#6f874f"
            strokeWidth="1.2"
          />
          <path
            d="M14 16 C14 6, 24 2, 24 2 C24 2, 18 10, 14 16"
            fill="#9ebb75"
            stroke="#6f874f"
            strokeWidth="1.2"
          />
          <path
            d="M14 14 C14 0, 14 0, 14 0 C14 0, 12 8, 14 14"
            fill="#759451"
            stroke="#6f874f"
            strokeWidth="1.2"
          />
          {/* Pot */}
          <path
            d="M6 18 L22 18 L20 36 L8 36 Z"
            fill="#e7efdb"
            stroke="#6f874f"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <line x1="5" y1="18" x2="23" y2="18" stroke="#6f874f" strokeWidth="1.5" />
        </g>

        {/* Main Warung Building (Center) */}
        <g id="warung-building">
          {/* Building Base Walls */}
          <rect
            x="94"
            y="52"
            width="132"
            height="58"
            rx="3"
            fill="#ffffff"
            stroke="#607641"
            strokeWidth="2"
          />

          {/* Left Windows (2 small square display panes) */}
          <rect
            x="106"
            y="64"
            width="22"
            height="20"
            rx="1.5"
            fill="#f4f8ed"
            stroke="#758c54"
            strokeWidth="1.3"
          />
          <line x1="117" y1="64" x2="117" y2="84" stroke="#758c54" strokeWidth="1" />
          <line x1="106" y1="74" x2="128" y2="74" stroke="#758c54" strokeWidth="1" />

          {/* Center Windows (2 small square display panes) */}
          <rect
            x="136"
            y="64"
            width="22"
            height="20"
            rx="1.5"
            fill="#f4f8ed"
            stroke="#758c54"
            strokeWidth="1.3"
          />
          <line x1="147" y1="64" x2="147" y2="84" stroke="#758c54" strokeWidth="1" />
          <line x1="136" y1="74" x2="158" y2="74" stroke="#758c54" strokeWidth="1" />

          {/* Right Door */}
          <rect
            x="172"
            y="62"
            width="38"
            height="48"
            rx="1"
            fill="#f0f6e8"
            stroke="#758c54"
            strokeWidth="1.4"
          />
          <line x1="172" y1="110" x2="210" y2="110" stroke="#607641" strokeWidth="1.4" />
          {/* Door Handle */}
          <line x1="176" y1="84" x2="176" y2="92" stroke="#607641" strokeWidth="2" strokeLinecap="round" />

          {/* Striped Canopy / Awning */}
          {/* Canopy Roof Frame */}
          <path
            d="M86 42 L234 42 L240 55 C240 58 80 58 80 55 Z"
            fill="#738f4d"
            stroke="#516434"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Canopy Stripes */}
          <path d="M88 42 L84 55 L96 55 L98 42 Z" fill="#88a85e" />
          <path d="M106 42 L105 55 L117 55 L116 42 Z" fill="#88a85e" />
          <path d="M126 42 L126 55 L138 55 L137 42 Z" fill="#88a85e" />
          <path d="M147 42 L147 55 L159 55 L158 42 Z" fill="#88a85e" />
          <path d="M168 42 L168 55 L180 55 L179 42 Z" fill="#88a85e" />
          <path d="M189 42 L190 55 L202 55 L200 42 Z" fill="#88a85e" />
          <path d="M211 42 L212 55 L224 55 L222 42 Z" fill="#88a85e" />
          <path d="M231 42 L234 55 L240 55 L234 42 Z" fill="#88a85e" />

          {/* Scalloped edge */}
          <path
            d="M80 55 Q86 59 92 55 Q98 59 104 55 Q110 59 116 55 Q122 59 128 55 Q134 59 140 55 Q146 59 152 55 Q158 59 164 55 Q170 59 176 55 Q182 59 188 55 Q194 59 200 55 Q206 59 212 55 Q218 59 224 55 Q230 59 236 55 Q240 59 240 55"
            stroke="#516434"
            strokeWidth="1.5"
            fill="none"
          />
        </g>

        {/* Base ground line */}
        <line x1="30" y1="110" x2="290" y2="110" stroke="#b0c598" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/* =========================================================
 * LOGIN CONTENT COMPONENT
 * ======================================================= */
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect') || searchParams.get('callbackUrl') || '';
  const errorParam = searchParams.get('error');
  const sessionExpired = searchParams.get('session_expired') === '1';

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorParam) {
      if (errorParam === 'GoogleClientIdBelumDiatur') {
        setErrorMessage('Kredensial Google OAuth (Client ID) belum dimasukkan ke file .env.local oleh pengembang.');
      } else {
        setErrorMessage(decodeURIComponent(errorParam));
      }
    } else if (sessionExpired) {
      setErrorMessage('Sesi Anda telah berakhir. Silakan masuk kembali.');
    }
  }, [errorParam, sessionExpired]);

  // Handler klik tombol "Lanjutkan dengan Google": Langsung ke OAuth resmi Google
  const handleGoogleClick = () => {
    setIsLoading(true);
    setErrorMessage(null);
    const targetUrl = `/api/auth/google${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`;
    window.location.href = targetUrl;
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f4f5ef] text-neutral-900 font-sans antialiased">
      {/* ========================================================= */}
      {/* LEFT PANEL: Deep Olive Branding & Highlights (1:1 Gambar 1) */}
      {/* ========================================================= */}
      <div className="w-full lg:w-[42%] lg:min-w-[420px] lg:max-w-[480px] bg-[#4a5829] text-white flex flex-col justify-between shrink-0 shadow-lg relative z-10">
        {/* Top & Middle Content Container */}
        <div className="p-6 sm:p-10 lg:p-12 flex flex-col justify-between flex-1">
          {/* Brand Wordmark & Tagline */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-sans text-2xl sm:text-3xl font-black tracking-tight text-[#d5ed70] group-hover:opacity-90 transition">
                wadira.
              </span>
            </Link>
            <div className="h-5 w-px bg-white/25 mx-1" />
            <div className="flex flex-col text-[11px] leading-tight text-white/80 font-medium">
              <span>Warung Madura</span>
              <span>Digital</span>
            </div>
          </div>

          {/* Main Editorial Hero Copy */}
          <div className="my-10 lg:my-14 space-y-3.5">
            <div className="text-[11px] font-bold text-white/60 tracking-wider uppercase">
              MEJA OPERASIONAL WARUNG
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight leading-[1.12]">
              <span className="text-white block">Warung terkelola.</span>
              <span className="text-[#d5ed70] block">Usaha lebih</span>
              <span className="text-[#d5ed70] block">tertata.</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-sm pt-2">
              Satu ruang kerja untuk membantu Anda menjalankan warung setiap hari.
            </p>
          </div>

          {/* Feature Highlight List */}
          <div className="space-y-4 pt-4">
            <div className="border-t border-white/15 pt-4 flex items-start gap-3.5">
              <ShoppingCart className="w-5 h-5 text-white/85 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Kasir &amp; transaksi
                </h3>
                <p className="text-[11px] text-white/70 mt-0.5 leading-snug">
                  Catat penjualan, layani dengan tenang.
                </p>
              </div>
            </div>

            <div className="border-t border-white/15 pt-4 flex items-start gap-3.5">
              <Package className="w-5 h-5 text-white/85 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Stok &amp; laporan
                </h3>
                <p className="text-[11px] text-white/70 mt-0.5 leading-snug">
                  Pantau persediaan dan pembukuan warung.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Accent Strip (Lime) */}
        <div className="bg-[#d5ed70] text-[#1c240d] px-6 sm:px-10 h-12 flex items-center justify-between border-t border-black/5">
          <span className="text-xs font-bold tracking-tight">
            Wadira / Warung Madura Digital
          </span>
          <Link
            href="/"
            title="Kembali ke halaman utama"
            className="p-1.5 rounded-lg hover:bg-black/10 transition text-[#1c240d]"
          >
            <Home className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT PANEL: Akses Warung Digital Card (1:1 Gambar 1) */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-[#f4f5ef] relative min-h-[580px]">
        {/* Top Header inside Right Panel */}
        <div className="flex items-center justify-between text-[#717865]">
          <span className="text-[11px] font-bold tracking-widest uppercase">
            AKSES WARUNG DIGITAL
          </span>
          <span className="text-xs font-medium">Portal wadira</span>
        </div>

        {/* Center Card Container */}
        <div className="w-full max-w-[480px] mx-auto my-auto py-6 sm:py-8">
          <div className="bg-white rounded-[28px] sm:rounded-3xl p-7 sm:p-10 shadow-xs border border-neutral-200/70">
            {/* Tag Label */}
            <div className="text-[11px] font-extrabold tracking-wider text-[#475529] uppercase mb-2">
              SELAMAT DATANG DI WADIRA
            </div>

            {/* Heading & Subtitle */}
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight leading-tight">
              Masuk ke wadira
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1.5 mb-7">
              Masuk dengan mudah untuk melanjutkan.
            </p>

            {/* Error Banner jika ada error fatal */}
            {errorMessage && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Tombol Masuk dengan Google Otorisasi Langsung */}
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 active:scale-[0.99] text-neutral-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-2xs transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
                  <span>Menghubungkan Akun Google...</span>
                </>
              ) : (
                <>
                  <GoogleIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>Lanjutkan dengan Google</span>
                </>
              )}
            </button>

            {/* Subtext di bawah tombol */}
            <p className="text-[11px] sm:text-xs text-neutral-400 text-center mt-3 mb-3 leading-relaxed">
              Tanpa membuat kata sandi baru. Cukup pilih akun Google Anda.
            </p>

            {/* Horizontal Line Divider */}
            <div className="border-t border-neutral-100 my-4" />

            {/* Warung Storefront Vector Illustration */}
            <WarungIllustration />

            {/* Help subtext */}
            <p className="text-[11px] sm:text-xs text-neutral-400 text-center mt-3">
              Kendala masuk? Hubungi pengelola warung.
            </p>

            {/* Shortcut Pasang Aplikasi di HP */}
            <div className="mt-4">
              <InstallPwaButton variant="card" />
            </div>
          </div>
        </div>

        {/* Bottom Subtext */}
        <div className="text-center text-[11px] text-neutral-400 pb-1">
          Login aman melalui akun Google Anda.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f4f5ef]">
          <Loader2 className="w-8 h-8 animate-spin text-[#4a5829]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
