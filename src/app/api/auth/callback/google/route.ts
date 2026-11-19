import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { signSessionToken } from '@/lib/auth';
import type { UserSession } from '@/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const stateRaw = url.searchParams.get('state');

  let redirectTarget = '/dashboard/pelanggan';

  // Decode redirect target dari state
  if (stateRaw) {
    try {
      const stateObj = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
      if (stateObj?.redirect && typeof stateObj.redirect === 'string' && stateObj.redirect.startsWith('/')) {
        redirectTarget = stateObj.redirect;
      }
    } catch {
      // ignore
    }
  }

  if (error || !code) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error || 'Otorisasi Google dibatalkan atau kode tidak ditemukan')}`, req.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google.';

  try {
    // 1. Tukar authorization code dengan access token & id token ke Google OAuth
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
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(tokenData.error_description || 'Gagal verifikasi otorisasi dengan Google')}`, req.url)
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
      return NextResponse.redirect(
        new URL('/login?error=GagalMemuatProfilGoogle', req.url)
      );
    }

    const email = googleUser.email.trim().toLowerCase();
    const name = (googleUser.name || googleUser.given_name || email.split('@')[0]).trim();
    const avatar = googleUser.picture || '';

    // 3. Cek apakah akun ini sebelumnya sudah didaftarkan di database
    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    let userData: UserSession;
    let finalRedirect = redirectTarget;

    if (existingUser && !queryError) {
      // Akun terdaftar di database
      // Jika memiliki role penjual/admin atau memiliki store_name dan bukan pelanggan
      const isPenjual =
        existingUser.role === 'penjual' ||
        existingUser.role === 'admin' ||
        (Boolean(existingUser.store_name) && existingUser.role !== 'pelanggan');

      if (isPenjual) {
        // Otomatis ke dashboard penjual/admin
        userData = {
          id: existingUser.id,
          email: existingUser.email,
          owner_name: existingUser.owner_name || name,
          store_name: existingUser.store_name || 'Warung Wadira',
          phone_number: existingUser.phone_number || '',
          role: 'penjual',
          avatar_url: existingUser.avatar_url || avatar || '',
        };
        finalRedirect = '/dashboard/penjual';
      } else {
        // Akun pelanggan terdaftar
        userData = {
          id: existingUser.id,
          email: existingUser.email,
          owner_name: existingUser.owner_name || name,
          store_name: existingUser.store_name || '',
          phone_number: existingUser.phone_number || '',
          role: 'pelanggan',
          avatar_url: existingUser.avatar_url || avatar || '',
        };
        finalRedirect = redirectTarget;
      }

      // Update avatar jika ada foto Google terbaru
      if (avatar && !existingUser.avatar_url) {
        try {
          await supabase.from('users').update({ avatar_url: avatar }).eq('id', existingUser.id);
        } catch {
          // ignore
        }
      }
    } else {
      // Akun BELUM terdaftar di database:
      // Sesuai sistem Wadira, akun yang tidak didaftarkan sebagai admin otomatis menjadi PELANGGAN
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
        created_at: now,
      };

      try {
        const { error: insertErr } = await supabase.from('users').insert([newCustomer]);
        if (insertErr) {
          console.error('[Google OAuth Callback] Error inserting new customer:', insertErr);
        } else {
          console.log(`[Google OAuth Callback] Pelanggan baru berhasil disimpan ke database: ${email}`);
        }
      } catch (e) {
        console.error('[Google OAuth Callback] Exception inserting customer:', e);
      }

      userData = {
        id: newId,
        email,
        owner_name: name,
        store_name: '',
        phone_number: '',
        role: 'pelanggan',
        avatar_url: avatar,
      };

      finalRedirect = redirectTarget;
    }

    // 4. Set Session Cookie HMAC signed (7 hari)
    const token = signSessionToken(userData, 7 * 24 * 60 * 60);

    const cookieStore = await cookies();
    cookieStore.set('userSession', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.redirect(new URL(finalRedirect, req.url));
  } catch (err: any) {
    console.error('Error pada OAuth callback Google:', err);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err?.message || 'Gagal memproses otorisasi Google')}`, req.url)
    );
  }
}
