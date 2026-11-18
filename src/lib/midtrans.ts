// @ts-ignore
import midtransClient from 'midtrans-client';
import crypto from 'crypto';

const serverKey = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-placeholder';
const clientKey =
  process.env.MIDTRANS_CLIENT_KEY ||
  process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ||
  'SB-Mid-client-placeholder';
const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

// Inisialisasi Snap client
export const snap = new midtransClient.Snap({
  isProduction,
  serverKey,
  clientKey,
});

// Inisialisasi Core API client untuk cek status transaksi atau verifikasi notifikasi
export const coreApi = new midtransClient.CoreApi({
  isProduction,
  serverKey,
  clientKey,
});

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
  if (!orderId || !statusCode || !grossAmount || !signatureKey) {
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


