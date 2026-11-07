import { NextResponse } from 'next/server';
import { coreApi } from '@/lib/midtrans';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const notificationJson = await req.json();

    // Verifikasi notifikasi dengan CoreApi Midtrans
    let statusResponse: any = notificationJson;
    try {
      statusResponse = await coreApi.transaction.notification(notificationJson);
    } catch (e: any) {
      console.warn('Verifikasi notifikasi manual/fallback:', e?.message);
    }

    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    console.log(`[Midtrans Webhook] Order: ${orderId}, Status: ${transactionStatus}, Fraud: ${fraudStatus}`);

    let newPaymentStatus: 'PENDING' | 'SETTLEMENT' | 'EXPIRE' | 'CANCEL' | 'FAILED' = 'PENDING';

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        newPaymentStatus = 'SETTLEMENT';
      }
    } else if (transactionStatus === 'settlement') {
      newPaymentStatus = 'SETTLEMENT';
    } else if (
      transactionStatus === 'cancel' ||
      transactionStatus === 'deny' ||
      transactionStatus === 'expire'
    ) {
      newPaymentStatus = transactionStatus === 'expire' ? 'EXPIRE' : 'CANCEL';
    } else if (transactionStatus === 'pending') {
      newPaymentStatus = 'PENDING';
    }

    // Ambil data transaksi lama dari database
    const { data: existingTrx } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', orderId)
      .single();

    if (existingTrx) {
      // 1. Update status pembayaran di database
      await supabase
        .from('transactions')
        .update({ payment_status: newPaymentStatus })
        .eq('id', orderId);

      // 2. Jika status berubah menjadi SETTLEMENT (Lunas) dan sebelumnya belum lunas, kurangi stok barang
      if (newPaymentStatus === 'SETTLEMENT' && existingTrx.payment_status !== 'SETTLEMENT') {
        const items = typeof existingTrx.items === 'string' 
          ? JSON.parse(existingTrx.items) 
          : existingTrx.items || [];

        for (const it of items) {
          if (it.productId) {
            const { data: product } = await supabase
              .from('products')
              .select('id, stock')
              .eq('id', it.productId)
              .single();

            if (product) {
              const updatedStock = Math.max(0, product.stock - (Number(it.quantity) || 1));
              await supabase
                .from('products')
                .update({ stock: updatedStock })
                .eq('id', product.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'OK', message: 'Notification processed' });
  } catch (error: any) {
    console.error('Error handling Midtrans notification:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

