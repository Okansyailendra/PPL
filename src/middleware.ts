import { NextResponse, type NextRequest } from 'next/server';

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.AUTH_SECRET ||
  'wadira-secure-session-secret-key-32chars-min-2026';

/**
 * Memvalidasi token sesi secara kriptografis menggunakan Web Crypto API.
 * Berjalan optimal di Next.js Edge/Node runtime tanpa dependensi modul native.
 */
async function isValidSession(token?: string): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadStr, hmacHex] = parts;
  if (!payloadStr || !hmacHex || hmacHex.length !== 64) return false;

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

    if (!isSignatureValid) return false;

    // Decode base64url payload
    const base64 = payloadStr.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    const payload = JSON.parse(jsonStr);

    if (!payload?.id || !payload?.exp) return false;
    if (Date.now() > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const userSession = request.cookies.get('userSession')?.value;
  const { pathname } = request.nextUrl;

  const hasSession = await isValidSession(userSession);

  // 1. Proteksi rute penjual: wajib login dengan sesi HMAC valid
  if (pathname.startsWith('/dashboard/penjual')) {
    if (!hasSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Redirect pengguna yang sudah terotentikasi saat membuka /login atau /register
  if ((pathname === '/login' || pathname === '/register') && hasSession) {
    return NextResponse.redirect(new URL('/dashboard/penjual', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/register', '/dashboard/penjual/:path*'],
};
