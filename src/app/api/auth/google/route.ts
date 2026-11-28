import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getGoogleRedirectUri } from '@/lib/url';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const redirectParam = searchParams.get('redirect') || searchParams.get('callbackUrl') || '';
  const isCheck = searchParams.get('check') === '1';

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const redirectUri = getGoogleRedirectUri(req);

  if (isCheck) {
    return NextResponse.json({ hasConfig: Boolean(clientId) });
  }

  if (!clientId) {
    return NextResponse.redirect(new URL('/login?error=GoogleClientIdBelumDiatur', req.url));
  }

  // Siapkan payload state untuk mempertahankan URL tujuan redirect dan mencegah CSRF
  const statePayload = {
    redirect: redirectParam,
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  return NextResponse.redirect(authUrl.toString());
}
