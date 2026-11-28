/**
 * Helper resolusi URL aplikasi & OAuth redirect URI yang aman untuk local dev
 * maupun cloud hosting (Vercel / reverse proxy HTTPS).
 */

function isLocalUrl(urlStr: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(urlStr.trim());
}

export function getRequestOrigin(req: Request): string {
  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || req.headers.get('host')?.split(',')[0]?.trim();
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();

  if (host) {
    const proto = forwardedProto || (isLocalUrl(`http://${host}`) ? 'http' : 'https');
    return `${proto}://${host}`;
  }

  return new URL(req.url).origin;
}

export function getGoogleRedirectUri(req: Request): string {
  const origin = getRequestOrigin(req);
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (configured && (isLocalUrl(origin) || !isLocalUrl(configured))) {
    return configured;
  }

  return `${origin}/api/auth/callback/google`;
}

export function getAppBaseUrl(hostHeader?: string | null, protoHeader?: string | null): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  const cleanHost = hostHeader?.split(',')[0]?.trim();
  const cleanProto = protoHeader?.split(',')[0]?.trim();

  if (envUrl && (!cleanHost || isLocalUrl(`http://${cleanHost}`) || !isLocalUrl(envUrl))) {
    return envUrl;
  }

  if (cleanHost) {
    const proto = cleanProto || (isLocalUrl(`http://${cleanHost}`) ? 'http' : 'https');
    return `${proto}://${cleanHost}`;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return envUrl || 'http://localhost:3000';
}
