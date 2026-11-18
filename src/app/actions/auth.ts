'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserSession } from '@/types';
import { signSessionToken, verifyPassword, hashPassword } from '@/lib/auth';

export async function login(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()?.toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan kata sandi wajib diisi.' };
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
  };

  const token = signSessionToken(userData, 24 * 60 * 60);
  
  const cookieStore = await cookies();
  cookieStore.set('userSession', token, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 
  });

  redirect('/dashboard/penjual');
}

export async function register(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()?.toLowerCase();
  const password = formData.get('password') as string;
  const store_name = (formData.get('store_name') as string)?.trim();
  const owner_name = (formData.get('owner_name') as string)?.trim();
  const phone_number = (formData.get('phone_number') as string)?.trim();

  if (!email || !password || !store_name || !owner_name) {
    return { error: 'Semua kolom bertanda bintang wajib diisi.' };
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

  // Insert new user
  const { data: newUser, error } = await supabase
    .from('users')
    .insert([
      { email, password: hashedPassword, store_name, owner_name, phone_number }
    ])
    .select()
    .single();

  if (error || !newUser) {
    console.error('Supabase Insert Error:', error);
    return { error: error?.message || 'Terjadi kesalahan saat mendaftar.' };
  }

  // Auto login dengan session signed
  const userData: UserSession = {
    id: newUser.id,
    email: newUser.email,
    store_name: newUser.store_name,
    owner_name: newUser.owner_name,
    phone_number: newUser.phone_number,
  };

  const token = signSessionToken(userData, 24 * 60 * 60);
  
  const cookieStore = await cookies();
  cookieStore.set('userSession', token, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 
  });

  redirect('/dashboard/penjual');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('userSession');
  redirect('/login');
}

// =========================================================================
// FITUR LUPA KATA SANDI (FORGOT & RESET PASSWORD)
// =========================================================================

import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/mail';

const RESET_SECRET = process.env.RESET_TOKEN_SECRET || 'wadira-secure-reset-token-secret-2026';

/**
 * Membuat token verifikasi aman berbasis HMAC-SHA256 (Kedaluwarsa 1 jam)
 * dan mengirimkannya LANGSUNG ke email pengguna via SMTP / Mailer.
 * TIDAK mengembalikan tautan langsung ke browser demi keamanan.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()?.toLowerCase();

  if (!email) {
    return { error: 'Alamat email wajib diisi.' };
  }

  // Cek apakah user dengan email tersebut terdaftar
  const { data: user, error: dbError } = await supabase
    .from('users')
    .select('id, email, store_name, owner_name')
    .eq('email', email)
    .single();

  if (dbError || !user) {
    return { error: 'Email tidak ditemukan. Pastikan email sudah terdaftar sebagai pengelola/admin.' };
  }

  // Buat token signed dengan masa berlaku 1 jam
  const expiresAt = Date.now() + 60 * 60 * 1000;
  const data = `${user.email}:${expiresAt}`;
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
 */
export async function verifyResetToken(token: string, email: string): Promise<{ valid: boolean; error?: string }> {
  if (!token || !email) {
    return { valid: false, error: 'Link verifikasi tidak lengkap atau tidak valid.' };
  }

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) {
      return { valid: false, error: 'Format token verifikasi tidak valid.' };
    }

    const [tokenEmail, expiresAtStr, hmac] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);

    if (tokenEmail.toLowerCase() !== email.toLowerCase()) {
      return { valid: false, error: 'Token ini tidak cocok dengan alamat email Anda.' };
    }

    if (Date.now() > expiresAt) {
      return { valid: false, error: 'Link verifikasi telah kedaluwarsa (lebih dari 1 jam). Silakan minta link baru.' };
    }

    const data = `${tokenEmail}:${expiresAt}`;
    const expectedHmac = crypto.createHmac('sha256', RESET_SECRET).update(data).digest('hex');

    if (hmac !== expectedHmac) {
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

  // Verifikasi keabsahan token
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

