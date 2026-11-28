import { NextResponse } from 'next/server';
import {
  coreApi,
  isMidtransConfigured,
  PAYMENT_CHANNEL_CONFIG,
  type PaymentChannel,
} from '@/lib/midtrans';
import { supabase } from '@/lib/supabase';
import { applyRateLimit } from '@/lib/rate-limit';
import { getCurrentUser } from '@/lib/auth';
import { DEFAULT_STORE_UMKM_ID, resolveOfficialOrderPrice } from '@/lib/product-utils';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const rateLimitCheck = applyRateLimit(req, {
      limit: 25,
      windowMs: 60 * 1000,
      prefix: 'checkout',
    });
    if (rateLimitCheck.response) {
      return rateLimitCheck.response;
    }

    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Silakan masuk terlebih dahulu untuk melakukan checkout pembayaran.' },
        { status: 401 }
      );
    }

    if (!isMidtransConfigured()) {
      return NextResponse.json(
        { error: 'Gateway pembayaran Midtrans belum dikonfigurasi di server.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { items, customer, shipping } = body;
    const rawChannel = String(body?.paymentChannel || 'qris') as PaymentChannel;
    const paymentChannel: PaymentChannel = rawChannel in PAYMENT_CHANNEL_CONFIG ? rawChannel : 'qris';
    const channelConfig = PAYMENT_CHANNEL_CONFIG[paymentChannel];
    const umkmId = DEFAULT_STORE_UMKM_ID;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Keranjang belanja tidak boleh kosong' },
        { status: 400 }
      );
    }

    if (!customer?.name || !customer?.phone) {
      return NextResponse.json(
        { error: 'Nama dan nomor telepon pelanggan wajib diisi' },
        { status: 400 }
      );
    }

    const productIds = items
      .map((it: any) => it.productId || it.id)
      .filter(Boolean);

    if (productIds.length !== items.length) {
      return NextResponse.json(
        { error: 'Produk dalam keranjang tidak valid' },
        { status: 400 }
      );
    }

    const { data: dbProducts, error: dbErr } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('umkm_id', umkmId);

    if (dbErr || !dbProducts || dbProducts.length === 0) {
      return NextResponse.json(
        { error: 'Gagal memverifikasi produk dari database' },
        { status: 400 }
      );
    }

    const productMap = new Map<string, any>((dbProducts as any[]).map((p: any) => [p.id, p]));
    const validatedItems: any[] = [];
    let itemsTotal = 0;

    for (const it of items) {
      const pid = it.productId || it.id;
      const dbProd = productMap.get(pid);

      if (!dbProd) {
        return NextResponse.json(
          { error: `Produk dengan ID "${pid}" tidak ditemukan di database` },
          { status: 404 }
        );
      }

      const rawQty = Number(it.quantity);
      if (!Number.isFinite(rawQty) || rawQty < 1) {
        return NextResponse.json(
          { error: `Jumlah pembelian untuk "${dbProd.name}" minimal 1.` },
          { status: 400 }
        );
      }
      const qty = Math.round(rawQty);
      if (Number(dbProd.stock) < qty) {
        return NextResponse.json(
          {
            error: `Stok "${dbProd.name}" tidak mencukupi (tersisa ${dbProd.stock} ${dbProd.unit || 'pcs'})`,
          },
          { status: 400 }
        );
      }

      const priceResult = resolveOfficialOrderPrice(dbProd, it.price);
      if (priceResult.error || priceResult.price === undefined) {
        return NextResponse.json(
          { error: priceResult.error || 'Harga produk tidak valid.' },
          { status: 400 }
        );
      }

      const officialPrice = priceResult.price;
      const subtotal = officialPrice * qty;
      itemsTotal += subtotal;

      validatedItems.push({
        id: dbProd.id,
        productId: dbProd.id,
        name: (it.name || dbProd.name || 'Produk').slice(0, 50),
        price: officialPrice,
        costPrice: dbProd.cost_price ?? 0,
        quantity: qty,
        unit: it.unit || dbProd.unit || 'pcs',
        subtotal,
      });
    }

    const grossAmount = Math.round(itemsTotal);
    const orderId = `ORDER-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const itemDetails = validatedItems.map((it: any) => ({
      id: it.id,
      price: Math.round(it.price),
      quantity: it.quantity,
      name: it.name.slice(0, 50),
    }));

    const chargePayload: Record<string, any> = {
      payment_type: channelConfig.paymentType,
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: customer.name,
        email: customer.email || `${customer.phone.replace(/[^0-9]/g, '')}@warungppl.local`,
        phone: customer.phone,
      },
      item_details: itemDetails,
    };

    if (channelConfig.paymentType === 'qris') {
      chargePayload.qris = { acquirer: 'gopay' };
    } else if (channelConfig.paymentType === 'bank_transfer' && channelConfig.bank) {
      chargePayload.bank_transfer = { bank: channelConfig.bank };
    }

    let chargeRes: any;
    try {
      chargeRes = await coreApi.charge(chargePayload);
    } catch (midtransErr: any) {
      console.error('Midtrans Core API Charge Error:', midtransErr?.message || midtransErr);
      return NextResponse.json(
        { error: 'Gagal membuat tagihan pembayaran ke Midtrans. Silakan coba lagi.' },
        { status: 502 }
      );
    }

    const actions = Array.isArray(chargeRes?.actions) ? chargeRes.actions : [];
    const qrAction =
      actions.find((a: any) => a.name === 'generate-qr-code-v2') ||
      actions.find((a: any) => a.name === 'generate-qr-code');

    const qrImageUrl = qrAction?.url || null;
    const qrString = chargeRes?.qr_string || null;
    const vaInfo = Array.isArray(chargeRes?.va_numbers) ? chargeRes.va_numbers[0] : null;
    const vaNumber = vaInfo?.va_number || null;
    const bank = vaInfo?.bank ? String(vaInfo.bank).toUpperCase() : null;
    const expiryTime = chargeRes?.expiry_time || null;

    const nowIso = new Date().toISOString();
    const trxData = {
      id: orderId,
      umkm_id: umkmId,
      customer_id: currentUser.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      type: 'IN',
      category: 'PESANAN_ONLINE',
      payment_method: paymentChannel === 'qris' ? 'QRIS' : 'ONLINE',
      payment_status: 'PENDING',
      total_amount: grossAmount,
      shipping_cost: 0,
      courier: shipping?.courier || null,
      courier_service: shipping?.service || null,
      shipping_address: customer.address || null,
      snap_token: chargeRes?.transaction_id || null,
      items: validatedItems.map((it: any) => ({
        productId: it.productId,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        costPrice: it.costPrice,
        unit: it.unit,
        subtotal: it.subtotal,
      })),
      transaction_date: nowIso,
      created_at: nowIso,
    };

    const { error: insertErr } = await supabase
      .from('transactions')
      .insert([trxData]);

    if (insertErr) {
      console.error('Database Error saving order:', insertErr);
      return NextResponse.json(
        { error: 'Gagal menyimpan pesanan ke database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId,
      grossAmount,
      paymentChannel,
      channelLabel: channelConfig.label,
      qrImageUrl,
      qrString,
      vaNumber,
      bank,
      expiryTime,
    });
  } catch (error: any) {
    console.error('Payment checkout API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan saat memproses checkout' },
      { status: 500 }
    );
  }
}
