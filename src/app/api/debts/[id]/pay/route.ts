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
 * POST /api/debts/[id]/pay
 * [Zaki] API pencatatan pembayaran kasbon (cicil sebagian atau bayar lunas).
 * Body: { amount_paid, payment_method: 'CASH'|'QRIS'|'TRANSFER', notes?: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  try {
    const { id: debtId } = await params;
    if (!debtId) {
      return NextResponse.json({ error: 'Debt ID required' }, { status: 400 });
    }

    const body = await req.json();
    const amountPaid = Number(body.amount_paid);
    const paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER' =
      body.payment_method === 'QRIS' || body.payment_method === 'TRANSFER'
        ? body.payment_method
        : 'CASH';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : null;

    if (isNaN(amountPaid) || amountPaid <= 0) {
      return NextResponse.json({ error: 'Nominal pembayaran valid (>0) wajib diisi.' }, { status: 400 });
    }

    // 1. Ambil data kasbon
    const { data: debt, error: fetchErr } = await supabase
      .from('debts')
      .select('*')
      .eq('id', debtId)
      .eq('umkm_id', user.id)
      .single();

    if (fetchErr || !debt) {
      return NextResponse.json({ error: 'Data kasbon tidak ditemukan.' }, { status: 404 });
    }

    const totalAmount = Number(debt.amount) || 0;
    const currentPaid = Number(debt.paid_amount) || 0;
    const remainingBefore = Number(debt.remaining_amount ?? (totalAmount - currentPaid));

    if (remainingBefore <= 0) {
      return NextResponse.json({ error: 'Kasbon ini sudah lunas sebelumnya.' }, { status: 400 });
    }

    const newPaidAmount = currentPaid + amountPaid;
    const newRemaining = Math.max(0, totalAmount - newPaidAmount);
    const newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' =
      newRemaining <= 0 ? 'PAID' : 'PARTIAL';

    const now = new Date().toISOString();

    // 2. Update data debts
    const { error: updateErr } = await supabase
      .from('debts')
      .update({
        paid_amount: newPaidAmount,
        remaining_amount: newRemaining,
        status: newStatus,
        updated_at: now,
      })
      .eq('id', debtId)
      .eq('umkm_id', user.id);

    if (updateErr) {
      return NextResponse.json({ error: 'Gagal memperbarui kasbon: ' + updateErr.message }, { status: 500 });
    }

    // 3. Catat ke payment_logs
    const logId = 'log-' + crypto.randomUUID();
    await supabase.from('payment_logs').insert([
      {
        id: logId,
        debt_id: debtId,
        umkm_id: user.id,
        amount_paid: amountPaid,
        payment_method: paymentMethod,
        notes,
        payment_date: now,
        created_at: now,
      }
    ]);

    // 4. Catat transaksi pemasukan kas (IN)
    await supabase.from('transactions').insert([
      {
        umkm_id: user.id,
        type: 'IN',
        category: newStatus === 'PAID' ? 'PELUNASAN_KASBON' : 'CICILAN_KASBON',
        payment_method: paymentMethod,
        payment_status: 'PAID',
        total_amount: amountPaid,
        items: [
          {
            name: `${newStatus === 'PAID' ? 'Pelunasan' : 'Cicilan'} Kasbon: ${debt.customer_name}`,
            quantity: 1,
            price: amountPaid,
            subtotal: amountPaid,
          }
        ],
        debt_id: debtId,
        transaction_date: now,
        created_at: now,
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        debt_id: debtId,
        amount_paid: amountPaid,
        new_paid_total: newPaidAmount,
        remaining_amount: newRemaining,
        status: newStatus,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/debts/[id]/pay
 * Mengambil histori pembayaran (payment_logs)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  try {
    const { id: debtId } = await params;
    const { data: logs, error } = await supabase
      .from('payment_logs')
      .select('*')
      .eq('debt_id', debtId)
      .eq('umkm_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: logs || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

