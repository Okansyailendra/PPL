'use client';

import React, { useState } from 'react';
import { register } from '@/app/actions/auth';
import { useActionState } from 'react';
import Link from 'next/link';
import { 
  Store, 
  ArrowRight, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Building2, 
  ShoppingBag,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function RegisterPage() {
  const [selectedRole, setSelectedRole] = useState<'pelanggan' | 'penjual'>('pelanggan');

  const [error, formAction, isPending] = useActionState(async (_prevState: string | null, formData: FormData) => {
    const res = await register(formData);
    return res?.error || null;
  }, null);

  return (
    <div className="min-h-screen bg-[#f4f5ef] flex flex-col font-sans antialiased text-neutral-900">
      {/* Header */}
      <header className="h-[72px] bg-[#465427] text-white px-6 flex items-center justify-between border-b border-white/10 shadow-xs">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-sans text-2xl font-black tracking-tight text-white group-hover:opacity-90 transition">
            wadira.
          </span>
          <div className="h-4 w-px bg-white/20 mx-1 hidden sm:block" />
          <span className="text-xs text-white/80 font-medium hidden sm:inline-block">
            Warung Madura Digital
          </span>
        </Link>
        <Link 
          href="/login" 
          className="text-xs font-bold text-[#d4f952] hover:underline transition-colors"
        >
          Sudah Punya Akun? Masuk
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 py-10">
        <div className="w-full max-w-[520px] bg-white p-7 sm:p-9 rounded-3xl shadow-sm border border-neutral-200">
          
          {/* Header Title */}
          <div className="text-center mb-6">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#465427] mb-1.5 block">
              PENDAFTARAN AKUN WADIRA
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              {selectedRole === 'pelanggan' ? 'Daftar Akun Pelanggan' : 'Daftar Warung Baru'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              {selectedRole === 'pelanggan'
                ? 'Belanja kebutuhan warung lebih mudah, pantau limit kasbon, dan simpan riwayat struk'
                : 'Mulai kelola inventaris, transaksi kasir, dan pembukuan warung Anda'}
            </p>
          </div>

          {/* Opsi Cepat: Daftar dengan Google */}
          <div className="mb-6">
            <a
              href="/api/auth/google"
              className="w-full py-3 px-4 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 active:scale-[0.99] text-neutral-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-2xs transition cursor-pointer"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24">
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
              <span>Daftar Cepat dengan Google</span>
            </a>
            <div className="flex items-center gap-3 my-4">
              <div className="h-px bg-neutral-200 flex-1" />
              <span className="text-[11px] text-neutral-400 font-semibold uppercase">atau isi formulir</span>
              <div className="h-px bg-neutral-200 flex-1" />
            </div>
          </div>

          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setSelectedRole('pelanggan')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                selectedRole === 'pelanggan'
                  ? 'bg-white text-[#465427] shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Pelanggan (Belanja)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('penjual')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                selectedRole === 'penjual'
                  ? 'bg-[#465427] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Pemilik Warung</span>
            </button>
          </div>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="role" value={selectedRole} />

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Nama Input */}
            <div className={selectedRole === 'penjual' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-1.5'}>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
                  {selectedRole === 'penjual' ? 'Nama Pemilik Warung *' : 'Nama Lengkap Anda *'}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input 
                    name="owner_name" 
                    type="text" 
                    required 
                    className="w-full h-11 pl-10 pr-3 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:bg-white focus:border-[#465427] focus:ring-1 focus:ring-[#465427] text-xs sm:text-sm transition placeholder:text-neutral-400"
                    placeholder={selectedRole === 'penjual' ? 'Pak Budi' : 'Siti Rahma'}
                  />
                </div>
              </div>

              {selectedRole === 'penjual' && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
                    Nama Warung *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input 
                      name="store_name" 
                      type="text" 
                      required={selectedRole === 'penjual'}
                      className="w-full h-11 pl-10 pr-3 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:bg-white focus:border-[#465427] focus:ring-1 focus:ring-[#465427] text-xs sm:text-sm transition placeholder:text-neutral-400"
                      placeholder="Warung Barokah"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Nomor WhatsApp */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
                Nomor WhatsApp (Opsional untuk info belanja & struk)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  name="phone_number" 
                  type="text" 
                  className="w-full h-11 pl-10 pr-3 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:bg-white focus:border-[#465427] focus:ring-1 focus:ring-[#465427] text-xs sm:text-sm transition placeholder:text-neutral-400"
                  placeholder="08123456789"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
                Alamat Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  name="email" 
                  type="email" 
                  required 
                  className="w-full h-11 pl-10 pr-3 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:bg-white focus:border-[#465427] focus:ring-1 focus:ring-[#465427] text-xs sm:text-sm transition placeholder:text-neutral-400"
                  placeholder="nama@gmail.com"
                />
              </div>
            </div>

            {/* Kata Sandi */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
                Kata Sandi *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  name="password" 
                  type="password" 
                  required 
                  className="w-full h-11 pl-10 pr-3 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:bg-white focus:border-[#465427] focus:ring-1 focus:ring-[#465427] text-xs sm:text-sm transition placeholder:text-neutral-400"
                  placeholder="Minimal 6 karakter"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isPending}
              className="w-full h-12 bg-[#465427] hover:bg-[#38441f] text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>{isPending ? 'Mendaftarkan Akun...' : selectedRole === 'pelanggan' ? 'Daftar sebagai Pelanggan' : 'Daftar sebagai Warung'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer Link ke Login */}
          <div className="mt-6 pt-5 border-t border-neutral-200 text-center">
            <p className="text-xs text-neutral-500">
              Sudah memiliki akun?{' '}
              <Link href="/login" className="text-[#465427] font-bold hover:underline transition">
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
