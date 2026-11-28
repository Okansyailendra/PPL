import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import type { UserSession } from '@/types';

const WADIRA_STORE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.AUTH_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error('SESSION_SECRET / AUTH_SECRET belum dikonfigurasi dengan aman.');
  }
  return secret;
}

export function isSellerRole(role?: string | null): boolean {
  return role === 'penjual' || role === 'admin';
}

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
  const secret = getSessionSecret();
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
  const hmac = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
  return `${payloadStr}.${hmac}`;
}

/**
 * Memverifikasi keabsahan token sesi.
 * Menjamin token tidak dipalsukan dan belum kedaluwarsa.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  try {
    const secret = getSessionSecret();
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadStr, hmac] = parts;
    const expectedHmac = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

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

function mapAuthorizedUser(dbUser: UserSession): UserSession {
  if (isSellerRole(dbUser.role)) {
    return {
      ...dbUser,
      id: WADIRA_STORE_ID,
    };
  }
  return dbUser;
}

/**
 * Mendapatkan data user yang sedang aktif berdasarkan signed cookie userSession.
 * User wajib masih terdaftar di database (tidak melakukan auto-restore dari cookie).
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

    if (dbUser) {
      return mapAuthorizedUser(dbUser as UserSession);
    }

    if (payload.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id, email, store_name, owner_name, phone_number, role, avatar_url, google_id, address')
        .eq('email', payload.email)
        .single();

      if (userByEmail) {
        return mapAuthorizedUser(userByEmail as UserSession);
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Mengambil sesi user khusus Penjual / Admin untuk Server Actions.
 * Mengembalikan null jika belum login atau role adalah pelanggan.
 */
export async function getSellerUser(): Promise<UserSession | null> {
  const user = await getCurrentUser();
  if (!user || !isSellerRole(user.role)) {
    return null;
  }
  return user;
}

/**
 * Memverifikasi user dari cookie userSession atau header Authorization: Basic (khusus Penjual / Admin).
 */
async function resolveAnyAuthenticatedUser(req?: Request): Promise<UserSession | null> {
  const sessionUser = await getCurrentUser();
  if (sessionUser) return sessionUser;

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
            .select('id, email, password, store_name, owner_name, phone_number, role, avatar_url')
            .eq('email', email)
            .single();

          if (authUser && authUser.password) {
            const isMatch = await verifyPassword(password, authUser.password);
            if (isMatch) {
              const { password: _, ...cleanUser } = authUser;
              return mapAuthorizedUser(cleanUser as UserSession);
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

/**
 * Memverifikasi sesi kasir/UMKM yang sedang aktif (wajib role penjual/admin) melalui:
 * 1. Cookie `userSession` bertanda tangan (HMAC signed), atau
 * 2. Header `Authorization: Basic <base64(email:password)>` untuk klien API/Postman.
 */
export async function getAuthenticatedCashier(req?: Request): Promise<UserSession | null> {
  const user = await resolveAnyAuthenticatedUser(req);
  if (!user || !isSellerRole(user.role)) {
    return null;
  }
  return user;
}

/**
 * Helper otorisasi API khusus Penjual/Admin yang membedakan 401 (belum login) dan 403 (bukan penjual).
 */
export async function requireSellerApi(
  req?: Request
): Promise<{ user: UserSession; errorResponse?: never } | { user?: never; errorResponse: NextResponse }> {
  const user = await resolveAnyAuthenticatedUser(req);
  if (!user?.id) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: 'Unauthorized: Sesi telah berakhir atau Anda belum login.' },
        { status: 401 }
      ),
    };
  }
  if (!isSellerRole(user.role)) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: 'Forbidden: Akses khusus Penjual / Admin warung.' },
        { status: 403 }
      ),
    };
  }
  return { user };
}
