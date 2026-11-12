'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { resetPasswordWithToken } from '@/app/actions/auth';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Home,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Jika token atau email kosong
  if (!token || !email) {
    return (
      <div className="space-y-5">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            Tautan Tidak Lengkap
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
            Tautan pemulihan kata sandi tidak valid atau parameter keamanan tidak lengkap. Silakan ajukan ulang link verifikasi.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center w-full h-11 bg-[#54652d] hover:bg-[#435222] text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition"
        >
          Ajukan Ulang Link Verifikasi
        </Link>
      </div>
    );
  }

  // Jika sudah berhasil reset password
  if (isSuccess) {
    return (
      <div className="space-y-5 animate-fadeIn">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            Kata Sandi Diperbarui!
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
            Kata sandi untuk akun <span className="font-bold text-neutral-800">{email}</span> berhasil diperbarui. Silakan masuk menggunakan kata sandi baru Anda.
          </p>
        </div>

        <Link
          href="/login"
          className="w-full h-11 bg-[#54652d] hover:bg-[#435222] text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2"
        >
          <span>Masuk ke Akun Sekarang</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('email', email);
      formData.append('new_password', newPassword);
      formData.append('confirm_password', confirmPassword);

      const result = await resetPasswordWithToken(formData);

      if (result.error) {
        setErrorMessage(result.error);
      } else if (result.success) {
        setIsSuccess(true);
      }
    } catch {
      setErrorMessage('Terjadi kesalahan jaringan. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="w-11 h-11 bg-[#eef5db] text-[#465427] rounded-xl flex items-center justify-center mb-3">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
          Kata Sandi Baru
        </h2>
        <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
          Atur kata sandi baru untuk akun <span className="font-semibold text-neutral-800">{email}</span>.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium leading-relaxed">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div>
          <label className="block text-xs font-bold text-neutral-800 mb-1.5">
            Kata sandi baru
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full h-11 pl-10 pr-10 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:border-[#54652d] focus:ring-2 focus:ring-[#54652d]/20 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-bold text-neutral-800 mb-1.5">
            Konfirmasi kata sandi baru
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang kata sandi baru"
              className="w-full h-11 pl-10 pr-10 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:border-[#54652d] focus:ring-2 focus:ring-[#54652d]/20 transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-[11px] text-red-600 mt-1">Kata sandi tidak cocok.</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 bg-[#54652d] hover:bg-[#435222] disabled:opacity-70 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer flex items-center justify-center gap-2 mt-2"
        >
          <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}</span>
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#faf8ff] text-neutral-900 font-sans antialiased">
      {/* ========================================================= */}
      {/* LEFT PANEL: Deep Olive Branding & Highlights */}
      {/* ========================================================= */}
      <div className="w-full lg:w-[42%] lg:min-w-[420px] lg:max-w-[480px] bg-[#54652d] text-white flex flex-col justify-between shrink-0 shadow-lg relative z-10">
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

          {/* Editorial Headline */}
          <div className="my-10 lg:my-14 space-y-4">
            <div className="text-[11px] font-bold text-white/60 tracking-wider uppercase">
              PEMBAHARUAN KATA SANDI
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight leading-[1.12]">
              <span className="text-white block">Sandi baru.</span>
              <span className="text-[#d5ed70] block">Akses kembali</span>
              <span className="text-[#d5ed70] block">lancar.</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-sm pt-2">
              Pastikan Anda menggunakan kata sandi yang kuat dan mudah Anda ingat untuk mengelola transaksi warung.
            </p>
          </div>

          {/* Security Features */}
          <div className="space-y-4 pt-4">
            <div className="border-t border-white/15 pt-4 flex items-start gap-3.5">
              <KeyRound className="w-5 h-5 text-white/85 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Enkripsi langsung
                </h3>
                <p className="text-[11px] text-white/70 mt-0.5 leading-snug">
                  Kata sandi baru segera disinkronkan ke database dengan perlindungan penuh.
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
            title="Kembali ke beranda"
            className="p-1.5 rounded-lg hover:bg-black/10 transition text-[#1c240d]"
          >
            <Home className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT PANEL: Reset Password Form */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-white relative">
        <div className="flex items-center justify-end">
          <div className="inline-flex items-center gap-1.5 text-neutral-600 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-neutral-500" />
            <span>Zona keamanan</span>
          </div>
        </div>

        <div className="w-full max-w-[420px] mx-auto my-auto py-8">
          <Suspense fallback={<div className="text-xs text-neutral-500">Memuat verifikasi...</div>}>
            <ResetPasswordForm />
          </Suspense>

          {/* Callout Info */}
          <div className="bg-[#e5eccc] border border-[#d2dcb6] rounded-xl p-3.5 sm:p-4 flex items-start gap-3 mt-6">
            <ShieldCheck className="w-4 h-4 text-[#54652d] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs text-[#2b3517] leading-snug">
                Tips Kata Sandi Aman
              </h4>
              <p className="text-[11px] text-[#425023] mt-0.5 leading-relaxed">
                Gunakan kombinasi minimal 6 karakter. Hindari tanggal lahir atau urutan angka sederhana agar akun kasir Anda tetap terlindungi.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center pt-4">
          <p className="text-[11px] text-neutral-400">
            Jaga kerahasiaan akun. Jangan berikan kata sandi kepada orang lain.
          </p>
        </div>
      </div>
    </div>
  );
}
