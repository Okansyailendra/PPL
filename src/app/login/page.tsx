'use client';

import React, { useState, useActionState } from 'react';
import Link from 'next/link';
import { login } from '@/app/actions/auth';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShoppingCart,
  Package,
  ShieldCheck,
  Home,
} from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  const [error, formAction, isPending] = useActionState(
    async (_prevState: string | null, formData: FormData) => {
      const res = await login(formData);
      return res?.error || null;
    },
    null
  );

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#faf8ff] text-neutral-900 font-sans antialiased">
      {/* ========================================================= */}
      {/* LEFT PANEL: Deep Olive Branding & Highlights */}
      {/* ========================================================= */}
      <div className="w-full lg:w-[42%] lg:min-w-[420px] lg:max-w-[480px] bg-[#54652d] text-white flex flex-col justify-between shrink-0 shadow-lg relative z-10">
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
          <div className="my-10 lg:my-14 space-y-4">
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
      {/* RIGHT PANEL: Clean Login Form */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-white relative">
        {/* Top Bar inside Right Panel: Security Badge */}
        <div className="flex items-center justify-end">
          <div className="inline-flex items-center gap-1.5 text-neutral-600 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-neutral-500" />
            <span>Portal internal</span>
          </div>
        </div>

        {/* Center Form Container */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-8">
          <div className="mb-6">
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
              Masuk Admin
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
              Selamat datang kembali. Masuk untuk mengelola kasir, stok, transaksi, dan laporan warung Anda.
            </p>
          </div>

          {/* Form */}
          <form action={formAction} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium leading-relaxed">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                Alamat email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="nama@contoh.com"
                  className="w-full h-11 pl-10 pr-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:border-[#54652d] focus:ring-2 focus:ring-[#54652d]/20 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-neutral-800">
                  Kata sandi
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-bold text-[#54652d] hover:text-[#3d4a20] hover:underline transition"
                >
                  Lupa kata sandi?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-10 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:border-[#54652d] focus:ring-2 focus:ring-[#54652d]/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-[#54652d] hover:bg-[#435222] disabled:opacity-70 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>{isPending ? 'Memproses...' : 'Masuk ke dashboard admin'}</span>
            </button>

            {/* Callout Info Box */}
            <div className="bg-[#e5eccc] border border-[#d2dcb6] rounded-xl p-3.5 sm:p-4 flex items-start gap-3 mt-4">
              <Lock className="w-4 h-4 text-[#54652d] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-[#2b3517] leading-snug">
                  Khusus admin &amp; pengelola warung
                </h4>
                <p className="text-[11px] text-[#425023] mt-0.5 leading-relaxed">
                  Hanya untuk pemilik, admin, dan kasir yang diberi akses. Portal ini bukan untuk pelanggan.
                </p>
              </div>
            </div>

            {/* Help text */}
            <div className="text-center pt-2">
              <p className="text-[11px] text-neutral-500">
                Kendala masuk? Hubungi pengelola warung untuk bantuan akses akun.
              </p>
            </div>
          </form>
        </div>

        {/* Footnote Security Disclaimer */}
        <div className="text-center pt-4">
          <p className="text-[11px] text-neutral-400">
            Jaga kerahasiaan akun. Jangan bagikan kata sandi Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
