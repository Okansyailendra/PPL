import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedCashier } from '@/lib/auth';
import {
  generateFinancialSummary,
  filterTransactionsByDateRange,
  type TransactionRecord,
} from '@/lib/financial-analytics';
import type { Product, Debt } from '@/types';

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      error: 'Unauthorized: Sesi kasir/UMKM tidak ditemukan. Silakan login terlebih dahulu.',
    },
    { status: 401 }
  );
}

/**
 * ============================================================================
 * [ZAKI - TASK-79 / TASK-117] DATA ANALYTICS & FINANCIAL SUMMARY ENDPOINT
 * GET /api/reports/financial-summary
 * ============================================================================
 * Menghitung:
 * 1. Omset Kotor (Gross Revenue)
 * 2. COGS (Cost of Goods Sold / HPP) per transaksi & per item
 * 3. Gross Profit (Laba Kotor) & Margin
 * 4. Biaya Operasional & Net Profit (Laba Bersih)
 * 5. Outstanding Receivables (Piutang Kasbon Belum Tertagih)
 * 6. Rekapitulasi Arus Kas Riil (Cash Basis Inflows & Outflows)
 * 7. Tren Analitik Harian & Ranking Produk Paling Menguntungkan
 * ============================================================================
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedCashier(req);
    if (!user?.id) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const periodParam = (searchParams.get('period') || 'this_month').toLowerCase();
    const customStart = searchParams.get('start_date');
    const customEnd = searchParams.get('end_date');

    // Menentukan rentang tanggal otomatis berdasarkan query period
    let startDate: string | null = null;
    let endDate: string | null = null;
    let periodName = 'Bulan Ini';

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    switch (periodParam) {
      case 'today': {
        const todayStr = now.toISOString().slice(0, 10);
        startDate = todayStr;
        endDate = todayStr;
        periodName = 'Hari Ini';
        break;
      }
      case 'this_week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Senin
        const monday = new Date(now.setDate(diff));
        startDate = monday.toISOString().slice(0, 10);
        endDate = new Date().toISOString().slice(0, 10);
        periodName = 'Minggu Ini';
        break;
      }
      case 'this_month': {
        startDate = new Date(currentYear, currentMonth, 1).toISOString().slice(0, 10);
        endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().slice(0, 10);
        periodName = 'Bulan Ini';
        break;
      }
      case 'last_month': {
        startDate = new Date(currentYear, currentMonth - 1, 1).toISOString().slice(0, 10);
        endDate = new Date(currentYear, currentMonth, 0).toISOString().slice(0, 10);
        periodName = 'Bulan Lalu';
        break;
      }
      case 'last_3_months': {
        startDate = new Date(currentYear, currentMonth - 2, 1).toISOString().slice(0, 10);
        endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().slice(0, 10);
        periodName = '3 Bulan Terakhir';
        break;
      }
      case 'year_to_date': {
        startDate = new Date(currentYear, 0, 1).toISOString().slice(0, 10);
        endDate = new Date().toISOString().slice(0, 10);
        periodName = 'Tahun Berjalan (YTD)';
        break;
      }
      case 'custom': {
        startDate = customStart || null;
        endDate = customEnd || null;
        periodName = `Kustom (${startDate || 'Awal'} s/d ${endDate || 'Sekarang'})`;
        break;
      }
      case 'all': {
        startDate = null;
        endDate = null;
        periodName = 'Semua Waktu';
        break;
      }
      default: {
        startDate = new Date(currentYear, currentMonth, 1).toISOString().slice(0, 10);
        endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().slice(0, 10);
        periodName = 'Bulan Ini';
      }
    }

    // Eksekusi paralel pembacaan data transaksi, produk, dan kasbon/piutang
    const [trxRes, prodRes, debtRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('umkm_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('products')
        .select('id, name, price, cost_price, unit, stock, category')
        .eq('umkm_id', user.id),
      supabase
        .from('debts')
        .select('*')
        .eq('umkm_id', user.id),
    ]);

    if (trxRes.error) {
      console.error('Error fetching transactions for analytics:', trxRes.error);
      return NextResponse.json(
        { success: false, error: 'Gagal membaca riwayat transaksi: ' + trxRes.error.message },
        { status: 500 }
      );
    }

    const allTransactions = ((trxRes.data || []) as TransactionRecord[]).filter(
      (t) => t.category !== 'SCAN_STRUK_PELANGGAN'
    );
    const allProducts = (prodRes.data || []) as Product[];
    const allDebts = (debtRes.data || []) as Debt[];

    // Saring transaksi berdasarkan rentang tanggal aktif
    const filteredTrx = filterTransactionsByDateRange(allTransactions, startDate, endDate);

    // Jalankan mesin kalkulasi analitik finansial
    const summaryResult = generateFinancialSummary(
      filteredTrx,
      allDebts,
      allProducts,
      {
        name: periodName,
        start_date: startDate,
        end_date: endDate,
      }
    );

    return NextResponse.json({
      success: true,
      meta: {
        store_id: user.id,
        store_name: user.store_name || 'Toko Wadira',
        generated_at: new Date().toISOString(),
        total_transactions_in_period: filteredTrx.length,
      },
      data: summaryResult,
    });
  } catch (error: any) {
    console.error('Unhandled error in financial-summary endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan server internal pada kalkulasi analytics: ' + (error?.message || error),
      },
      { status: 500 }
    );
  }
}
