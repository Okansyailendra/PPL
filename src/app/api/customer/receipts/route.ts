import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import type { CustomerScannedReceipt, ScannedReceiptItem } from '@/types';

export const dynamic = 'force-dynamic';

const SCAN_CATEGORY = 'SCAN_STRUK_PELANGGAN';
const ALLOWED_PAYMENT_METHODS = ['CASH', 'QRIS', 'TRANSFER', 'CREDIT', 'ONLINE'] as const;

function parseItemsField(rawItems: any): ScannedReceiptItem[] {
  let list = rawItems;
  if (typeof rawItems === 'string') {
    try {
      list = JSON.parse(rawItems);
    } catch {
      list = [];
    }
  }
  if (!Array.isArray(list)) return [];

  return list.map((it: any) => {
    const quantity = Math.max(1, Math.round(Number(it?.quantity) || 1));
    const price = Math.max(0, Math.round(Number(it?.price) || 0));
    const subtotal = Math.max(0, Math.round(Number(it?.subtotal) || price * quantity));
    return {
      name: String(it?.name || 'Barang Belanja').trim(),
      quantity,
      unit: String(it?.unit || 'pcs').trim() || 'pcs',
      price,
      subtotal,
    };
  });
}

function mapTransactionToReceipt(row: any): CustomerScannedReceipt {
  return {
    id: row.id,
    store_name: row.courier || 'Toko / Warung',
    purchase_date: row.transaction_date || row.created_at,
    payment_method: row.payment_method || 'CASH',
    total_amount: Number(row.total_amount || 0),
    items: parseItemsField(row.items),
    notes: row.shipping_address || null,
    created_at: row.created_at,
  };
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({
        success: true,
        receipts: [],
        requireLogin: true,
      });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('category', SCAN_CATEGORY)
      .eq('customer_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching scanned receipts:', error);
      return NextResponse.json(
        { success: false, error: 'Gagal memuat data struk hasil scan.' },
        { status: 500 }
      );
    }

    let receipts = (data || []).map(mapTransactionToReceipt);

    if (search) {
      receipts = receipts.filter((r: CustomerScannedReceipt) => {
        const matchId = r.id.toLowerCase().includes(search);
        const matchStore = r.store_name.toLowerCase().includes(search);
        const matchNotes = (r.notes || '').toLowerCase().includes(search);
        const matchDate = (r.purchase_date || '').toLowerCase().includes(search);
        const matchItem = r.items.some((it) => it.name.toLowerCase().includes(search));
        return matchId || matchStore || matchNotes || matchDate || matchItem;
      });
    }

    return NextResponse.json({
      success: true,
      receipts,
      requireLogin: false,
    });
  } catch (err: any) {
    console.error('Error in GET /api/customer/receipts:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Terjadi kesalahan sistem.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Silakan masuk terlebih dahulu untuk menyimpan struk ke data pelanggan.' },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Format data tidak valid.' },
        { status: 400 }
      );
    }

    const storeName = String(body?.storeName || 'Toko / Warung').trim().slice(0, 150) || 'Toko / Warung';
    const notes = String(body?.notes || '').trim().slice(0, 500) || null;
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    const normalizedItems: ScannedReceiptItem[] = rawItems
      .filter((it: any) => it && String(it.name || '').trim().length > 0)
      .map((it: any) => {
        const quantity = Math.max(1, Math.round(Number(it.quantity) || 1));
        const price = Math.max(0, Math.round(Number(it.price) || 0));
        const subtotal =
          Number(it.subtotal) > 0 ? Math.round(Number(it.subtotal)) : price * quantity;
        return {
          name: String(it.name).trim(),
          quantity,
          unit: String(it.unit || 'pcs').trim() || 'pcs',
          price,
          subtotal,
        };
      });

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Minimal harus ada 1 barang belanjaan pada struk.' },
        { status: 400 }
      );
    }

    const itemsTotal = normalizedItems.reduce((sum, it) => sum + it.subtotal, 0);
    const parsedTotal = Math.round(Number(body?.totalAmount) || 0);
    const totalAmount = parsedTotal > 0 ? parsedTotal : itemsTotal;

    if (totalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Total harga belanja harus lebih dari Rp 0.' },
        { status: 400 }
      );
    }

    const rawMethod = String(body?.paymentMethod || 'CASH').toUpperCase();
    const paymentMethod = (ALLOWED_PAYMENT_METHODS as readonly string[]).includes(rawMethod)
      ? (rawMethod as (typeof ALLOWED_PAYMENT_METHODS)[number])
      : 'CASH';

    let purchaseDateIso = new Date().toISOString();
    if (body?.purchaseDate) {
      const parsedDate = new Date(String(body.purchaseDate));
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Format tanggal belanja tidak valid.' },
          { status: 400 }
        );
      }
      purchaseDateIso = parsedDate.toISOString();
    }

    const nowIso = new Date().toISOString();
    const datePrefix = purchaseDateIso.slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    const receiptId = `STRUK-${datePrefix}-${randomHex}`;

    const insertPayload = {
      id: receiptId,
      umkm_id: user.id,
      customer_id: user.id,
      customer_name: user.owner_name || user.email || 'Pelanggan Wadira',
      customer_phone: user.phone_number || null,
      type: 'OUT',
      category: SCAN_CATEGORY,
      payment_method: paymentMethod,
      payment_status: 'PAID',
      total_amount: totalAmount,
      courier: storeName,
      shipping_address: notes,
      items: normalizedItems,
      transaction_date: purchaseDateIso,
      created_at: nowIso,
    };

    const { error } = await supabase.from('transactions').insert([insertPayload]);

    if (error) {
      console.error('Error saving scanned customer receipt:', error);
      return NextResponse.json(
        { success: false, error: 'Gagal menyimpan data struk: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        receipt: mapTransactionToReceipt(insertPayload),
        message: 'Data struk belanja berhasil disimpan ke akun pelanggan Anda.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error in POST /api/customer/receipts:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Terjadi kesalahan sistem.' },
      { status: 500 }
    );
  }
}
