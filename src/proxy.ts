import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const userSession = request.cookies.get('userSession')?.value;
  const { pathname } = request.nextUrl;
  const hasValidSessionFormat = Boolean(userSession && userSession.includes('.'));

  // Protect /dashboard/penjual (harus memiliki token sesi bertanda tangan)
  if (pathname.startsWith('/dashboard/penjual') && !hasValidSessionFormat) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  if ((pathname === '/login' || pathname === '/register') && hasValidSessionFormat) {
    return NextResponse.redirect(new URL('/dashboard/penjual', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/register', '/dashboard/:path*'],
};
