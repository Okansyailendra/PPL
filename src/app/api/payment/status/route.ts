import { NextResponse } from 'next/server';
import {
  coreApi,
  isMidtransConfigured,
  syncMidtransTransactionStatus,
} from '@/lib/midtrans';
import { supabase } from '@/lib/supabase';
import { getCurrentUser, isSellerRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payment/status?orderId=...
 * Mengecek status transaksi Midtrans milik pengguna dan menyinkronkan status SETTLEMENT ke DB.
 */
export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Silakan masuk terlebih dahulu.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId')?.trim();
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Parameter orderId wajib diisi.' },
        { status: 400 }
      );
    }

    const { data: existingTrx, error: trxErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', orderId)
      .single();

    if (trxErr || !existingTrx) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan.' },
        { status: 404 }
      );
    }

    const isAuthorized = isSellerRole(currentUser.role)
      ? existingTrx.umkm_id === currentUser.id
      : existingTrx.customer_id === currentUser.id;

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Anda tidak memiliki akses ke pesanan ini.' },
        { status: 403 }
      );
    }

    if (existingTrx.payment_status === 'SETTLEMENT') {
      return NextResponse.json({
        success: true,
        orderId,
        paymentStatus: 'SETTLEMENT',
      });
    }

    if (!isMidtransConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Gateway Midtrans belum dikonfigurasi.' },
        { status: 503 }
      );
    }

    let statusRes: any;
    try {
      statusRes = await coreApi.transaction.status(orderId);
    } catch (midErr: any) {
      return NextResponse.json({
        success: true,
        orderId,
        paymentStatus: existingTrx.payment_status || 'PENDING',
        message: midErr?.message || 'Menunggu konfirmasi pembayaran.',
      });
    }

    const updatedStatus = await syncMidtransTransactionStatus(orderId, existingTrx, statusRes);

    return NextResponse.json({
      success: true,
      orderId,
      paymentStatus: updatedStatus,
    });
  } catch (error: any) {
    console.error('Error checking Midtrans payment status:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memeriksa status pembayaran' },
      { status: 500 }
    );
  }
}
