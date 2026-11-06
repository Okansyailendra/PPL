import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const userSession = request.cookies.get('userSession')?.value;
  const { pathname } = request.nextUrl;

  // Protect /dashboard/penjual
  if (pathname.startsWith('/dashboard/penjual') && !userSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  if ((pathname === '/login' || pathname === '/register') && userSession) {
    return NextResponse.redirect(new URL('/dashboard/penjual', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/register', '/dashboard/:path*'],
};
