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
          error: 'Unauthorized. Silakan masuk terlebih dahulu untuk melihat riwayat transaksi.',
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim() || '';
    const search = searchParams.get('search')?.trim() || '';
    const isSeller = currentUser.role === 'penjual' || currentUser.role === 'admin';

    // Jika mencari 1 ID struk spesifik, wajib terikat pada kepemilikan user (atau umkm_id bagi penjual)
    if (id) {
      const { data: trx, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !trx) {
        return NextResponse.json(
          { success: false, error: 'Struk transaksi tidak ditemukan' },
          { status: 404 }
        );
      }

      const isAuthorized = isSeller
        ? trx.umkm_id === currentUser.id
        : trx.customer_id === currentUser.id;

      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, error: 'Forbidden. Anda tidak memiliki akses ke struk transaksi ini.' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        transaction: trx,
      });
    }

    const query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (isSeller) {
      query.eq('umkm_id', currentUser.id);
    } else {
      query.eq('customer_id', currentUser.id);
    }

    const { data: allTrx, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { success: false, error: 'Gagal mengambil riwayat transaksi' },
        { status: 500 }
      );
    }

    const trxList = (allTrx || []).filter((t: any) => t.category !== 'SCAN_STRUK_PELANGGAN');
    let filtered = trxList;

    if (search) {
      const term = search.toLowerCase();
      filtered = trxList.filter((t: any) => {
        const matchId = t.id?.toLowerCase().includes(term);
        const matchName = t.customer_name?.toLowerCase().includes(term);
        const matchPhone = t.customer_phone?.toLowerCase().includes(term);
        return matchId || matchName || matchPhone;
      });
    }

    return NextResponse.json({
      success: true,
      transactions: filtered,
      requireLogin: false,
    });
  } catch (err: any) {
    console.error('Error in /api/customer/transactions:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
