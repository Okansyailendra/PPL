import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { applyRateLimit } from '@/lib/rate-limit';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rateLimitCheck = applyRateLimit(req, {
      limit: 20,
      windowMs: 60 * 1000,
      prefix: 'orders',
    });
    if (rateLimitCheck.response) {
      return rateLimitCheck.response;
    }

    const currentUser = await getCurrentUser();
    const body = await req.json();
    const { items, customer, fulfillmentType, paymentMethod, dueDate } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Keranjang pesanan kosong' }, { status: 400 });
    }

    if (!customer?.name || !customer.name.trim()) {
      return NextResponse.json({ error: 'Nama pemesan wajib diisi' }, { status: 400 });
    }

    const isKasbon = paymentMethod === 'kasbon';
    if (isKasbon && (!customer?.phone || !customer.phone.trim())) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp / HP wajib diisi untuk pengajuan kasbon.' },
        { status: 400 }
      );
    }

    const umkmId = body?.umkmId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    const productIds = items.map((it: any) => it.productId || it.id).filter(Boolean);
    const { data: dbProducts, error: fetchErr } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('umkm_id', umkmId);

    if (fetchErr) {
      console.error('Error fetching products for order:', fetchErr);
      return NextResponse.json({ error: 'Gagal memverifikasi stok barang' }, { status: 500 });
    }

    const productMap = new Map<string, any>((dbProducts || []).map((p: any) => [p.id, p]));

    for (const item of items) {
      const pid = item.productId || item.id;
      const dbProd = productMap.get(pid);
      if (!dbProd) {
        return NextResponse.json(
          { error: `Produk dengan ID "${pid}" tidak ditemukan di database` },
          { status: 404 }
        );
      }
      const requiredQty = Math.max(1, Math.round(Number(item.quantity) || 1));
      if (Number(dbProd.stock) < requiredQty) {
        return NextResponse.json(
          { error: `Stok "${dbProd.name}" tidak mencukupi (sisa ${dbProd.stock} ${dbProd.unit || 'pcs'})` },
          { status: 400 }
        );
      }
    }

    // Gunakan harga resmi database (mencegah price tampering)
    const formattedItems = items.map((it: any) => {
      const pid = it.productId || it.id;
      const prod = productMap.get(pid)!;
      const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
      let officialPrice = Number(prod.price) || 0;
      if (prod.category === 'Tagihan & Pulsa' && Number(it.price) > 0) {
        officialPrice = Number(it.price);
      }
      return {
        productId: prod.id,
        name: it.name || prod.name || 'Produk Warung',
        quantity: qty,
        price: officialPrice,
        costPrice: prod.cost_price ?? 0,
        unit: it.unit || prod.unit || 'pcs',
        subtotal: officialPrice * qty,
      };
    });

    const totalAmount = formattedItems.reduce((sum, it) => sum + it.subtotal, 0);

    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderId = `ORD-${dateStr}-${randomHex}`;
    const nowIso = new Date().toISOString();

    if (isKasbon) {
      // Kasbon dari checkout menunggu persetujuan kasir terlebih dahulu (stok belum dipotong)
      const parsedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      if (isNaN(parsedDueDate.getTime())) {
        return NextResponse.json({ error: 'Tanggal rencana pelunasan tidak valid.' }, { status: 400 });
      }

      const debtId = crypto.randomUUID();
      const itemsSummary = formattedItems.map((it) => `${it.name} x${it.quantity}`).join(', ');
      const fulfillmentNote = fulfillmentType === 'delivery' ? 'Antar ke Rumah' : 'Ambil di Warung';
      const rawCustomerNote = (customer.note || customer.notes || '').trim();
      const debtNotes = `Kasbon Checkout (${fulfillmentNote}): ${itemsSummary}${
        rawCustomerNote ? ` • Catatan: ${rawCustomerNote}` : ''
      }`;

      // 1. Insert ke tabel debts lebih dulu agar foreign key transactions.debt_id valid
      const { error: debtErr } = await supabase.from('debts').insert([
        {
          id: debtId,
          umkm_id: umkmId,
          customer_name: customer.name.trim(),
          customer_phone: customer.phone.trim(),
          amount: totalAmount,
          paid_amount: 0,
          remaining_amount: totalAmount,
          due_date: parsedDueDate.toISOString(),
          type: 'BARANG',
          status: 'PENDING_APPROVAL',
          notes: debtNotes,
          related_trx_id: null,
          created_at: nowIso,
        },
      ]);

      if (debtErr) {
        console.error('Error inserting pending kasbon debt:', debtErr);
        return NextResponse.json({ error: 'Gagal mengirim pengajuan kasbon: ' + debtErr.message }, { status: 500 });
      }

      // 2. Insert ke tabel transactions dengan debt_id yang sudah terdaftar
      const { error: trxErr } = await supabase.from('transactions').insert([
        {
          id: orderId,
          umkm_id: umkmId,
          customer_id: currentUser?.id || null,
          type: 'IN',
          category: 'PESANAN_ONLINE',
          payment_method: 'CREDIT',
          payment_status: 'PENDING',
          total_amount: totalAmount,
          customer_name: customer.name.trim(),
          customer_phone: customer.phone.trim(),
          shipping_address:
            customer.address?.trim() || (fulfillmentType === 'delivery' ? 'Antar ke Rumah' : 'Ambil di Warung'),
          items: formattedItems,
          debt_id: debtId,
          transaction_date: nowIso,
          created_at: nowIso,
        },
      ]);

      if (trxErr) {
        console.error('Error inserting pending kasbon transaction:', trxErr);
        await supabase.from('debts').delete().eq('id', debtId);
        return NextResponse.json({ error: 'Gagal menyimpan pesanan kasbon: ' + trxErr.message }, { status: 500 });
      }

      // 3. Tautkan kembali related_trx_id ke baris debt terkait
      const { error: linkErr } = await supabase
        .from('debts')
        .update({ related_trx_id: orderId })
        .eq('id', debtId);

      if (linkErr) {
        console.warn('Warning linking related_trx_id on debt:', linkErr);
      }

      revalidatePath('/dashboard/pelanggan/kasbon');
      revalidatePath('/dashboard/pelanggan/struk');
      revalidatePath('/dashboard/penjual/piutang');

      return NextResponse.json(
        {
          success: true,
          isKasbon: true,
          orderId,
          debtId,
          totalAmount,
          customerName: customer.name.trim(),
          message: 'Pengajuan kasbon pesanan berhasil dikirim dan menunggu persetujuan kasir.',
        },
        { status: 201 }
      );
    }

    // Pesanan reguler (Tunai / QRIS): potong stok langsung dan catat transaksi
    for (const item of items) {
      const pid = item.productId || item.id;
      const dbProd = productMap.get(pid);
      if (dbProd) {
        const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
        const newStock = Math.max(0, Number(dbProd.stock) - qty);
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', dbProd.id)
          .eq('umkm_id', umkmId);
      }
    }

    const isCash = fulfillmentType === 'delivery' ? false : paymentMethod === 'cash';

    const { error: trxErr } = await supabase
      .from('transactions')
      .insert([
        {
          id: orderId,
          umkm_id: umkmId,
          customer_id: currentUser?.id || null,
          type: 'IN',
          category: 'PESANAN_ONLINE',
          payment_method: isCash ? 'CASH' : 'QRIS',
          payment_status: 'PENDING',
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
