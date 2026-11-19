import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim() || '';
    const search = searchParams.get('search')?.trim() || '';

    const currentUser = await getCurrentUser();
    const defaultUmkmId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    // Jika mencari 1 ID struk spesifik
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

      return NextResponse.json({
        success: true,
        transaction: trx,
      });
    }

    // Ambil daftar transaksi
    const query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (currentUser && (currentUser.role === 'penjual' || currentUser.role === 'admin')) {
      query.eq('umkm_id', currentUser.id);
    } else {
      query.eq('umkm_id', defaultUmkmId);
    }

    const { data: allTrx, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { success: false, error: 'Gagal mengambil riwayat transaksi' },
        { status: 500 }
      );
    }

    const trxList = allTrx || [];
    let filtered = trxList;

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter((t) => {
        const matchId = t.id?.toLowerCase().includes(term);
        const matchName = t.customer_name?.toLowerCase().includes(term);
        const matchPhone = t.customer_phone?.toLowerCase().includes(term);
        return matchId || matchName || matchPhone;
      });
    } else if (currentUser && (currentUser.role === 'penjual' || currentUser.role === 'admin')) {
      // Jika akun penjual/admin membuka etalase pelanggan, tampilkan semua transaksi toko
      filtered = trxList;
    } else if (currentUser) {
      const userPhone = currentUser.phone_number?.trim();
      const userName = currentUser.owner_name?.trim().toLowerCase();

      filtered = filtered.filter((t) => {
        const trxPhone = t.customer_phone?.trim();
        const trxName = t.customer_name?.trim().toLowerCase();

        const matchPhone = userPhone && trxPhone && (userPhone === trxPhone || trxPhone.endsWith(userPhone.slice(-8)));
        const matchName = userName && trxName && (trxName.includes(userName) || userName.includes(trxName));

        return Boolean(matchPhone || matchName);
      });
    } else {
      return NextResponse.json({
        success: true,
        transactions: [],
        requireLogin: true,
      });
    }

    return NextResponse.json({
      success: true,
      transactions: filtered,
      requireLogin: !currentUser && !search,
    });
  } catch (err: any) {
    console.error('Error in /api/customer/transactions:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
