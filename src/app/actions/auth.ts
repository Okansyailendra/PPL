'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'crypto';
import type { UserSession } from '@/types';
import { signSessionToken, verifyPassword, hashPassword } from '@/lib/auth';
import { globalRateLimiter } from '@/lib/rate-limit';

export async function login(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()?.toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan kata sandi wajib diisi.' };
  }

  // 1. Proteksi Brute Force Login (Maksimal 6 percobaan salah per 5 menit)
  const rateLimitKey = `login-attempt:${email}`;
  const rateLimitCheck = globalRateLimiter.check(rateLimitKey, 6, 5 * 60 * 1000);
  if (!rateLimitCheck.allowed) {
    return {
      error: `Terlalu banyak percobaan masuk yang salah. Silakan coba lagi setelah ${rateLimitCheck.retryAfterSeconds} detik.`,
    };
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    return { error: 'Email atau password salah.' };
  }

  const isPasswordValid = await verifyPassword(password, user.password);
  if (!isPasswordValid) {
    return { error: 'Email atau password salah.' };
  }

  globalRateLimiter.reset(rateLimitKey);

  // Auto-upgrade password lama ke bcrypt jika masih plaintext
  if (!/^\$2[aby]\$\d{2}\$/.test(user.password)) {
    try {
      const newHash = await hashPassword(password);
      await supabase.from('users').update({ password: newHash }).eq('id', user.id);
    } catch (e) {
      console.warn('Gagal upgrade hash password:', e);
    }
  }

  const userData: UserSession = {
    id: user.id,
    email: user.email,
    store_name: user.store_name,
    owner_name: user.owner_name,
    phone_number: user.phone_number,
    role: user.role || 'penjual',
    avatar_url: user.avatar_url || '',
  };

  const FIVE_DAYS = 5 * 24 * 60 * 60;
  const token = signSessionToken(userData, 30 * 24 * 60 * 60);
  
  const cookieStore = await cookies();
  cookieStore.set('userSession', token, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: FIVE_DAYS 
  });

  if (userData.role === 'pelanggan') {
    redirect('/dashboard/pelanggan');
  } else {
    redirect('/dashboard/penjual');
  }
}

export async function register(_formData: FormData) {
  return {
    error: 'Pendaftaran akun baru melalui formulir telah ditutup. Silakan masuk menggunakan akun Google di halaman Login.',
  };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('userSession');
  redirect('/login');
}

import { sendPasswordResetEmail } from '@/lib/mail';

const RESET_SECRET = process.env.RESET_TOKEN_SECRET || 'wadira-secure-reset-token-secret-2026';

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()?.toLowerCase();

  if (!email) {
    return { error: 'Alamat email wajib diisi.' };
  }

  // Rate Limiting: 4 permintaan per 15 menit per email
  const rateLimitKey = `reset-request:${email}`;
  const rateCheck = globalRateLimiter.check(rateLimitKey, 4, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    return {
      error: `Terlalu banyak permintaan reset kata sandi. Silakan tunggu ${rateCheck.retryAfterSeconds} detik sebelum mencoba lagi.`,
    };
  }

  const { data: user, error: dbError } = await supabase
    .from('users')
    .select('id, email, password, store_name, owner_name')
    .eq('email', email)
    .single();

  // Cegah user enumeration: tetap beri respon sukses seragam jika email tidak ada
  if (dbError || !user) {
    return {
      success: true,
      message: 'Jika alamat email terdaftar, tautan verifikasi telah dikirimkan ke kotak masuk Anda.',
      email,
      previewUrl: null,
    };
  }

  // Nonce terikat dengan hash password saat ini agar token langsung hangus jika password berubah
  const expiresAt = Date.now() + 60 * 60 * 1000;
  const passwordNonce = (user.password || '').slice(-16);
  const data = `${user.email}:${passwordNonce}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', RESET_SECRET).update(data).digest('hex');
  const token = Buffer.from(`${data}:${hmac}`).toString('base64url');

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${appBaseUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

  const mailResult = await sendPasswordResetEmail({
    to: user.email,
    ownerName: user.owner_name,
    storeName: user.store_name,
    resetUrl,
  });

  return {
    success: true,
    message: 'Tautan verifikasi telah berhasil dikirimkan ke kotak masuk email Anda.',
    email: user.email,
    previewUrl: process.env.NODE_ENV === 'development' ? (mailResult?.previewUrl || null) : null,
  };
}

/**
 * Memvalidasi token verifikasi dari URL sebelum menampilkan/memproses form reset.
 * Memeriksa:
 * 1. Format token valid (4 bagian: email:nonce:expiresAt:hmac)
 * 2. Kesesuaian alamat email
 * 3. Batas waktu kedaluwarsa 1 jam
 * 4. Status Single-Use: Nonce masih sesuai dengan hash password saat ini
 * 5. Keaslian signature HMAC dengan perbandingan konstan (Timing-Safe Equal)
 */
export async function verifyResetToken(token: string, email: string): Promise<{ valid: boolean; error?: string }> {
  if (!token || !email) {
    return { valid: false, error: 'Link verifikasi tidak lengkap atau tidak valid.' };
  }

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 4) {
      return { valid: false, error: 'Format token verifikasi tidak valid atau kedaluwarsa.' };
    }

    const [tokenEmail, tokenNonce, expiresAtStr, hmac] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);

    if (tokenEmail.toLowerCase() !== email.toLowerCase()) {
      return { valid: false, error: 'Token ini tidak cocok dengan alamat email Anda.' };
    }

    if (Date.now() > expiresAt) {
      return { valid: false, error: 'Link verifikasi telah kedaluwarsa (lebih dari 1 jam). Silakan minta link baru.' };
    }

    // Ambil data user terkini dari database untuk memverifikasi password nonce
    const { data: user } = await supabase
      .from('users')
      .select('password')
      .eq('email', tokenEmail.toLowerCase())
      .single();

    if (!user?.password) {
      return { valid: false, error: 'Akun pengguna tidak ditemukan.' };
    }

    // Single-Use Verification: Jika password sudah pernah diubah, nonce tidak cocok lagi
    const currentNonce = (user.password || '').slice(-16);
    if (tokenNonce !== currentNonce) {
      return {
        valid: false,
        error: 'Tautan pemulihan ini sudah pernah digunakan atau kata sandi telah diperbarui. Silakan minta tautan baru.',
      };
    }

    const data = `${tokenEmail}:${currentNonce}:${expiresAt}`;
    const expectedHmac = crypto.createHmac('sha256', RESET_SECRET).update(data).digest('hex');

    // Constant-time comparison (Mencegah serangan Timing Attack)
    const hmacBuf = Buffer.from(hmac, 'hex');
    const expectedBuf = Buffer.from(expectedHmac, 'hex');

    if (hmacBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hmacBuf, expectedBuf)) {
      return { valid: false, error: 'Token verifikasi telah dimodifikasi atau tidak sah.' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Gagal memverifikasi token keamanan.' };
  }
}

/**
 * Memperbarui kata sandi baru pengguna setelah verifikasi token berhasil.
 */
export async function resetPasswordWithToken(formData: FormData) {
  const token = formData.get('token') as string;
  const email = (formData.get('email') as string)?.trim()?.toLowerCase();
  const newPassword = formData.get('new_password') as string;
  const confirmPassword = formData.get('confirm_password') as string;

  if (!token || !email) {
    return { error: 'Sesi verifikasi tidak valid. Silakan ajukan ulang link reset kata sandi.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { error: 'Kata sandi baru minimal harus 6 karakter.' };
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Konfirmasi kata sandi tidak cocok.' };
  }

  const check = await verifyResetToken(token, email);
  if (!check.valid) {
    return { error: check.error || 'Token tidak valid.' };
  }

  const hashedPassword = await hashPassword(newPassword);

  const { error: updateErr } = await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('email', email);

  if (updateErr) {
    return { error: 'Gagal memperbarui kata sandi: ' + updateErr.message };
  }

  return {
    success: true,
    message: 'Kata sandi berhasil diperbarui! Anda sekarang dapat masuk dengan kata sandi baru.',
  };
}

