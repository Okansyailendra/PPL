import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orders
 * Menerima pesanan online langsung dari pembeli di etalase:
 * 1. Validasi item dan ketersediaan stok
 * 2. Kurangi stok produk secara otomatis di database
 * 3. Catat transaksi ke tabel `transactions` untuk dashboard penjual
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, customer, fulfillmentType, paymentMethod } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Keranjang pesanan kosong' }, { status: 400 });
    }

    if (!customer?.name || !customer.name.trim()) {
      return NextResponse.json({ error: 'Nama pemesan wajib diisi' }, { status: 400 });
    }

    // Default UMKM (Toko Wadira)
    const umkmId = 'usr-warung-01';

    // 1. Ambil data produk untuk cek dan kurangi stok
    const productIds = items.map((it: any) => it.productId || it.id).filter(Boolean);
    const { data: dbProducts, error: fetchErr } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (fetchErr) {
      console.error('Error fetching products for order:', fetchErr);
      return NextResponse.json({ error: 'Gagal memverifikasi stok barang' }, { status: 500 });
    }

    const productMap = new Map<string, any>((dbProducts || []).map((p: any) => [p.id, p]));

    // 2. Cek kecukupan stok
    for (const item of items) {
      const pid = item.productId || item.id;
      const dbProd = productMap.get(pid);
      if (dbProd) {
        const requiredQty = Number(item.quantity) || 1;
        if (Number(dbProd.stock) < requiredQty) {
          return NextResponse.json(
            { error: `Stok "${dbProd.name}" tidak mencukupi (sisa ${dbProd.stock} ${dbProd.unit})` },
            { status: 400 }
          );
        }
      }
    }

    // 3. Kurangi stok produk
    for (const item of items) {
      const pid = item.productId || item.id;
      const dbProd = productMap.get(pid);
      if (dbProd) {
        const newStock = Math.max(0, Number(dbProd.stock) - (Number(item.quantity) || 1));
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', dbProd.id);
      }
    }

    // 4. Hitung total belanja
    const totalAmount = items.reduce((sum: number, it: any) => {
      const price = Number(it.price) || 0;
      const qty = Number(it.quantity) || 1;
      return sum + (price * qty);
    }, 0);

    // 5. Generate Order ID yang mudah dibaca
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderId = `ORD-${dateStr}-${randomHex}`;
    const nowIso = new Date().toISOString();

    const formattedItems = items.map((it: any) => {
      const pid = it.productId || it.id;
      const prod = productMap.get(pid);
      return {
        productId: pid,
        name: it.name || prod?.name || 'Produk Warung',
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || Number(prod?.price) || 0,
        unit: it.unit || prod?.unit || 'pcs',
        subtotal: (Number(it.price) || 0) * (Number(it.quantity) || 1),
      };
    });

    const isCash = paymentMethod === 'cash';

    // 6. Simpan transaksi ke tabel transactions
    const { error: trxErr } = await supabase
      .from('transactions')
      .insert([
        {
          id: orderId,
          umkm_id: umkmId,
          type: 'IN',
          category: 'PESANAN_ONLINE',
          payment_method: isCash ? 'CASH' : 'QRIS',
          payment_status: isCash ? 'PENDING' : 'PAID',
          total_amount: totalAmount,
          customer_name: customer.name.trim(),
          customer_phone: customer.phone?.trim() || null,
          shipping_address: customer.address?.trim() || (fulfillmentType === 'delivery' ? 'Antar ke Rumah' : 'Ambil di Warung'),
          items: formattedItems,
          transaction_date: nowIso,
          created_at: nowIso,
        }
      ]);

    if (trxErr) {
      console.error('Error inserting online transaction:', trxErr);
      return NextResponse.json({ error: 'Gagal mencatat transaksi: ' + trxErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId,
      totalAmount,
      customerName: customer.name,
      message: 'Pesanan berhasil dicatat dan stok telah diperbarui',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/orders:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
