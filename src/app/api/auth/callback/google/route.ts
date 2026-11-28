import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { signSessionToken } from '@/lib/auth';
import { getGoogleRedirectUri, getRequestOrigin } from '@/lib/url';
import type { UserSession } from '@/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = getRequestOrigin(req);
  const isHttps = origin.startsWith('https://');
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const stateRaw = url.searchParams.get('state');

  let redirectTarget = '/dashboard/pelanggan';

  // Decode redirect target dari state (cegah open redirect //...)
  if (stateRaw) {
    try {
      const stateObj = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
      if (
        stateObj?.redirect &&
        typeof stateObj.redirect === 'string' &&
        stateObj.redirect.startsWith('/') &&
        !stateObj.redirect.startsWith('//')
      ) {
        redirectTarget = stateObj.redirect;
      }
    } catch {
      // ignore invalid state
    }
  }

  if (error || !code) {
    console.error('Google OAuth callback error:', error);
    const friendlyError =
      error === 'access_denied'
        ? 'Login Google dibatalkan atau akun email Anda belum terdaftar di Test Users Google Cloud Console.'
        : error || 'Otorisasi Google dibatalkan atau kode tidak ditemukan.';
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(friendlyError)}`, origin)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = getGoogleRedirectUri(req);

  try {
    // 1. Tukar authorization code dengan access token ke Google OAuth
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Gagal menukar token dengan Google:', tokenData);
      const errDetail =
        tokenData.error === 'redirect_uri_mismatch'
          ? `Google Redirect URI tidak cocok (${redirectUri}).`
          : tokenData.error_description || tokenData.error || 'Gagal verifikasi otorisasi dengan Google';
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errDetail)}`, origin)
      );
    }

    // 2. Ambil data profil pengguna dari Google UserInfo API
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const googleUser = await userInfoResponse.json();

    if (!userInfoResponse.ok || !googleUser?.email) {
      console.error('Gagal memuat profil pengguna dari Google:', googleUser);
      return NextResponse.redirect(new URL('/login?error=GagalMemuatProfilGoogle', origin));
    }

    const email = googleUser.email.trim().toLowerCase();
    const name = (googleUser.name || googleUser.given_name || email.split('@')[0]).trim();
    const avatar = googleUser.picture || '';
    const googleId = googleUser.sub || '';

    // 3. Cek apakah akun ini sebelumnya sudah didaftarkan di database
    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    let userData: UserSession;
    let finalRedirect = redirectTarget;

    if (existingUser && !queryError) {
      const isPenjual =
        existingUser.role === 'penjual' ||
        existingUser.role === 'admin' ||
        (Boolean(existingUser.store_name) && existingUser.role !== 'pelanggan');

      if (isPenjual) {
        userData = {
          id: existingUser.id,
          email: existingUser.email,
          owner_name: existingUser.owner_name || name,
          store_name: existingUser.store_name || 'Warung Wadira',
          phone_number: existingUser.phone_number || '',
          role: 'penjual',
          avatar_url: existingUser.avatar_url || avatar || '',
          google_id: existingUser.google_id || googleId || null,
          address: existingUser.address || null,
        };
        finalRedirect = '/dashboard/penjual';
      } else {
        userData = {
          id: existingUser.id,
          email: existingUser.email,
          owner_name: existingUser.owner_name || name,
          store_name: existingUser.store_name || '',
          phone_number: existingUser.phone_number || '',
          role: 'pelanggan',
          avatar_url: existingUser.avatar_url || avatar || '',
          google_id: existingUser.google_id || googleId || null,
          address: existingUser.address || null,
        };
        finalRedirect = redirectTarget;
      }

      const userUpdates: Record<string, any> = {};
      if (avatar && !existingUser.avatar_url) userUpdates.avatar_url = avatar;
      if (googleId && !existingUser.google_id) userUpdates.google_id = googleId;

      if (Object.keys(userUpdates).length > 0) {
        try {
          await supabase.from('users').update(userUpdates).eq('id', existingUser.id);
        } catch {
          // ignore non-critical profile sync failure
        }
      }
    } else {
      // Akun BELUM terdaftar di database -> otomatis daftar sebagai PELANGGAN
      const newId = crypto.randomUUID();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const newCustomer = {
        id: newId,
        email,
        password: null,
        owner_name: name,
        store_name: '',
        phone_number: '',
        role: 'pelanggan',
        avatar_url: avatar,
        google_id: googleId || null,
        address: null,
        created_at: now,
      };

      const { error: insertErr } = await supabase.from('users').insert([newCustomer]);
      let resolvedId = newId;
      let resolvedRole: 'penjual' | 'pelanggan' | 'admin' = 'pelanggan';

      if (insertErr) {
        console.error('[Google OAuth Callback] Error inserting new customer:', insertErr);
        // Cek ulang barangkali race condition (sudah masuk dari request paralel)
        const { data: retryUser } = await supabase
          .from('users')
          .select('id, role')
          .eq('email', email)
          .single();

        if (!retryUser) {
          return NextResponse.redirect(
            new URL(
              `/login?error=${encodeURIComponent(
                `Gagal menyimpan akun ke database (${insertErr.message || 'Database Error'}).`
              )}`,
              origin
            )
          );
        }
        resolvedId = retryUser.id;
        resolvedRole = retryUser.role || 'pelanggan';
      }

      userData = {
        id: resolvedId,
        email,
        owner_name: name,
        store_name: '',
        phone_number: '',
        role: resolvedRole,
        avatar_url: avatar,
        google_id: googleId || null,
        address: null,
      };

      finalRedirect = resolvedRole === 'penjual' || resolvedRole === 'admin' ? '/dashboard/penjual' : redirectTarget;
    }

    // 4. Set Session Cookie HMAC signed (dikontrol cookie 5 hari ketidakaktifan)
    const FIVE_DAYS = 5 * 24 * 60 * 60;
    const token = signSessionToken(userData, 30 * 24 * 60 * 60);

    const redirectResponse = NextResponse.redirect(new URL(finalRedirect, origin));
    redirectResponse.cookies.set('userSession', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: FIVE_DAYS,
    });

    return redirectResponse;
  } catch (err: any) {
    console.error('Error pada OAuth callback Google:', err);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(err?.message || 'Gagal memproses otorisasi Google')}`,
        origin
      )
    );
  }
}
