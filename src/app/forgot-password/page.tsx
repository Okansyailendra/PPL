'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '@/app/actions/auth';
import {
  Mail,
  ShieldCheck,
  Home,
  ArrowLeft,
  KeyRound,
  ExternalLink,
  RotateCcw,
  Inbox,
  AlertCircle,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('email', email);

      const result = await requestPasswordReset(formData);

      if (result.error) {
        setErrorMessage(result.error);
      } else if (result.success) {
        setSentEmail(result.email || email);
        setPreviewUrl(result.previewUrl || null);
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan. Pastikan koneksi internet Anda aktif.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    setSentEmail(null);
    setPreviewUrl(null);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#faf8ff] text-neutral-900 font-sans antialiased">
      {/* ========================================================= */}
      {/* LEFT PANEL: Deep Olive Branding & Security Value */}
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
              PEMULIHAN AKSES AKUN
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight leading-[1.12]">
              <span className="text-white block">Lupa kata sandi?</span>
              <span className="text-[#d5ed70] block">Akses warung tetap aman.</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-sm pt-2">
              Tautan pemulihan dikirimkan secara langsung dan rahasia ke kotak masuk email Anda demi menjaga keamanan akun warung.
            </p>
          </div>

          {/* Feature Security List */}
          <div className="space-y-4 pt-4">
            <div className="border-t border-white/15 pt-4 flex items-start gap-3.5">
              <KeyRound className="w-5 h-5 text-white/85 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Tautan sekali pakai
                </h3>
                <p className="text-[11px] text-white/70 mt-0.5 leading-snug">
                  Hanya bisa diakses melalui link rahasia di email Anda dengan masa aktif 60 menit.
                </p>
              </div>
            </div>

            <div className="border-t border-white/15 pt-4 flex items-start gap-3.5">
              <ShieldCheck className="w-5 h-5 text-white/85 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Verifikasi kepemilikan email
                </h3>
                <p className="text-[11px] text-white/70 mt-0.5 leading-snug">
                  Mencegah orang lain mengubah sandi tanpa hak akses ke email resmi pemilik warung.
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
      {/* RIGHT PANEL: Form or "Check Your Email" State */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-white relative">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 text-xs font-bold transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke login</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 text-neutral-600 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-neutral-500" />
            <span>Verifikasi aman</span>
          </div>
        </div>

        {/* Center Container */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-8">
          {!sentEmail ? (
            <>
              <div className="mb-6">
                <div className="w-11 h-11 bg-[#eef5db] text-[#465427] rounded-xl flex items-center justify-center mb-3">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
                  Lupa Sandi
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                  Masukkan email akun pengelola warung Anda. Kami akan mengirimkan tautan verifikasi ke kotak masuk email tersebut.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium leading-relaxed">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                    Alamat email terdaftar
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contoh: okanwahyudi540@gmail.com"
                      className="w-full h-11 pl-10 pr-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:border-[#54652d] focus:ring-2 focus:ring-[#54652d]/20 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-[#54652d] hover:bg-[#435222] disabled:opacity-70 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <span>{isSubmitting ? 'Mengirimkan email...' : 'Kirim Tautan ke Email'}</span>
                </button>
              </form>
            </>
          ) : (
            /* ========================================================= */
            /* SUCCESS STATE: "CHECK YOUR EMAIL" - LINK IS IN USER'S INBOX */
            /* ========================================================= */
            <div className="space-y-5 animate-fadeIn">
              <div className="w-14 h-14 bg-[#eef5db] text-[#465427] rounded-2xl flex items-center justify-center shadow-2xs">
                <Inbox className="w-7 h-7" />
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                  Periksa Email Anda
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                  Kami telah mengirimkan instruksi dan tautan pemulihan kata sandi ke:
                </p>
                <div className="mt-3 p-3 bg-neutral-100 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-800 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#54652d]" />
                  <span>{sentEmail}</span>
                </div>
              </div>

              <div className="p-4 bg-[#fbfcfa] border border-neutral-200 rounded-xl space-y-2.5 text-xs text-neutral-700 leading-relaxed">
                <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#54652d]" />
                  <span>Langkah berikutnya:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-neutral-600 pl-1">
                  <li>Buka aplikasi atau web penyedia email Anda.</li>
                  <li>Cari email masuk dari <strong>Wadira Warung Digital</strong>.</li>
                  <li>Klik tombol <strong>"Atur Ulang Kata Sandi Baru"</strong> di dalam email tersebut.</li>
                </ol>
              </div>

              {/* Direct Link to Gmail */}
              <div className="space-y-2 pt-1">
                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 bg-[#54652d] hover:bg-[#435222] text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2"
                >
                  <span>Buka Gmail</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                {/* If test mailbox generated (Ethereal test preview for local dev) */}
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-10 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2"
                  >
                    <span>Buka Kotak Masuk Uji Coba (Test Mailbox)</span>
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                  </a>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-100">
                <span>Belum menerima email?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  className="font-bold text-[#54652d] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Kirim ulang</span>
                </button>
              </div>
            </div>
          )}

          {/* Callout Notice */}
          <div className="bg-[#e5eccc] border border-[#d2dcb6] rounded-xl p-3.5 sm:p-4 flex items-start gap-3 mt-6">
            <AlertCircle className="w-4 h-4 text-[#54652d] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs text-[#2b3517] leading-snug">
                Penting
              </h4>
              <p className="text-[11px] text-[#425023] mt-0.5 leading-relaxed">
                Tautan di dalam email hanya berlaku selama <strong>60 menit</strong>. Jika Anda tidak menemukan email di Kotak Masuk, silakan periksa folder <em>Spam</em> atau <em>Promosi</em>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-[11px] text-neutral-400">
            Jaga kerahasiaan akun. Jangan berikan tautan verifikasi kepada siapa pun.
          </p>
        </div>
      </div>
    </div>
  );
}
