import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('userSession');
    return NextResponse.json({ success: true, message: 'Berhasil keluar' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal logout' },
      { status: 500 }
    );
  }
}
