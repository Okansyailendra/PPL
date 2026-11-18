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
  exp: number;
}

/**
 * Membuat token sesi aman yang ditandatangani dengan HMAC-SHA256.
 * Format token: base64url(payload).hex(hmac)
 */
export function signSessionToken(userData: UserSession, maxAgeSeconds: number = 24 * 60 * 60): string {
  const exp = Date.now() + maxAgeSeconds * 1000;
  const payload: SessionPayload = {
    id: userData.id,
    email: userData.email,
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
      .select('id, email, store_name, owner_name, phone_number')
      .eq('id', payload.id)
      .single();

    if (dbUser) {
      return dbUser as UserSession;
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
