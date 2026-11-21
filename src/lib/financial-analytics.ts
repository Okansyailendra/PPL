/**
 * ============================================================================
 * FINANCIAL DATA ANALYTICS & REKAPITULASI ARUS KAS ENGINE [ZAKI - DEL-7]
 * Modul Kalkulasi Otomatis Laba Bersih, HPP (COGS), Margin, Arus Kas & Piutang
 * ============================================================================
 */

import type { Product, Debt } from '@/types';

export interface TransactionItemData {
  name: string;
  unit?: string;
  price: number;
  quantity: number;
  subtotal?: number;
  costPrice?: number;
  cost_price?: number;
  modal?: number;
  productId?: string;
  product_id?: string;
}

export interface TransactionRecord {
  id: string;
  umkm_id: string;
  created_at: string;
  transaction_date?: string;
  type: 'IN' | 'OUT';
  category?: string;
  payment_method: 'CASH' | 'QRIS' | 'CREDIT' | 'ONLINE' | 'TRANSFER';
  payment_status?: 'PENDING' | 'PAID' | 'SETTLEMENT' | 'UNPAID' | 'EXPIRE' | 'CANCEL' | 'FAILED';
  total_amount: number;
  items: TransactionItemData[];
  debt_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
}

export interface ItemProfitAnalysis {
  name: string;
  unit: string;
  quantity: number;
  sale_price: number;
  cost_price: number;
  subtotal_revenue: number;
  subtotal_cogs: number;
  subtotal_profit: number;
  profit_margin_pct: number;
}

export interface TransactionProfitAnalysis {
  transaction_id: string;
  transaction_date: string;
  type: 'IN' | 'OUT';
  category: string;
  payment_method: string;
  payment_status: string;
  customer_name: string;
  total_revenue: number;
  total_cogs: number;
  gross_profit: number;
  profit_margin_pct: number;
  items: ItemProfitAnalysis[];
}

export interface FinancialSummaryResult {
  period: {
    name: string;
    start_date: string | null;
    end_date: string | null;
  };
  metrics: {
    /** Total Penjualan Kotor (Revenue/Omset) dari transaksi IN */
    gross_revenue: number;
    /** Cost of Goods Sold (Harga Pokok Penjualan) dari barang-barang yang terjual */
    cogs: number;
    /** Laba Kotor (Gross Profit = Gross Revenue - COGS) */
    gross_profit: number;
    /** Margin Laba Kotor dlm persen (Gross Profit / Gross Revenue * 100) */
    gross_profit_margin_pct: number;
    /** Biaya Operasional / Pengeluaran Kas (Transaksi OUT) */
    operational_expenses: number;
    /** Laba Bersih Toko (Gross Profit - Operational Expenses) */
    net_profit: number;
    /** Margin Laba Bersih dlm persen (Net Profit / Gross Revenue * 100) */
    net_profit_margin_pct: number;
    /** Total Piutang Kasbon Tercatat */
    total_receivables: number;
    /** Piutang Belum Tertagih (Outstanding Receivables / Kasbon Menggantung) */
    outstanding_receivables: number;
    /** Piutang Sudah Dilunasi Pelanggan */
    collected_receivables: number;
  };
  cash_flow: {
    /** Total Kas Masuk Nyata (Tunai + QRIS Lunas + Cicilan Kasbon) */
    cash_inflows: number;
    /** Total Kas Keluar Nyata (Pengeluaran Operasional & Kulakan) */
    cash_outflows: number;
    /** Arus Kas Bersih (Net Cash Flow = Kas Masuk - Kas Keluar) */
    net_cash_flow: number;
    breakdown: {
      cash_sales: number;
      qris_sales: number;
      credit_sales_unpaid: number;
      receivables_collected: number;
      expenses_and_restock: number;
    };
  };
  top_products: Array<{
    name: string;
    unit: string;
    quantity_sold: number;
    total_revenue: number;
    total_cogs: number;
    total_profit: number;
    profit_margin_pct: number;
  }>;
  daily_trend: Array<{
    date: string;
    revenue: number;
    cogs: number;
    gross_profit: number;
    net_profit: number;
    transaction_count: number;
  }>;
  transactions_breakdown: TransactionProfitAnalysis[];
}

/**
 * Normalisasi tanggal untuk filter periode analitik.
 */
export function filterTransactionsByDateRange(
  transactions: TransactionRecord[],
  startDate?: string | null,
  endDate?: string | null
): TransactionRecord[] {
  if (!startDate && !endDate) return transactions;

  const start = startDate ? new Date(startDate) : new Date(0);
  const end = endDate ? new Date(endDate) : new Date(8640000000000000);
  end.setHours(23, 59, 59, 999);

  return transactions.filter((t) => {
    const rawDate = t.transaction_date || t.created_at;
    const date = new Date(rawDate);
    return date >= start && date <= end;
  });
}

/**
 * Menghitung HPP, Laba Kotor, dan Margin untuk 1 transaksi penjualan.
 * Mengagregasi selisih harga jual dengan harga beli modal per item barang.
 */
export function calculateTransactionProfit(
  trx: TransactionRecord,
  catalogProductsMap: Map<string, Product>
): TransactionProfitAnalysis {
  const isSale = trx.type === 'IN';
  const items = trx.items || [];
  const analyzedItems: ItemProfitAnalysis[] = [];

  let trxTotalRevenue = 0;
  let trxTotalCogs = 0;

  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    const salePrice = Number(item.price) || 0;
    const subtotalRev = Number(item.subtotal) || salePrice * qty;

    // 1. Tentukan harga beli modal (cost price)
    // Prioritas:
    // a. Nilai tersimpan di item snapshot (costPrice, cost_price, modal)
    // b. Fallback ke master katalog produk di database berdasarkan ID atau nama
    let costPrice = Number(item.costPrice ?? item.cost_price ?? item.modal);

    if (isNaN(costPrice) || costPrice <= 0) {
      const prodId = item.productId || item.product_id;
      const matched =
        (prodId ? catalogProductsMap.get(prodId) : null) ||
        Array.from(catalogProductsMap.values()).find(
          (p) => p.name.toLowerCase() === (item.name || '').toLowerCase()
        );

      if (matched && matched.cost_price && matched.cost_price > 0) {
        costPrice = matched.cost_price;
      } else if (matched && matched.price && matched.price > 0) {
        // Asumsi estimasi konservatif margin toko madura 15-20% jika data modal kosong
        costPrice = Math.round(matched.price * 0.82);
      } else {
        costPrice = Math.round(salePrice * 0.82);
      }
    }

    const subtotalCogs = Math.round(costPrice * qty);
    const subtotalProfit = subtotalRev - subtotalCogs;
    const itemMargin = subtotalRev > 0 ? (subtotalProfit / subtotalRev) * 100 : 0;

    analyzedItems.push({
      name: item.name || 'Produk Tanpa Nama',
      unit: item.unit || 'pcs',
      quantity: qty,
      sale_price: salePrice,
      cost_price: costPrice,
      subtotal_revenue: subtotalRev,
      subtotal_cogs: subtotalCogs,
      subtotal_profit: subtotalProfit,
      profit_margin_pct: Number(itemMargin.toFixed(2)),
    });

    if (isSale) {
      trxTotalRevenue += subtotalRev;
      trxTotalCogs += subtotalCogs;
    }
  }

  // Jika item kosong tapi trx IN memiliki total_amount
  if (isSale && trxTotalRevenue === 0 && trx.total_amount > 0) {
    trxTotalRevenue = trx.total_amount;
    // Estimasi HPP 80% dari revenue
    trxTotalCogs = Math.round(trx.total_amount * 0.8);
  }

  const grossProfit = isSale ? trxTotalRevenue - trxTotalCogs : -trx.total_amount;
  const margin = trxTotalRevenue > 0 ? (grossProfit / trxTotalRevenue) * 100 : 0;

  return {
    transaction_id: trx.id,
    transaction_date: trx.transaction_date || trx.created_at,
    type: trx.type,
    category: trx.category || (isSale ? 'PENJUALAN' : 'PENGELUARAN'),
    payment_method: trx.payment_method || 'CASH',
    payment_status: trx.payment_status || (trx.payment_method === 'CREDIT' ? 'UNPAID' : 'PAID'),
    customer_name: trx.customer_name || 'Umum',
    total_revenue: trxTotalRevenue,
    total_cogs: trxTotalCogs,
    gross_profit: grossProfit,
    profit_margin_pct: Number(margin.toFixed(2)),
    items: analyzedItems,
  };
}

/**
 * ENGINE UTAMA: Rekapitulasi Menyeluruh Finansial & Arus Kas [ZAKI DEL-7]
 */
export function generateFinancialSummary(
  transactions: TransactionRecord[],
  debts: Debt[] = [],
  catalogProducts: Product[] = [],
  periodMeta: { name: string; start_date: string | null; end_date: string | null }
): FinancialSummaryResult {
  // Buat Map katalog produk untuk pencarian cepat O(1)
  const catalogMap = new Map<string, Product>();
  catalogProducts.forEach((p) => {
    if (p.id) catalogMap.set(p.id, p);
  });

  let totalGrossRevenue = 0;
  let totalCogs = 0;
  let totalOperationalExpenses = 0;

  let cashSales = 0;
  let qrisSales = 0;
  let creditSalesUnpaid = 0;

  const analyzedTrxs: TransactionProfitAnalysis[] = [];
  const productProfitMap = new Map<
    string,
    {
      name: string;
      unit: string;
      quantity_sold: number;
      total_revenue: number;
      total_cogs: number;
      total_profit: number;
    }
  >();

  const dailyTrendMap = new Map<
    string,
    {
      date: string;
      revenue: number;
      cogs: number;
      gross_profit: number;
      net_profit: number;
      transaction_count: number;
    }
  >();

  for (const trx of transactions) {
    const trxAnalysis = calculateTransactionProfit(trx, catalogMap);
    analyzedTrxs.push(trxAnalysis);

    const trxDateStr = (trx.transaction_date || trx.created_at).slice(0, 10);
    let trend = dailyTrendMap.get(trxDateStr);
    if (!trend) {
      trend = {
        date: trxDateStr,
        revenue: 0,
        cogs: 0,
        gross_profit: 0,
        net_profit: 0,
        transaction_count: 0,
      };
      dailyTrendMap.set(trxDateStr, trend);
    }

    if (trx.type === 'IN') {
      trend.transaction_count += 1;
      totalGrossRevenue += trxAnalysis.total_revenue;
      totalCogs += trxAnalysis.total_cogs;

      trend.revenue += trxAnalysis.total_revenue;
      trend.cogs += trxAnalysis.total_cogs;
      trend.gross_profit += trxAnalysis.gross_profit;
      trend.net_profit += trxAnalysis.gross_profit;

      // Akumulasi produk terlaris & profit per produk
      for (const item of trxAnalysis.items) {
        const key = item.name.toLowerCase().trim();
        let prodStat = productProfitMap.get(key);
        if (!prodStat) {
          prodStat = {
            name: item.name,
            unit: item.unit,
            quantity_sold: 0,
            total_revenue: 0,
            total_cogs: 0,
            total_profit: 0,
          };
          productProfitMap.set(key, prodStat);
        }
        prodStat.quantity_sold += item.quantity;
        prodStat.total_revenue += item.subtotal_revenue;
        prodStat.total_cogs += item.subtotal_cogs;
        prodStat.total_profit += item.subtotal_profit;
      }

      // Klasifikasi Arus Kas Masuk berdasarkan metode pembayaran
      if (trx.payment_method === 'CASH') {
        cashSales += trx.total_amount;
      } else if (trx.payment_method === 'QRIS') {
        if (trx.payment_status === 'PAID' || trx.payment_status === 'SETTLEMENT') {
          qrisSales += trx.total_amount;
        }
      } else if (trx.payment_method === 'CREDIT') {
        if (trx.payment_status !== 'PAID') {
          creditSalesUnpaid += trx.total_amount;
        } else {
          cashSales += trx.total_amount;
        }
      }
    } else if (trx.type === 'OUT') {
      // Transaksi pengeluaran / kas keluar
      totalOperationalExpenses += trx.total_amount;
      trend.net_profit -= trx.total_amount;
    }
  }

  // Analisis Piutang (Receivables)
  let totalReceivables = 0;
  let outstandingReceivables = 0;
  let collectedReceivables = 0;

  for (const debt of debts) {
    const amt = Number(debt.amount) || 0;
    const paid = Number(debt.paid_amount) || 0;
    const remaining = Number(debt.remaining_amount) || Math.max(0, amt - paid);

    totalReceivables += amt;
    collectedReceivables += paid;

    if (debt.status !== 'PAID' && remaining > 0) {
      outstandingReceivables += remaining;
    }
  }

  // Perhitungan Laba & Margin
  const grossProfit = totalGrossRevenue - totalCogs;
  const grossProfitMarginPct =
    totalGrossRevenue > 0 ? (grossProfit / totalGrossRevenue) * 100 : 0;

  const netProfit = grossProfit - totalOperationalExpenses;
  const netProfitMarginPct =
    totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0;

  // Rekapitulasi Arus Kas Riil (Cash Basis)
  const cashInflows = cashSales + qrisSales + collectedReceivables;
  const cashOutflows = totalOperationalExpenses;
  const netCashFlow = cashInflows - cashOutflows;

  // Sorting Top Products by Total Profit
  const topProducts = Array.from(productProfitMap.values())
    .map((p) => {
      const margin = p.total_revenue > 0 ? (p.total_profit / p.total_revenue) * 100 : 0;
      return {
        ...p,
        profit_margin_pct: Number(margin.toFixed(2)),
      };
    })
    .sort((a, b) => b.total_profit - a.total_profit)
    .slice(0, 10);

  // Sorting Daily Trend kronologis
  const dailyTrend = Array.from(dailyTrendMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return {
    period: periodMeta,
    metrics: {
      gross_revenue: totalGrossRevenue,
      cogs: totalCogs,
      gross_profit: grossProfit,
      gross_profit_margin_pct: Number(grossProfitMarginPct.toFixed(2)),
      operational_expenses: totalOperationalExpenses,
      net_profit: netProfit,
      net_profit_margin_pct: Number(netProfitMarginPct.toFixed(2)),
      total_receivables: totalReceivables,
      outstanding_receivables: outstandingReceivables,
      collected_receivables: collectedReceivables,
    },
    cash_flow: {
      cash_inflows: cashInflows,
      cash_outflows: cashOutflows,
      net_cash_flow: netCashFlow,
      breakdown: {
        cash_sales: cashSales,
        qris_sales: qrisSales,
        credit_sales_unpaid: creditSalesUnpaid,
        receivables_collected: collectedReceivables,
        expenses_and_restock: cashOutflows,
      },
    },
    top_products: topProducts,
    daily_trend: dailyTrend,
    transactions_breakdown: analyzedTrxs,
  };
}
