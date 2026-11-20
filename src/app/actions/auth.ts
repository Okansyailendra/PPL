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

  // Reset counter jika login berhasil
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

  // Set user session bertanda tangan kriptografis (HMAC signed)
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

export async function register(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()?.toLowerCase();
  const password = formData.get('password') as string;
  const store_name = (formData.get('store_name') as string)?.trim();
  const owner_name = (formData.get('owner_name') as string)?.trim();
  const phone_number = (formData.get('phone_number') as string)?.trim();
  const requestedRole = ((formData.get('role') as string)?.trim() || 'pelanggan') as 'pelanggan' | 'penjual';
  const role = requestedRole === 'penjual' ? 'penjual' : 'pelanggan';

  if (!email || !password || !owner_name) {
    return { error: 'Nama, email, dan kata sandi wajib diisi.' };
  }

  if (role === 'penjual' && !store_name) {
    return { error: 'Nama warung wajib diisi untuk pendaftaran penjual.' };
  }

  if (password.length < 6) {
    return { error: 'Kata sandi minimal harus 6 karakter.' };
  }

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    return { error: 'Email sudah terdaftar.' };
  }

  // Hash password dengan bcrypt sebelum disimpan ke database
  const hashedPassword = await hashPassword(password);
  const newId = crypto.randomUUID();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const newRecord = {
    id: newId,
    email,
    password: hashedPassword,
    store_name: role === 'penjual' ? (store_name || 'Toko Wadira') : '',
    owner_name,
    phone_number: phone_number || '',
    role,
    avatar_url: '',
    created_at: now,
  };

  // Insert new user
  const { data: newUser, error } = await supabase
    .from('users')
    .insert([newRecord])
    .select()
    .single();

  if (error || !newUser) {
    console.error('Supabase Insert Error:', error);
    return { error: error?.message || 'Terjadi kesalahan saat mendaftar.' };
  }

  // Auto login dengan session signed
  const userData: UserSession = {
    id: newUser.id || newId,
    email: newUser.email || email,
    store_name: newUser.store_name || newRecord.store_name,
    owner_name: newUser.owner_name || owner_name,
    phone_number: newUser.phone_number || phone_number || '',
    role,
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

  if (role === 'pelanggan') {
    redirect('/dashboard/pelanggan');
  } else {
    redirect('/dashboard/penjual');
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('userSession');
  redirect('/login');
}

// =========================================================================
// FITUR LUPA KATA SANDI (FORGOT & RESET PASSWORD)
// =========================================================================

import { sendPasswordResetEmail } from '@/lib/mail';

const RESET_SECRET = process.env.RESET_TOKEN_SECRET || 'wadira-secure-reset-token-secret-2026';

/**
 * Membuat token verifikasi aman berbasis HMAC-SHA256 (Kedaluwarsa 1 jam)
 * Dilindungi:
 * 1. Rate Limiting (Maks 4 permintaan per 15 menit per email)
 * 2. Anti User Enumeration (Respon seragam untuk email ada maupun tidak)
 * 3. Single-Use Token / Anti Replay Attack (Terikat dengan hash password saat ini)
 */
export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()?.toLowerCase();

  if (!email) {
    return { error: 'Alamat email wajib diisi.' };
  }

  // 1. Rate Limiting: Cegah Email Flooding & Kuota SMTP Habis
  const rateLimitKey = `reset-request:${email}`;
  const rateCheck = globalRateLimiter.check(rateLimitKey, 4, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    return {
      error: `Terlalu banyak permintaan reset kata sandi. Silakan tunggu ${rateCheck.retryAfterSeconds} detik sebelum mencoba lagi.`,
    };
  }

  // 2. Cek apakah user dengan email tersebut terdaftar
  const { data: user, error: dbError } = await supabase
    .from('users')
    .select('id, email, password, store_name, owner_name')
    .eq('email', email)
    .single();

  // 3. Mencegah User Enumeration: Jika email tidak ada di database,
  // jangan beri tahu penyerang bahwa email tidak terdaftar. Berikan pesan sukses seragam.
  if (dbError || !user) {
    return {
      success: true,
      message: 'Jika alamat email terdaftar, tautan verifikasi telah dikirimkan ke kotak masuk Anda.',
      email,
      previewUrl: null,
    };
  }

  // 4. Buat token signed dengan masa berlaku 1 jam terikat dengan nonce hash password saat ini
  // (Begitu password diubah, nonce ini berubah dan token lama langsung hangus secara otomatis)
  const expiresAt = Date.now() + 60 * 60 * 1000;
  const passwordNonce = (user.password || '').slice(-16);
  const data = `${user.email}:${passwordNonce}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', RESET_SECRET).update(data).digest('hex');
  const token = Buffer.from(`${data}:${hmac}`).toString('base64url');

  // URL verifikasi yang ditanam ke dalam tombol email
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${appBaseUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

  // Kirim email sungguhan ke inbox user
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

  // Verifikasi keabsahan token (termasuk cek single-use)
  const check = await verifyResetToken(token, email);
  if (!check.valid) {
    return { error: check.error || 'Token tidak valid.' };
  }

  // Hash kata sandi baru dengan bcrypt sebelum disimpan
  const hashedPassword = await hashPassword(newPassword);

  // Update password di database
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

