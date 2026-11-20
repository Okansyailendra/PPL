import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { signSessionToken } from '@/lib/auth';
import type { UserSession } from '@/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const redirectParam = searchParams.get('redirect') || searchParams.get('callbackUrl') || '';
  const isCheck = searchParams.get('check') === '1';

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let email = '';
    let name = '';
    let avatar = '';
    const redirectParam = typeof body.redirect === 'string' ? body.redirect.trim() : '';

    // 1. Ekstrak data dari Google JWT (Google Identity Services) jika ada
    if (body.credential && typeof body.credential === 'string') {
      try {
        const parts = body.credential.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
          email = (payload.email || '').trim().toLowerCase();
          name = payload.name || payload.given_name || email.split('@')[0];
          avatar = payload.picture || '';
        }
      } catch (err) {
        console.warn('Gagal decode JWT Google credential:', err);
      }
    }

    // 2. Fallback jika dikirim via direct Google email/name (misal modal selector atau OAuth API)
    if (!email && body.email && typeof body.email === 'string') {
      email = body.email.trim().toLowerCase();
      name = (body.name || email.split('@')[0]).trim();
      avatar = (body.avatar || '').trim();
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Email Google tidak valid.' },
        { status: 400 }
      );
    }

    // 3. Cek apakah akun ini sebelumnya sudah didaftarkan di database
    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    let userData: UserSession;
    let targetUrl = '/dashboard/pelanggan';

    if (existingUser && !queryError) {
      // Akun terdaftar di database
      // Jika memiliki role penjual/admin atau memiliki store_name dan bukan bertipe pelanggan,
      // maka otomatis masuk sebagai PENJUAL (ADMIN)
      const isPenjual =
        existingUser.role === 'penjual' ||
        existingUser.role === 'admin' ||
        (Boolean(existingUser.store_name) && existingUser.role !== 'pelanggan');

      if (isPenjual) {
        // Otomatis ke dashboard penjual/admin
        const effectiveRole = 'penjual';
        userData = {
          id: existingUser.id,
          email: existingUser.email,
          owner_name: existingUser.owner_name || name || 'Pemilik Warung',
          store_name: existingUser.store_name || 'Warung Wadira',
          phone_number: existingUser.phone_number || '',
          role: effectiveRole,
          avatar_url: existingUser.avatar_url || avatar || '',
          google_id: existingUser.google_id || null,
          address: existingUser.address || null,
        };
        targetUrl = '/dashboard/penjual';
      } else {
        // Akun pelanggan yang sudah pernah ada
        userData = {
          id: existingUser.id,
          email: existingUser.email,
          owner_name: existingUser.owner_name || name || email.split('@')[0],
          store_name: existingUser.store_name || '',
          phone_number: existingUser.phone_number || '',
          role: 'pelanggan',
          avatar_url: existingUser.avatar_url || avatar || '',
          google_id: existingUser.google_id || null,
          address: existingUser.address || null,
        };
        // Jika ada redirect khusus (misal dari keranjang checkout)
        targetUrl = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/dashboard/pelanggan';
      }

      // Update avatar jika ada foto Google baru
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
      const newCustomer = {
        id: newId,
        email: email,
        password: null,
        owner_name: name || email.split('@')[0],
        store_name: '',
        phone_number: '',
        role: 'pelanggan',
        avatar_url: avatar || '',
        google_id: null,
        address: null,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };

      const { data: inserted, error: insertError } = await supabase
        .from('users')
        .insert([newCustomer])
        .select()
        .single();

      if (insertError) {
        console.error('Gagal mendaftarkan pelanggan baru:', insertError);
      }

      userData = {
        id: newId,
        email: email,
        owner_name: name || email.split('@')[0],
        store_name: '',
        phone_number: '',
        role: 'pelanggan',
        avatar_url: avatar || '',
        google_id: null,
        address: null,
      };

      targetUrl = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/dashboard/pelanggan';
    }

    // 4. Buat session token aman (HMAC signed, berlaku hingga 30 hari, dikontrol cookie 5 hari)
    const FIVE_DAYS = 5 * 24 * 60 * 60;
    const token = signSessionToken(userData, 30 * 24 * 60 * 60);

    const cookieStore = await cookies();
    cookieStore.set('userSession', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: FIVE_DAYS,
    });

    return NextResponse.json({
      success: true,
      role: userData.role,
      redirectUrl: targetUrl,
      user: userData,
    });
  } catch (error: any) {
    console.error('Error saat login Google:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Terjadi kesalahan saat memproses login Google' },
      { status: 500 }
    );
  }
}
