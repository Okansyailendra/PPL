import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return NextResponse.json(
        {
          success: false,
          requireLogin: true,
          error: 'Unauthorized. Silakan masuk terlebih dahulu untuk melihat catatan kasbon.',
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const phone = searchParams.get('phone')?.trim() || '';
    const isSeller = currentUser.role === 'penjual' || currentUser.role === 'admin';

    let debtsList: any[] = [];

    if (isSeller) {
      const { data: allDebts, error } = await supabase
        .from('debts')
        .select('*')
        .eq('umkm_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error querying seller debts:', error);
        return NextResponse.json(
          { success: false, error: 'Gagal mengambil catatan kasbon' },
          { status: 500 }
        );
      }
      debtsList = allDebts || [];
    } else {
      // Untuk pelanggan, ikat akses kasbon secara ketat pada transaksi milik currentUser.id
      const { data: userTrx, error: trxErr } = await supabase
        .from('transactions')
        .select('id, debt_id')
        .eq('customer_id', currentUser.id);

      if (trxErr) {
        console.error('Error querying customer transactions for debts:', trxErr);
        return NextResponse.json(
          { success: false, error: 'Gagal mengambil catatan kasbon' },
          { status: 500 }
        );
      }

      const ownedTrxIds = (userTrx || []).map((t: any) => t.id).filter(Boolean);
      const ownedDebtIds = (userTrx || []).map((t: any) => t.debt_id).filter(Boolean);

      if (ownedTrxIds.length > 0 || ownedDebtIds.length > 0) {
        const [byDebtIdRes, byRelatedTrxRes] = await Promise.all([
          ownedDebtIds.length > 0
            ? supabase
                .from('debts')
                .select('*')
                .in('id', ownedDebtIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          ownedTrxIds.length > 0
            ? supabase
                .from('debts')
                .select('*')
                .in('related_trx_id', ownedTrxIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (byDebtIdRes.error || byRelatedTrxRes.error) {
          console.error('Error querying customer debts:', byDebtIdRes.error || byRelatedTrxRes.error);
          return NextResponse.json(
            { success: false, error: 'Gagal mengambil catatan kasbon' },
            { status: 500 }
          );
        }

        const merged = new Map<string, any>();
        for (const d of [...(byDebtIdRes.data || []), ...(byRelatedTrxRes.data || [])]) {
          if (d?.id) merged.set(d.id, d);
        }
        debtsList = Array.from(merged.values()).sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
      }
    }

    // Filter pencarian hanya menyaring di dalam data yang memang milik user aktif
    let filtered = debtsList;
    if (search || phone) {
      const term = (search || phone).toLowerCase();
      filtered = debtsList.filter((d) => {
        const matchName = d.customer_name?.toLowerCase().includes(term);
        const matchPhone = d.customer_phone?.toLowerCase().includes(term);
        const matchNotes = d.notes?.toLowerCase().includes(term);
        return matchName || matchPhone || matchNotes;
      });
    }

    const totalRemaining = filtered.reduce((acc, curr) => {
      if (curr.status === 'UNPAID' || curr.status === 'PARTIAL') {
        const rem = Number(curr.remaining_amount ?? (curr.amount - (curr.paid_amount || 0)));
        return acc + rem;
      }
      return acc;
    }, 0);

    const totalPending = filtered.reduce((acc, curr) => {
      if (curr.status === 'PENDING_APPROVAL') {
        return acc + Number(curr.amount || 0);
      }
      return acc;
    }, 0);

    const pendingCount = filtered.filter((d) => d.status === 'PENDING_APPROVAL').length;

    const totalPaid = filtered.reduce((acc, curr) => {
      if (curr.status === 'PAID') return acc + Number(curr.amount || 0);
      return acc + Number(curr.paid_amount || 0);
    }, 0);

    let paymentLogs: any[] = [];
    if (filtered.length > 0) {
      const debtIds = filtered.map((d) => d.id);
      const { data: logs } = await supabase
        .from('payment_logs')
        .select('*')
        .in('debt_id', debtIds)
        .order('payment_date', { ascending: false });
      if (logs) paymentLogs = logs;
    }

    return NextResponse.json({
      success: true,
      debts: filtered,
      paymentLogs,
      requireLogin: false,
      summary: {
        totalRemaining,
        totalPending,
        pendingCount,
        totalPaid,
        count: filtered.length,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/customer/debts:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
