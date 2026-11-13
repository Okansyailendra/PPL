import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedCashier } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized. Silakan login kasir terlebih dahulu.' },
    { status: 401 }
  );
}

/**
 * GET /api/debts
 * Mengambil daftar kasbon/piutang warung
 * Query opsional: ?status=UNPAID|PARTIAL|PAID, ?type=BARANG|PINJAMAN_TUNAI, ?search=...
 */
export async function GET(req: Request) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status')?.toUpperCase();
  const typeParam = url.searchParams.get('type')?.toUpperCase();
  const search = url.searchParams.get('search')?.trim().toLowerCase();

  let query = supabase
    .from('debts')
    .select('*')
    .eq('umkm_id', user.id)
    .order('created_at', { ascending: false });

  if (statusParam) {
    query = query.eq('status', statusParam);
  }
  if (typeParam) {
    query = query.eq('type', typeParam);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'Gagal mengambil data kasbon: ' + error.message }, { status: 500 });
  }

  let debts = data || [];
  if (search) {
    debts = debts.filter((d: any) =>
      String(d.customer_name || '').toLowerCase().includes(search) ||
      String(d.customer_phone || '').includes(search)
    );
  }

  return NextResponse.json({
    success: true,
    data: debts,
    total: debts.length,
  });
}

/**
 * POST /api/debts
 * [DEL-5] Mencatat kasbon baru (Barang atau Pinjaman Uang Tunai)
 */
export async function POST(req: Request) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const customer_name = typeof body.customer_name === 'string' ? body.customer_name.trim() : '';
    const customer_phone = typeof body.customer_phone === 'string' ? body.customer_phone.trim() : null;
    const amount = Number(body.amount);
    const due_date = body.due_date;
    const type: 'BARANG' | 'PINJAMAN_TUNAI' = body.type === 'PINJAMAN_TUNAI' ? 'PINJAMAN_TUNAI' : 'BARANG';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : null;

    if (!customer_name || isNaN(amount) || amount <= 0 || !due_date) {
      return NextResponse.json(
        { error: 'Nama pelanggan, nominal utang valid (>0), dan tanggal jatuh tempo wajib diisi.' },
        { status: 400 }
      );
    }

    const debtId = 'debt-' + crypto.randomUUID();
    const now = new Date().toISOString();

    const { error: debtErr } = await supabase
      .from('debts')
      .insert([
        {
          id: debtId,
          umkm_id: user.id,
          customer_name,
          customer_phone,
          amount,
          paid_amount: 0,
          remaining_amount: amount,
          due_date: new Date(due_date).toISOString(),
          type,
          status: 'UNPAID',
          notes,
          created_at: now,
          updated_at: now,
        }
      ]);

    if (debtErr) {
      return NextResponse.json({ error: 'Gagal menyimpan kasbon: ' + debtErr.message }, { status: 500 });
    }

    // Jika pinjaman tunai, catat transaksi pengeluaran di buku kas
    if (type === 'PINJAMAN_TUNAI') {
      await supabase.from('transactions').insert([
        {
          umkm_id: user.id,
          type: 'OUT',
          category: 'PINJAMAN_KASBON',
          payment_method: 'CASH',
          payment_status: 'PAID',
          total_amount: amount,
          items: [{ name: `Pinjaman Tunai: ${customer_name}`, quantity: 1, price: amount, subtotal: amount }],
          debt_id: debtId,
          transaction_date: now,
          created_at: now,
        }
      ]);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: debtId,
        customer_name,
        amount,
        remaining_amount: amount,
        type,
        status: 'UNPAID',
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Bad Request' }, { status: 400 });
  }
}

