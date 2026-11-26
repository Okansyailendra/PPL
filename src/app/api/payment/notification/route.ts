import { NextResponse } from 'next/server';
import { coreApi, verifyMidtransSignature } from '@/lib/midtrans';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    let notificationJson: any;
    try {
      notificationJson = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Format body request harus berupa JSON yang valid' },
        { status: 400 }
      );
    }

    if (!notificationJson || typeof notificationJson !== 'object') {
      return NextResponse.json(
        { error: 'Payload notifikasi tidak valid' },
        { status: 400 }
      );
    }

    const orderId = String(notificationJson.order_id || '').trim();
    const statusCode = String(notificationJson.status_code || '').trim();
    const grossAmount = String(notificationJson.gross_amount || '').trim();
    const signatureKey = String(notificationJson.signature_key || '').trim();

    if (!orderId || !statusCode || !grossAmount || !signatureKey) {
      return NextResponse.json(
        { error: 'Field order_id, status_code, gross_amount, dan signature_key wajib disertakan' },
        { status: 400 }
      );
    }

    const isSignatureValid = verifyMidtransSignature(
      orderId,
      statusCode,
      grossAmount,
      signatureKey
    );

    if (!isSignatureValid) {
      console.warn(`[Midtrans Webhook Security] Invalid signature rejected for order: ${orderId}`);
      return NextResponse.json(
        { error: 'Signature tidak valid (Unauthorized)' },
        { status: 401 }
      );
    }

    const { data: existingTrx, error: trxErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', orderId)
      .single();

    if (trxErr || !existingTrx) {
      console.warn(`[Midtrans Webhook] Transaksi ${orderId} tidak ditemukan di database`);
      return NextResponse.json(
        { error: 'Pesanan tidak ditemukan di sistem' },
        { status: 404 }
      );
    }

    const billedAmount = Math.round(Number(existingTrx.total_amount));
    const receivedAmount = Math.round(parseFloat(grossAmount));
    if (billedAmount !== receivedAmount) {
      console.warn(
        `[Midtrans Webhook] Mismatch gross_amount untuk order ${orderId}: tagihan=${billedAmount}, diterima=${receivedAmount}`
      );
      return NextResponse.json(
        { error: 'Nominal pembayaran tidak sesuai dengan tagihan pesanan' },
        { status: 400 }
      );
    }

    let statusResponse: any = notificationJson;
    const isConfiguredKey =
      Boolean(process.env.MIDTRANS_SERVER_KEY) &&
      process.env.MIDTRANS_SERVER_KEY !== 'SB-Mid-server-placeholder';

    if (isConfiguredKey) {
      try {
        statusResponse = await coreApi.transaction.notification(notificationJson);
      } catch (e: any) {
        console.error(`[Midtrans Webhook] Verifikasi ke Midtrans Core API gagal:`, e?.message);
        return NextResponse.json(
          { error: 'Gagal memverifikasi status pembayaran langsung ke server Midtrans' },
          { status: 400 }
        );
      }
    }

    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    console.log(
      `[Midtrans Webhook] Verified Order: ${orderId}, Status: ${transactionStatus}, Fraud: ${fraudStatus}`
    );

    let newPaymentStatus: 'PENDING' | 'SETTLEMENT' | 'EXPIRE' | 'CANCEL' | 'FAILED' = 'PENDING';

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        newPaymentStatus = 'SETTLEMENT';
      } else if (fraudStatus === 'challenge') {
        newPaymentStatus = 'PENDING';
      }
    } else if (transactionStatus === 'settlement') {
      newPaymentStatus = 'SETTLEMENT';
    } else if (
      transactionStatus === 'cancel' ||
      transactionStatus === 'deny'
    ) {
      newPaymentStatus = 'CANCEL';
    } else if (transactionStatus === 'expire') {
      newPaymentStatus = 'EXPIRE';
    } else if (transactionStatus === 'pending') {
      newPaymentStatus = 'PENDING';
    } else {
      newPaymentStatus = 'FAILED';
    }

    // Idempotency: cegah proses ulang jika sudah lunas sebelumnya
    if (existingTrx.payment_status === 'SETTLEMENT') {
      console.log(`[Midtrans Webhook] Transaksi ${orderId} sudah berstatus SETTLEMENT.`);
      return NextResponse.json({
        status: 'OK',
        message: 'Transaksi sudah lunas sebelumnya (idempotent)',
      });
    }

    await supabase
      .from('transactions')
      .update({ payment_status: newPaymentStatus })
      .eq('id', orderId);

    if (newPaymentStatus === 'SETTLEMENT') {
      const items =
        typeof existingTrx.items === 'string'
          ? JSON.parse(existingTrx.items)
          : existingTrx.items || [];

      for (const it of items) {
        const productId = it.productId || it.id;
        if (productId) {
          const { data: product } = await supabase
            .from('products')
            .select('id, stock')
            .eq('id', productId)
            .single();

          if (product) {
            const qty = Number(it.quantity) || 1;
            const updatedStock = Math.max(0, (Number(product.stock) || 0) - qty);
            await supabase
              .from('products')
              .update({ stock: updatedStock })
              .eq('id', product.id);
          }
        }
      }
    }

    return NextResponse.json({
      status: 'OK',
      message: 'Notifikasi pembayaran Midtrans berhasil diproses',
      orderId,
      paymentStatus: newPaymentStatus,
    });
  } catch (error: any) {
    console.error('Error handling Midtrans notification:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error saat memproses notifikasi' },
      { status: 500 }
    );
  }
}
