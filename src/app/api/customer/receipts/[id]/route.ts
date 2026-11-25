import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SCAN_CATEGORY = 'SCAN_STRUK_PELANGGAN';

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const receiptId = id?.trim();
    if (!receiptId) {
      return NextResponse.json(
        { success: false, error: 'ID struk tidak valid.' },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('transactions')
      .select('id, customer_id, category')
      .eq('id', receiptId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { success: false, error: 'Data struk tidak ditemukan.' },
        { status: 404 }
      );
    }

    if (existing.category !== SCAN_CATEGORY || existing.customer_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak memiliki izin untuk menghapus struk ini.' },
        { status: 403 }
      );
    }

    const { error: deleteErr } = await supabase
      .from('transactions')
      .delete()
      .eq('id', receiptId)
      .eq('customer_id', user.id)
      .eq('category', SCAN_CATEGORY);

    if (deleteErr) {
      console.error('Error deleting scanned receipt:', deleteErr);
      return NextResponse.json(
        { success: false, error: 'Gagal menghapus struk: ' + deleteErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Struk berhasil dihapus dari riwayat Anda.',
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/customer/receipts/[id]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Terjadi kesalahan sistem.' },
      { status: 500 }
    );
  }
}
