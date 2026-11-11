import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedCashier } from '@/lib/auth';

function unauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized. Silakan login kasir terlebih dahulu.' },
    { status: 401 }
  );
}

/**
 * GET /api/transactions
 * Mengambil riwayat transaksi kasir milik toko yang login.
 */
export async function GET(req: Request) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get('limit') || '50');
  const limit = isNaN(limitParam) ? 50 : Math.min(Math.max(1, limitParam), 200);

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('umkm_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { error: 'Gagal mengambil data transaksi: ' + error.message },
      { status: 500 }
    );
  }

  const normalized = (data || []).map((t: any) => ({
    ...t,
    items: typeof t.items === 'string' ? JSON.parse(t.items) : t.items || [],
  }));

  return NextResponse.json({
    success: true,
    data: normalized,
  });
}

/**
 * POST /api/transactions
 * Menyimpan transaksi kasir (detail item terjual, total harga, metode bayar Cash/QRIS/Credit, status pembayaran).
 */
export async function POST(req: Request) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const rawMethod = String(body?.payment_method || body?.paymentMethod || 'CASH').toUpperCase();

    if (!['CASH', 'QRIS', 'CREDIT'].includes(rawMethod)) {
      return NextResponse.json(
        { error: 'Metode pembayaran tidak valid. Gunakan CASH, QRIS, atau CREDIT.' },
        { status: 400 }
      );
    }

    const paymentMethod = rawMethod as 'CASH' | 'QRIS' | 'CREDIT';

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'Detail item transaksi tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const productIds = items.map((it: any) => it.productId || it.product_id).filter(Boolean);
    if (productIds.length !== items.length) {
      return NextResponse.json(
        { error: 'Setiap item wajib memiliki productId.' },
        { status: 400 }
      );
    }

    const { data: dbProducts, error: fetchErr } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('umkm_id', user.id);

    if (fetchErr || !dbProducts) {
      return NextResponse.json(
        { error: 'Gagal memverifikasi produk dari database.' },
        { status: 500 }
      );
    }

    const productMap = new Map((dbProducts as any[]).map((p: any) => [p.id, p]));
    const normalizedItems: any[] = [];

    for (const item of items) {
      const pid = item.productId || item.product_id;
      const qty = Number(item.quantity);
      const prod = productMap.get(pid);

      if (!prod) {
        return NextResponse.json(
          { error: `Produk dengan ID "${pid}" tidak ditemukan.` },
          { status: 404 }
        );
      }
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json(
          { error: `Jumlah item "${prod.name}" harus lebih dari 0.` },
          { status: 400 }
        );
      }
      if (prod.stock < qty) {
        return NextResponse.json(
          { error: `Stok "${prod.name}" tidak mencukupi (tersisa ${prod.stock} ${prod.unit}).` },
          { status: 400 }
        );
      }

      const unitPrice = item.price !== undefined ? Number(item.price) : Number(prod.price);
      normalizedItems.push({
        productId: prod.id,
        name: prod.name,
        quantity: qty,
        price: unitPrice,
        costPrice: prod.cost_price ?? 0,
        unit: prod.unit || 'pcs',
        subtotal: qty * unitPrice,
      });
    }

    const totalAmount = normalizedItems.reduce((sum, it) => sum + it.subtotal, 0);

    // Kurangi stok
    for (const it of normalizedItems) {
      const prod = productMap.get(it.productId)!;
      const newStock = Math.max(0, prod.stock - it.quantity);
      const { error: stockErr } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', prod.id)
        .eq('umkm_id', user.id);

      if (stockErr) {
        return NextResponse.json(
          { error: `Gagal memperbarui stok "${prod.name}".` },
          { status: 500 }
        );
      }
    }

    let debtId: string | null = null;
    if (paymentMethod === 'CREDIT') {
      const customerName = String(body?.customer_name || body?.customerName || '').trim();
      if (!customerName) {
        return NextResponse.json(
          { error: 'Nama pelanggan wajib diisi untuk transaksi CREDIT/Kasbon.' },
          { status: 400 }
        );
      }
      const dueDate = body?.due_date || body?.dueDate
        ? new Date(body.due_date || body.dueDate).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: debtRow } = await supabase
        .from('debts')
        .insert([
          {
            id: crypto.randomUUID(),
            umkm_id: user.id,
            customer_name: customerName,
            customer_phone: body?.customer_phone || body?.customerPhone || null,
            amount: totalAmount,
            due_date: dueDate,
            status: 'UNPAID',
          },
        ])
        .select('id')
        .single();

      if (debtRow?.id) debtId = debtRow.id;
    }

    const requestedStatus = String(body?.payment_status || body?.paymentStatus || '').toUpperCase();
    const paymentStatus =
      paymentMethod === 'CREDIT'
        ? 'UNPAID'
        : paymentMethod === 'QRIS' && requestedStatus === 'PENDING'
        ? 'PENDING'
        : 'PAID';

    const trxId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const trxRecord = {
      id: trxId,
      umkm_id: user.id,
      type: 'IN',
      category: 'PENJUALAN',
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      total_amount: totalAmount,
      items: normalizedItems,
      debt_id: debtId,
      transaction_date: nowIso,
      created_at: nowIso,
    };

    const { error: trxErr } = await supabase
      .from('transactions')
      .insert([trxRecord]);

    if (trxErr) {
      return NextResponse.json(
        { error: 'Gagal menyimpan transaksi: ' + trxErr.message },
        { status: 500 }
      );
    }

    if (debtId) {
      await supabase
        .from('debts')
        .update({ related_trx_id: trxId })
        .eq('id', debtId);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Transaksi kasir berhasil disimpan.',
        data: trxRecord,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Payload JSON tidak valid: ' + (err?.message || 'Bad Request') },
      { status: 400 }
    );
  }
}

