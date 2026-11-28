// @ts-ignore
import midtransClient from 'midtrans-client';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
const clientKey =
  process.env.MIDTRANS_CLIENT_KEY ||
  process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ||
  '';
const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

export function isMidtransConfigured(): boolean {
  return (
    Boolean(serverKey) &&
    serverKey !== 'SB-Mid-server-placeholder' &&
    !serverKey.includes('your-')
  );
}

// Inisialisasi Core API client untuk charge QRIS/VA, cek status transaksi, & verifikasi notifikasi
export const coreApi = new midtransClient.CoreApi({
  isProduction,
  serverKey: serverKey || 'UNCONFIGURED',
  clientKey: clientKey || 'UNCONFIGURED',
});

export type PaymentChannel = 'qris' | 'bca_va' | 'bni_va' | 'bri_va';

export const PAYMENT_CHANNEL_CONFIG: Record<
  PaymentChannel,
  { label: string; paymentType: 'qris' | 'bank_transfer'; bank?: 'bca' | 'bni' | 'bri' }
> = {
  qris: { label: 'QRIS (Semua E-Wallet & Mobile Banking)', paymentType: 'qris' },
  bca_va: { label: 'BCA Virtual Account', paymentType: 'bank_transfer', bank: 'bca' },
  bni_va: { label: 'BNI Virtual Account', paymentType: 'bank_transfer', bank: 'bni' },
  bri_va: { label: 'BRI Virtual Account', paymentType: 'bank_transfer', bank: 'bri' },
};

export type NormalizedPaymentStatus = 'PENDING' | 'SETTLEMENT' | 'EXPIRE' | 'CANCEL' | 'FAILED';

/**
 * Memetakan status transaksi Midtrans menjadi status pembayaran internal.
 */
export function mapMidtransStatus(
  transactionStatus?: string,
  fraudStatus?: string
): NormalizedPaymentStatus {
  if (transactionStatus === 'capture') {
    if (fraudStatus === 'accept') return 'SETTLEMENT';
    if (fraudStatus === 'challenge') return 'PENDING';
    return 'FAILED';
  }
  if (transactionStatus === 'settlement') return 'SETTLEMENT';
  if (transactionStatus === 'cancel' || transactionStatus === 'deny') return 'CANCEL';
  if (transactionStatus === 'expire') return 'EXPIRE';
  if (transactionStatus === 'pending') return 'PENDING';
  return 'FAILED';
}

/**
 * Menyinkronkan status pembayaran Midtrans ke database dan memotong stok secara idempoten saat SETTLEMENT.
 */
export async function syncMidtransTransactionStatus(
  orderId: string,
  existingTrx: any,
  statusResponse: any
): Promise<NormalizedPaymentStatus> {
  if (existingTrx?.payment_status === 'SETTLEMENT') {
    return 'SETTLEMENT';
  }

  const newPaymentStatus = mapMidtransStatus(
    statusResponse?.transaction_status,
    statusResponse?.fraud_status
  );

  if (newPaymentStatus !== existingTrx?.payment_status) {
    await supabase
      .from('transactions')
      .update({ payment_status: newPaymentStatus })
      .eq('id', orderId);
  }

  if (newPaymentStatus === 'SETTLEMENT') {
    const items =
      typeof existingTrx.items === 'string'
        ? JSON.parse(existingTrx.items)
        : existingTrx.items || [];

    for (const it of items) {
      const productId = it.productId || it.id;
      if (!productId) continue;

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

  return newPaymentStatus;
}

/**
 * Verifikasi signature_key dari webhook notifikasi Midtrans.
 * Formula Midtrans: SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  if (!isMidtransConfigured() || !orderId || !statusCode || !grossAmount || !signatureKey) {
    return false;
  }

  const rawString = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const expectedHash = crypto.createHash('sha512').update(rawString).digest('hex');

  const sigBuf = Buffer.from(signatureKey, 'utf8');
  const expBuf = Buffer.from(expectedHash, 'utf8');

  if (sigBuf.length !== expBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expBuf);
}
