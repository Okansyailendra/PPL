// @ts-ignore
import midtransClient from 'midtrans-client';

const serverKey = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-placeholder';
const clientKey = process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-placeholder';
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

