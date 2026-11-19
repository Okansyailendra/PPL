import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Harap masuk terlebih dahulu' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const phoneNumber = (body.phone_number || body.phone || '').trim();

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Nomor telepon tidak boleh kosong' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('users')
      .update({ phone_number: phoneNumber })
      .eq('id', currentUser.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Gagal memperbarui nomor telepon' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      phone_number: phoneNumber,
      message: 'Nomor telepon berhasil disimpan',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
