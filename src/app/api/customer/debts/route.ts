import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const phone = searchParams.get('phone')?.trim() || '';

    const currentUser = await getCurrentUser();

    // Default warung UMKM ID
    const defaultUmkmId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    // Ambil data debts dari Supabase / MySQL
    const query = supabase
      .from('debts')
      .select('*')
      .order('created_at', { ascending: false });

    // Jika penjual/admin yang sedang login, batasi ke warungnya
    if (currentUser && (currentUser.role === 'penjual' || currentUser.role === 'admin')) {
      query.eq('umkm_id', currentUser.id);
    } else {
      query.eq('umkm_id', defaultUmkmId);
    }

    const { data: allDebts, error } = await query;

    if (error) {
      console.error('Error querying customer debts:', error);
      return NextResponse.json(
        { success: false, error: 'Gagal mengambil catatan kasbon' },
        { status: 500 }
      );
    }

    const debtsList = allDebts || [];

    // Filter berdasarkan kondisi
    let filtered = debtsList;

    if (search || phone) {
      const term = (search || phone).toLowerCase();
      filtered = filtered.filter((d) => {
        const matchName = d.customer_name?.toLowerCase().includes(term);
        const matchPhone = d.customer_phone?.toLowerCase().includes(term);
        const matchNotes = d.notes?.toLowerCase().includes(term);
        return matchName || matchPhone || matchNotes;
      });
    } else if (currentUser && (currentUser.role === 'penjual' || currentUser.role === 'admin')) {
      // Jika akun penjual/admin membuka etalase pelanggan, tampilkan semua kasbon toko untuk preview
      filtered = debtsList;
    } else if (currentUser) {
      // Jika user login tanpa filter manual, cari berdasarkan nomor telepon atau nama
      const userPhone = currentUser.phone_number?.trim();
      const userName = currentUser.owner_name?.trim().toLowerCase();

      filtered = filtered.filter((d) => {
        const debtPhone = d.customer_phone?.trim();
        const debtName = d.customer_name?.trim().toLowerCase();

        const matchPhone = userPhone && debtPhone && (userPhone === debtPhone || debtPhone.endsWith(userPhone.slice(-8)));
        const matchName = userName && debtName && (debtName.includes(userName) || userName.includes(debtName));

        return Boolean(matchPhone || matchName);
      });
    } else {
      // Tidak login dan tidak ada parameter pencarian
      return NextResponse.json({
        success: true,
        debts: [],
        requireLogin: true,
        summary: { totalRemaining: 0, totalPaid: 0, count: 0 },
      });
    }

    // Hitung ringkasan kasbon
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
      requireLogin: !currentUser && !search && !phone,
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
