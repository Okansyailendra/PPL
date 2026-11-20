import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import type { UserSession } from '@/types';

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.AUTH_SECRET ||
  'wadira-secure-session-secret-key-32chars-min-2026';

export interface SessionPayload {
  id: string;
  email: string;
  role?: 'penjual' | 'pelanggan' | 'admin';
  name?: string;
  owner_name?: string;
  store_name?: string;
  phone_number?: string;
  avatar_url?: string;
  exp: number;
}

/**
 * Membuat token sesi aman yang ditandatangani dengan HMAC-SHA256.
 * Format token: base64url(payload).hex(hmac)
 */
export function signSessionToken(userData: UserSession, maxAgeSeconds: number = 30 * 24 * 60 * 60): string {
  const exp = Date.now() + maxAgeSeconds * 1000;
  const payload: SessionPayload = {
    id: userData.id,
    email: userData.email,
    role: userData.role || 'pelanggan',
    name: userData.owner_name,
    owner_name: userData.owner_name,
    store_name: userData.store_name,
    phone_number: userData.phone_number,
    avatar_url: userData.avatar_url,
    exp,
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex');
  return `${payloadStr}.${hmac}`;
}

/**
 * Memverifikasi keabsahan token sesi.
 * Menjamin token tidak dipalsukan dan belum kedaluwarsa.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadStr, hmac] = parts;
    const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex');

    const hmacBuf = Buffer.from(hmac, 'hex');
    const expectedBuf = Buffer.from(expectedHmac, 'hex');
    if (hmacBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hmacBuf, expectedBuf)) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (!payload?.id || !payload?.exp) return null;

    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Meng-hash password menggunakan bcrypt
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 12);
}

/**
 * Memverifikasi password plain terhadap hash bcrypt atau legacy plain text
 */
export async function verifyPassword(plainPassword: string, storedHashOrPlain: string): Promise<boolean> {
  if (!plainPassword || !storedHashOrPlain) return false;

  // Cek apakah stored password adalah bcrypt hash (diawali $2a$, $2b$, atau $2y$)
  if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(storedHashOrPlain)) {
    return bcrypt.compare(plainPassword, storedHashOrPlain);
  }

  // Fallback untuk akun lama (plaintext) sebelum auto-migration
  return plainPassword === storedHashOrPlain;
}

/**
 * Mendapatkan data user yang sedang aktif berdasarkan signed cookie userSession
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('userSession')?.value;
    if (!sessionCookie) return null;

    const payload = verifySessionToken(sessionCookie);
    if (!payload?.id) return null;

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, email, store_name, owner_name, phone_number, role, avatar_url, google_id, address')
      .eq('id', payload.id)
      .single();

    const WADIRA_STORE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    if (dbUser) {
      const userObj = dbUser as UserSession;
      // Jika role penjual/admin, pastikan mengakses inventory Toko Wadira yang sama
      if (userObj.role === 'penjual' || userObj.role === 'admin') {
        return {
          ...userObj,
          id: WADIRA_STORE_ID,
        };
      }
      return userObj;
    }

    // Jika id tidak ditemukan di database, cek apakah user ada berdasarkan email
    if (payload.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id, email, store_name, owner_name, phone_number, role, avatar_url, google_id, address')
        .eq('email', payload.email)
        .single();

      if (userByEmail) {
        const userObj = userByEmail as UserSession;
        if (userObj.role === 'penjual' || userObj.role === 'admin') {
          return {
            ...userObj,
            id: WADIRA_STORE_ID,
          };
        }
        return userObj;
      }

      // Auto-restore ke tabel users jika session token valid namun tabel database di-reset / drop
      const effectiveRole = payload.role || 'pelanggan';
      const userToRestore: UserSession = {
        id: payload.id,
        email: payload.email,
        owner_name: payload.owner_name || payload.name || payload.email.split('@')[0],
        store_name: payload.store_name || (effectiveRole === 'penjual' ? 'Toko Wadira (Warung Madura)' : ''),
        phone_number: payload.phone_number || '',
        role: effectiveRole,
        avatar_url: payload.avatar_url || '',
      };

      try {
        await supabase.from('users').insert([
          {
            id: userToRestore.id,
            email: userToRestore.email,
            password: null,
            store_name: userToRestore.store_name,
            owner_name: userToRestore.owner_name,
            phone_number: userToRestore.phone_number,
            role: userToRestore.role,
            avatar_url: userToRestore.avatar_url,
            created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          },
        ]);
        console.log(`[Session Auth] Auto-restored user ${userToRestore.email} (${userToRestore.role}) ke database users.`);
      } catch (insertErr) {
        console.error('Gagal auto-restore user session ke database:', insertErr);
      }

      if (effectiveRole === 'penjual' || effectiveRole === 'admin') {
        return {
          ...userToRestore,
          id: WADIRA_STORE_ID,
        };
      }
      return userToRestore;
    }

    // Fallback dari session payload jika query sedang lambat
    if (payload.id && payload.email) {
      const isSeller = payload.role === 'penjual' || payload.role === 'admin';
      return {
        id: isSeller ? WADIRA_STORE_ID : payload.id,
        email: payload.email,
        owner_name: payload.name || payload.email.split('@')[0],
        role: payload.role || 'pelanggan',
      } as UserSession;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Memverifikasi sesi kasir/UMKM yang sedang aktif melalui:
 * 1. Cookie `userSession` bertanda tangan (HMAC signed), atau
 * 2. Header `Authorization: Basic <base64(email:password)>` untuk klien API/Postman.
 */
export async function getAuthenticatedCashier(req?: Request): Promise<UserSession | null> {
  // 1. Cek cookie userSession
  const sessionUser = await getCurrentUser();
  if (sessionUser) return sessionUser;

  // 2. Cek Authorization: Basic base64(email:password) jika dipanggil via REST API client
  if (req) {
    const authHeader = req.headers.get('authorization') || '';
    if (authHeader.startsWith('Basic ')) {
      try {
        const encoded = authHeader.slice(6).trim();
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const colonIdx = decoded.indexOf(':');
        if (colonIdx > 0) {
          const email = decoded.slice(0, colonIdx).trim().toLowerCase();
          const password = decoded.slice(colonIdx + 1);

          const { data: authUser } = await supabase
            .from('users')
            .select('id, email, password, store_name, owner_name, phone_number')
            .eq('email', email)
            .single();

          if (authUser) {
            const isMatch = await verifyPassword(password, authUser.password);
            if (isMatch) {
              const { password: _, ...cleanUser } = authUser;
              return cleanUser as UserSession;
            }
          }
        }
      } catch {
        return null;
      }
    }
  }

  return null;
}
