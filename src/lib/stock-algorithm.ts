/**
 * [ALGO-1] Komponen Komputasional Stok Warung:
 * 1. Simple Moving Average (SMA) 3 Periode untuk Peramalan Kecepatan Penjualan
 * 2. Rule-Based Restock Alert & Estimasi Hari Stok Habis (Runout Days)
 */

import type { Product, Transaction } from '@/types';

export interface SalesPeriod {
  periodLabel: string;
  quantitySold: number;
}

export interface RestockAnalysis {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  unit: string;
  // Komponen Moving Average
  movingAveragePeriod: number;
  periodsSales: number[];
  movingAverageDailySales: number;
  movingAveragePeriodSales: number;
  // Komponen Rule-Based Alert
  alertLevel: 'CRITICAL' | 'LOW' | 'SAFE' | 'OVERSTOCKED';
  alertMessage: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  runoutDays: number; // perkiraan sisa hari sebelum stok habis
  recommendedRestockQty: number; // saran kuantitas kulakan
}

/**
 * Menghitung Simple Moving Average (SMA) dari deret data historis N periode terakhir
 * Formula: SMA = (Sum of X_i) / N
 */
export function calculateMovingAverage(dataPoints: number[], period: number = 3): number {
  if (!dataPoints || dataPoints.length === 0) return 0;
  const slice = dataPoints.slice(-period);
  const sum = slice.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / slice.length;
  return Math.round(avg * 100) / 100;
}

/**
 * Mengekstrak penjualan per 3 periode (misal 3 blok 7 hari = 21 hari terakhir)
 * dari riwayat transaksi kasir
 */
export function extractProductSalesPeriods(
  transactions: Transaction[],
  productId: string,
  periodCount: number = 3,
  daysPerPeriod: number = 7
): number[] {
  const now = Date.now();
  const periods: number[] = new Array(periodCount).fill(0);

  // Filter transaksi penjualan yang sukses
  const salesTrx = transactions.filter((t) => {
    const isSale = t.type === 'IN' && (t.category === 'PENJUALAN' || !t.category);
    const isValid = t.payment_status !== 'CANCEL' && t.payment_status !== 'EXPIRE' && t.payment_status !== 'FAILED';
    return isSale && isValid;
  });

  for (const trx of salesTrx) {
    const trxTime = new Date(trx.transaction_date || trx.created_at).getTime();
    const daysAgo = Math.floor((now - trxTime) / (1000 * 60 * 60 * 24));

    if (daysAgo >= 0 && daysAgo < periodCount * daysPerPeriod) {
      const periodIndex = Math.floor(daysAgo / daysPerPeriod);
      // Cari produk di dalam transaksi
      const items = Array.isArray(trx.items) ? trx.items : [];
      for (const item of items) {
        if (item.productId === productId || (!item.productId && item.name)) {
          periods[periodIndex] += Number(item.quantity) || 0;
        }
      }
    }
  }

  // Reverse agar urutan dari periode terlama ke periode terbaru
  return periods.reverse();
}

/**
 * [ALGO-1] Evaluasi Rule-Based Restock Alert & Moving Average
 */
export function evaluateRestockRule(
  product: Product,
  historicalPeriodsSales: number[] = [2, 3, 4], // default fallback 3 periode jika data baru
  leadTimeDays: number = 3
): RestockAnalysis {
  const stock = Number(product.stock) || 0;
  const minStock = Number(product.min_stock) || 5;

  // 1. Hitung Moving Average penjualan 3 periode terakhir (misal per minggu)
  const periodCount = 3;
  const maPeriodSales = calculateMovingAverage(historicalPeriodsSales, periodCount);
  // Rata-rata penjualan per hari (7 hari per periode)
  const dailyVelocity = Math.max(0.1, Math.round((maPeriodSales / 7) * 100) / 100);

  // 2. Estimasi Runout Days (sisa hari sebelum stok habis total)
  let runoutDays = 0;
  if (stock <= 0) {
    runoutDays = 0;
  } else {
    runoutDays = Math.max(0, Math.round(stock / dailyVelocity));
  }

  // 3. Rule-Based Alert Classification
  let alertLevel: 'CRITICAL' | 'LOW' | 'SAFE' | 'OVERSTOCKED' = 'SAFE';
  let alertMessage = 'Stok berada dalam batas aman.';
  let urgency: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

  if (stock === 0) {
    alertLevel = 'CRITICAL';
    alertMessage = 'Stok telah HABIS total. Segera lakukan kulakan darurat.';
    urgency = 'HIGH';
  } else if (stock <= 2 || runoutDays <= 2) {
    alertLevel = 'CRITICAL';
    alertMessage = `Stok sangat kritis (sisa ${stock} ${product.unit}). Diprediksi habis dalam ${runoutDays} hari.`;
    urgency = 'HIGH';
  } else if (stock <= minStock || runoutDays <= leadTimeDays + 2) {
    alertLevel = 'LOW';
    alertMessage = `Stok mendekati batas minimum (${minStock} ${product.unit}). Perlu restok minggu ini.`;
    urgency = 'MEDIUM';
  } else if (stock > minStock * 6) {
    alertLevel = 'OVERSTOCKED';
    alertMessage = `Stok melimpah (${stock} ${product.unit}). Perputaran barang lambat.`;
    urgency = 'LOW';
  }

  // 4. Hitung Rekomendasi Kuantitas Kulakan (Order Quantity)
  // Target = (Lead Time Demand) + Safety Stock
  const leadTimeDemand = Math.ceil(dailyVelocity * leadTimeDays);
  const safetyStock = Math.max(minStock, Math.ceil(maPeriodSales * 0.5));
  const targetStock = leadTimeDemand + safetyStock + minStock;
  const rawOrder = targetStock - stock;
  const recommendedRestockQty = Math.max(minStock * 2, rawOrder > 0 ? rawOrder : minStock * 2);

  return {
    productId: product.id,
    productName: product.name,
    currentStock: stock,
    minStock,
    unit: product.unit || 'pcs',
    movingAveragePeriod: periodCount,
    periodsSales: historicalPeriodsSales,
    movingAverageDailySales: dailyVelocity,
    movingAveragePeriodSales: maPeriodSales,
    alertLevel,
    alertMessage,
    urgency,
    runoutDays,
    recommendedRestockQty,
  };
}

