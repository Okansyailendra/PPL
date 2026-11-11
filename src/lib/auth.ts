import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import type { UserSession } from '@/types';

/**
 * Memverifikasi sesi kasir/UMKM yang sedang aktif melalui:
 * 1. Cookie `userSession` (diverifikasi ke tabel `users`), atau
 * 2. Header `Authorization: Basic <base64(email:password)>` untuk klien API/Postman.
 */
export async function getAuthenticatedCashier(req?: Request): Promise<UserSession | null> {
  // 1. Cek cookie userSession
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('userSession')?.value;

    if (sessionCookie) {
      const parsed: UserSession = JSON.parse(sessionCookie);
      if (parsed?.id) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, email, store_name, owner_name, phone_number')
          .eq('id', parsed.id)
          .single();

        if (dbUser) {
          return dbUser as UserSession;
        }
      }

      if (parsed?.email) {
        const { data: emailUser } = await supabase
          .from('users')
          .select('id, email, store_name, owner_name, phone_number')
          .eq('email', parsed.email)
          .single();

        if (emailUser) {
          return emailUser as UserSession;
        }
      }
    }
  } catch {
    // Abaikan error parsing cookie dan lanjut cek header Authorization
  }

  // 2. Cek Authorization: Basic base64(email:password) jika dipanggil via REST API client
  if (req) {
    const authHeader = req.headers.get('authorization') || '';
    if (authHeader.startsWith('Basic ')) {
      try {
        const encoded = authHeader.slice(6).trim();
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const colonIdx = decoded.indexOf(':');
        if (colonIdx > 0) {
          const email = decoded.slice(0, colonIdx);
          const password = decoded.slice(colonIdx + 1);

          const { data: authUser } = await supabase
            .from('users')
            .select('id, email, store_name, owner_name, phone_number')
            .eq('email', email)
            .eq('password', password)
            .single();

          if (authUser) {
            return authUser as UserSession;
          }
        }
      } catch {
        return null;
      }
    }
  }

  return null;
}

