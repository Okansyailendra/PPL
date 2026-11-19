import { NextResponse, type NextRequest } from 'next/server';

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.AUTH_SECRET ||
  'wadira-secure-session-secret-key-32chars-min-2026';

/**
 * Memvalidasi token sesi secara kriptografis menggunakan Web Crypto API.
 * Berjalan optimal di Next.js Edge/Node runtime tanpa dependensi modul native.
 */
async function getSessionPayload(token?: string): Promise<{ id: string; email: string; role?: string; exp: number } | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadStr, hmacHex] = parts;
  if (!payloadStr || !hmacHex || hmacHex.length !== 64) return null;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      sigBytes[i] = parseInt(hmacHex.slice(i * 2, i * 2 + 2), 16);
    }

    const isSignatureValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      enc.encode(payloadStr)
    );

    if (!isSignatureValid) return null;

    // Decode base64url payload
    const base64 = payloadStr.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    const payload = JSON.parse(jsonStr);

    if (!payload?.id || !payload?.exp) return null;
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rewrite jika Google me-redirect ke URI dengan titik di akhir sesuai konfigurasi Google Console
  if (pathname === '/api/auth/callback/google.') {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = '/api/auth/callback/google';
    return NextResponse.rewrite(rewriteUrl);
  }

  const userSession = request.cookies.get('userSession')?.value;
  const session = await getSessionPayload(userSession);
  const hasSession = Boolean(session);
  const isPelanggan = session?.role === 'pelanggan';

  // 1. Proteksi rute penjual: wajib login sebagai penjual/admin
  if (pathname.startsWith('/dashboard/penjual')) {
    if (!hasSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Jika pelanggan mencoba membuka dashboard admin penjual, arahkan ke dashboard pelanggan
    if (isPelanggan) {
      return NextResponse.redirect(new URL('/dashboard/pelanggan', request.url));
    }
  }

  // 2. Redirect pengguna yang sudah terotentikasi saat membuka /login atau /register
  if ((pathname === '/login' || pathname === '/register') && hasSession) {
    if (isPelanggan) {
      return NextResponse.redirect(new URL('/dashboard/pelanggan', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard/penjual', request.url));
  }

  return NextResponse.next();
}

// Backward compatibility alias jika dipanggil sebagai middleware
export { proxy as middleware };

export const config = {
  matcher: ['/login', '/register', '/dashboard/penjual/:path*', '/api/auth/callback/google.'],
};
