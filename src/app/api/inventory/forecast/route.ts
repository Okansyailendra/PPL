import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedCashier } from '@/lib/auth';
import { evaluateRestockRule, extractProductSalesPeriods } from '@/lib/stock-algorithm';
import type { Product, Transaction } from '@/types';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized. Silakan login kasir terlebih dahulu.' },
    { status: 401 }
  );
}

/**
 * GET /api/inventory/forecast
 * [ALGO-1] Menghitung Moving Average 3 Periode & Rule-Based Restock Alert
 * untuk seluruh produk di inventaris warung.
 */
export async function GET(req: Request) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  try {
    // 1. Ambil data produk dan transaksi UMKM
    const [prodRes, trxRes] = await Promise.all([
      supabase.from('products').select('*').eq('umkm_id', user.id).order('name', { ascending: true }),
      supabase.from('transactions').select('*').eq('umkm_id', user.id).order('created_at', { ascending: false }).limit(200),
    ]);

    if (prodRes.error) {
      return NextResponse.json({ error: prodRes.error.message }, { status: 500 });
    }

    const products = (prodRes.data || []) as Product[];
    const transactions = (trxRes.data || []) as Transaction[];

    // 2. Evaluasi algoritma per produk
    const analyses = products.map((product) => {
      // Ekstrak penjualan 3 periode historis (3 x 7 hari)
      const salesPeriods = extractProductSalesPeriods(transactions, product.id, 3, 7);
      // Fallback jika belum ada transaksi untuk produk ini: gunakan estimasi logis berbasis min_stock
      const hasSales = salesPeriods.some((qty) => qty > 0);
      const fallbackPeriods = [
        Math.max(1, Math.round(product.min_stock * 0.8)),
        Math.max(1, product.min_stock),
        Math.max(1, Math.round(product.min_stock * 1.2)),
      ];
      const activePeriods = hasSales ? salesPeriods : fallbackPeriods;

      return evaluateRestockRule(product, activePeriods, 3);
    });

    const criticalItems = analyses.filter((a) => a.alertLevel === 'CRITICAL');
    const lowItems = analyses.filter((a) => a.alertLevel === 'LOW');
    const safeItems = analyses.filter((a) => a.alertLevel === 'SAFE');

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProducts: products.length,
          criticalCount: criticalItems.length,
          lowCount: lowItems.length,
          safeCount: safeItems.length,
        },
        analyses,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

