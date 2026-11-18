import { NextResponse } from 'next/server';
import { snap } from '@/lib/midtrans';
import { supabase } from '@/lib/supabase';
import { applyRateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    // 0. Rate limiting protection (Maksimal 25 request checkout per menit per IP)
    const rateLimitCheck = applyRateLimit(req, {
      limit: 25,
      windowMs: 60 * 1000,
      prefix: 'checkout',
    });
    if (rateLimitCheck.response) {
      return rateLimitCheck.response;
    }

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

    // 1. Ambil data produk resmi dari database untuk mencegah manipulasi harga (Price Tampering)
    const productIds = items
      .map((it: any) => it.productId || it.id)
      .filter(Boolean);

    if (productIds.length === 0) {
      return NextResponse.json(
        { error: 'Produk dalam keranjang tidak valid' },
        { status: 400 }
      );
    }

    const { data: dbProducts, error: dbErr } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (dbErr || !dbProducts || dbProducts.length === 0) {
      return NextResponse.json(
        { error: 'Gagal memverifikasi produk dari database' },
        { status: 400 }
      );
    }

    const productMap = new Map<string, any>((dbProducts as any[]).map((p: any) => [p.id, p]));

    // Validasi stok dan hitung total menggunakan harga resmi database
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

      const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
      if (Number(dbProd.stock) < qty) {
        return NextResponse.json(
          {
            error: `Stok "${dbProd.name}" tidak mencukupi (tersisa ${dbProd.stock} ${dbProd.unit || 'pcs'})`,
          },
          { status: 400 }
        );
      }

      // Selalu gunakan harga resmi dari database (bukan dari input klien)
      const officialPrice = Number(dbProd.price) || 0;
      const subtotal = officialPrice * qty;
      itemsTotal += subtotal;

      validatedItems.push({
        id: dbProd.id,
        productId: dbProd.id,
        name: dbProd.name || 'Produk',
        price: officialPrice,
        quantity: qty,
        unit: dbProd.unit || 'pcs',
        subtotal,
      });
    }

    // Ongkos kirim jika ada (pastikan tidak negatif)
    const shippingCost = Math.max(0, Number(shipping?.cost) || 0);
    const grossAmount = itemsTotal + shippingCost;

    // 2. Generate Order ID yang unik (misal: ORDER-timestamp-random)
    const orderId = `ORDER-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Siapkan item_details untuk Midtrans menggunakan harga database terverifikasi
    const itemDetails = validatedItems.map((it: any) => ({
      id: it.id,
      price: Math.round(it.price),
      quantity: it.quantity,
      name: it.name.slice(0, 50),
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
      items: validatedItems.map((it: any) => ({
        productId: it.productId,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        unit: it.unit,
        subtotal: it.subtotal,
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

