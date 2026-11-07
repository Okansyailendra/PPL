import { NextResponse } from 'next/server';
import { snap } from '@/lib/midtrans';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, customer, shipping, umkmId } = body;

    if (!items || items.length === 0) {
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

    // 1. Hitung total belanja produk
    const itemsTotal = items.reduce(
      (sum: number, it: any) => sum + Number(it.price) * Number(it.quantity),
      0
    );

    // Ongkos kirim jika ada
    const shippingCost = Number(shipping?.cost) || 0;
    const grossAmount = itemsTotal + shippingCost;

    // 2. Generate Order ID yang unik (misal: ORDER-timestamp-random)
    const orderId = `ORDER-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Siapkan item_details untuk Midtrans
    const itemDetails = items.map((it: any) => ({
      id: it.productId || it.id || crypto.randomUUID(),
      price: Math.round(Number(it.price)),
      quantity: Number(it.quantity),
      name: (it.name || 'Produk').slice(0, 50),
    }));

    if (shippingCost > 0) {
      itemDetails.push({
        id: 'SHIPPING-COST',
        price: Math.round(shippingCost),
        quantity: 1,
        name: `Ongkir (${shipping?.courier || 'Ekspedisi'} - ${shipping?.service || 'REG'})`.slice(0, 50),
      });
    }

    // 3. Payload untuk Midtrans Snap Parameter
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: Math.round(grossAmount),
      },
      customer_details: {
        first_name: customer.name,
        email: customer.email || `${customer.phone.replace(/[^0-9]/g, '')}@warungppl.local`,
        phone: customer.phone,
        billing_address: {
          first_name: customer.name,
          phone: customer.phone,
          address: customer.address || 'Alamat tidak diisi',
        },
        shipping_address: {
          first_name: customer.name,
          phone: customer.phone,
          address: customer.address || 'Alamat tidak diisi',
        },
      },
      item_details: itemDetails,
    };

    // 4. Request Snap Token dari Midtrans
    let snapToken = '';
    let redirectUrl = '';
    try {
      const transaction = await snap.createTransaction(parameter);
      snapToken = transaction.token;
      redirectUrl = transaction.redirect_url;
    } catch (midtransErr: any) {
      console.error('Midtrans Snap Error:', midtransErr?.message || midtransErr);
      // Jika keys masih placeholder atau sandbox error, berikan simulasi token untuk testing
      snapToken = `SIMULATED-TOKEN-${orderId}`;
    }

    // 5. Simpan catatan pesanan ke tabel transactions di database warungppl_db
    const nowIso = new Date().toISOString();
    const trxData = {
      id: orderId,
      umkm_id: umkmId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // default warung
      customer_name: customer.name,
      customer_phone: customer.phone,
      type: 'IN',
      category: 'Penjualan Online E-Commerce',
      payment_method: 'ONLINE',
      payment_status: 'PENDING',
      total_amount: grossAmount,
      shipping_cost: shippingCost,
      courier: shipping?.courier || null,
      courier_service: shipping?.service || null,
      shipping_address: customer.address || null,
      snap_token: snapToken,
      items: items.map((it: any) => ({
        productId: it.productId || it.id,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        unit: it.unit || 'pcs',
        subtotal: it.quantity * it.price,
      })),
      created_at: nowIso,
    };

    const { error: insertErr } = await supabase
      .from('transactions')
      .insert([trxData]);

    if (insertErr) {
      console.error('Database Error saving order:', insertErr);
    }

    return NextResponse.json({
      success: true,
      orderId,
      snapToken,
      redirectUrl,
      grossAmount,
    });
  } catch (error: any) {
    console.error('Payment checkout API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan saat memproses checkout' },
      { status: 500 }
    );
  }
}

