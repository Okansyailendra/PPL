'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { getSellerUser } from '@/lib/auth';
import type { UserSession } from '@/types';

const getUser = getSellerUser;

export interface CartItemInput {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  unit?: string;
  costPrice?: number;
}

export interface CreateSaleInput {
  items: CartItemInput[];
  paymentMethod: 'CASH' | 'QRIS' | 'CREDIT';
  paymentStatus?: 'PENDING' | 'PAID' | 'SETTLEMENT' | 'UNPAID';
  customerName?: string;
  customerPhone?: string;
  dueDate?: string;
  notes?: string;
  paidAmount?: number;
  transactionDate?: string;
}

/**
 * Mencatat transaksi penjualan (pembelian oleh pelanggan):
 * 1. Validasi ketersediaan stok
 * 2. Kurangi stok produk secara otomatis
 * 3. Jika Kasbon/Kredit, buat record di tabel debts
 * 4. Catat ke tabel transactions (Buku Besar & Pembukuan)
 */
export async function createSaleTransaction(input: CreateSaleInput) {
  const user = await getUser();
  if (!user) {
    return { error: 'Sesi akun tidak ditemukan. Silakan login kembali.' };
  }

  const { items, paymentMethod, paymentStatus, customerName, customerPhone, dueDate, transactionDate } = input;

  if (!items || items.length === 0) {
    return { error: 'Keranjang belanja kosong. Pilih minimal 1 barang.' };
  }

  for (const item of items) {
    if (!item.productId || item.quantity <= 0 || item.price < 0) {
      return { error: `Data barang "${item.name || 'Barang'}" tidak valid.` };
    }
  }

  const productIds = items.map(i => i.productId);
  const { data: dbProducts, error: fetchErr } = await supabase
    .from('products')
    .select('*')
    .in('id', productIds)
    .eq('umkm_id', user.id);

  if (fetchErr || !dbProducts) {
    console.error('Error fetching products for sale:', fetchErr);
    return { error: 'Gagal memverifikasi stok barang dari database.' };
  }

  const productMap = new Map((dbProducts as any[]).map((p: any) => [p.id, p]));

  for (const item of items) {
    const p = productMap.get(item.productId);
    if (!p) {
      return { error: `Barang "${item.name}" tidak ditemukan di database warung Anda.` };
    }
    if (p.stock < item.quantity) {
      return { 
        error: `Stok tidak mencukupi untuk "${p.name}". Sisa stok saat ini hanya ${p.stock} ${p.unit}, tidak cukup untuk ${item.quantity} ${p.unit}.` 
      };
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  const updatedStocks: { id: string; name: string; newStock: number; unit: string }[] = [];
  for (const item of items) {
    const p = productMap.get(item.productId)!;
    const newStock = Math.max(0, p.stock - item.quantity);

    const { error: stockErr } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', p.id)
      .eq('umkm_id', user.id);

    if (stockErr) {
      console.error(`Gagal mengurangi stok untuk produk ${p.name}:`, stockErr);
      return { error: `Gagal memperbarui stok untuk "${p.name}". Transaksi dibatalkan.` };
    }

    updatedStocks.push({ id: p.id, name: p.name, newStock, unit: p.unit });
  }

  let createdDebtId: string | null = null;
  if (paymentMethod === 'CREDIT') {
    if (!customerName || !customerName.trim()) {
      return { error: 'Nama pelanggan wajib diisi untuk transaksi Kasbon/Kredit.' };
    }

    const finalDueDate = dueDate 
      ? new Date(dueDate).toISOString() 
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const itemsSummary = items.map(i => `${i.name} (${i.quantity})`).join(', ');

    const { data: newDebt, error: debtErr } = await supabase
      .from('debts')
      .insert([
        {
          umkm_id: user.id,
          customer_name: customerName.trim(),
          customer_phone: customerPhone?.trim() || null,
          amount: totalAmount,
          paid_amount: 0,
          remaining_amount: totalAmount,
          type: 'BARANG',
          due_date: finalDueDate,
          status: 'UNPAID',
          notes: `Kasbon checkout kasir POS: ${itemsSummary}`,
          created_at: new Date().toISOString(),
        }
      ])
      .select('id')
      .single();

    if (debtErr) {
      console.error('Error creating debt for credit sale:', debtErr);
    } else if (newDebt) {
      createdDebtId = newDebt.id;
    }
  }

  const trxItems = items.map(item => {
    const prod = productMap.get(item.productId);
    return {
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      costPrice: item.costPrice ?? prod?.cost_price ?? 0,
      unit: item.unit || prod?.unit || 'pcs',
      subtotal: item.quantity * item.price,
    };
  });

  const finalPaymentStatus: 'PENDING' | 'PAID' | 'SETTLEMENT' | 'UNPAID' =
    paymentMethod === 'CREDIT'
      ? 'UNPAID'
      : paymentMethod === 'QRIS' && paymentStatus === 'PENDING'
      ? 'PENDING'
      : 'PAID';

  const nowIso = new Date().toISOString();
  const trxDate = transactionDate ? new Date(transactionDate).toISOString() : nowIso;

  const { data: newTrx, error: trxErr } = await supabase
    .from('transactions')
    .insert([
      {
        umkm_id: user.id,
        type: 'IN',
        category: 'PENJUALAN',
        payment_method: paymentMethod,
        payment_status: finalPaymentStatus,
        total_amount: totalAmount,
        items: trxItems,
        debt_id: createdDebtId,
        transaction_date: trxDate,
        created_at: nowIso,
      }
    ])
    .select('id, created_at')
    .single();

  if (trxErr) {
    console.error('Error saving transaction record:', trxErr);
    return { 
      error: 'Stok berhasil dikurangi, tetapi gagal menyimpan catatan riwayat transaksi: ' + trxErr.message 
    };
  }

  if (createdDebtId && newTrx?.id) {
    await supabase
      .from('debts')
      .update({ related_trx_id: newTrx.id })
      .eq('id', createdDebtId);
  }

  revalidatePath('/dashboard/penjual');
  revalidatePath('/dashboard/penjual/transaksi');
  revalidatePath('/dashboard/penjual/stok');
  revalidatePath('/dashboard/penjual/laporan');
  revalidatePath('/dashboard/penjual/piutang');

  return {
    success: true,
    transactionId: newTrx?.id,
    totalAmount,
    itemCount: items.length,
    updatedStocks,
    debtId: createdDebtId,
    message: `Transaksi Rp ${totalAmount.toLocaleString('id-ID')} berhasil disimpan! Stok otomatis dikurangi dan dicatat ke Pembukuan.`
  };
}

/**
 * Mencatat transaksi kulakan/restock (pembelian stok dari supplier):
 * Otomatis MENAMBAH stok produk dan mencatat Kas Keluar (HPP) ke pembukuan
 */
export async function createRestockTransaction(input: {
  items: { productId: string; name: string; quantity: number; costPrice: number; unit?: string }[];
  supplierName?: string;
  notes?: string;
  transactionDate?: string;
}) {
  const user = await getUser();
  if (!user) {
    return { error: 'Sesi akun tidak ditemukan. Silakan login kembali.' };
  }

  const { items, supplierName, transactionDate } = input;
  if (!items || items.length === 0) {
    return { error: 'Daftar barang kulakan kosong.' };
  }

  const productIds = items.map(i => i.productId);
  const { data: dbProducts, error: fetchErr } = await supabase
    .from('products')
    .select('*')
    .in('id', productIds)
    .eq('umkm_id', user.id);

  if (fetchErr || !dbProducts) {
    return { error: 'Gagal mengambil data barang dari database.' };
  }

  const productMap = new Map((dbProducts as any[]).map((p: any) => [p.id, p]));
  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

  for (const item of items) {
    const p = productMap.get(item.productId);
    if (p) {
      const newStock = p.stock + item.quantity;
      await supabase
        .from('products')
        .update({ 
          stock: newStock,
          cost_price: item.costPrice > 0 ? item.costPrice : p.cost_price 
        })
        .eq('id', p.id)
        .eq('umkm_id', user.id);
    }
  }

  const trxItems = items.map(item => ({
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    costPrice: item.costPrice,
    unit: item.unit || 'Pcs',
    subtotal: item.quantity * item.costPrice
  }));

  const nowIso = new Date().toISOString();
  const trxDate = transactionDate ? new Date(transactionDate).toISOString() : nowIso;

  const { data: newTrx, error: trxErr } = await supabase
    .from('transactions')
    .insert([
      {
        umkm_id: user.id,
        type: 'OUT',
        category: 'KULAKAN',
        payment_method: 'CASH',
        payment_status: 'PAID',
        total_amount: totalAmount,
        items: trxItems,
        transaction_date: trxDate,
        created_at: nowIso,
      }
    ])
    .select('id, created_at')
    .single();

  if (trxErr) {
    return { error: 'Gagal mencatat transaksi kulakan ke pembukuan: ' + trxErr.message };
  }

  revalidatePath('/dashboard/penjual');
  revalidatePath('/dashboard/penjual/transaksi');
  revalidatePath('/dashboard/penjual/stok');
  revalidatePath('/dashboard/penjual/laporan');

  return {
    success: true,
    transactionId: newTrx?.id,
    totalAmount,
    message: `Kulakan Rp ${totalAmount.toLocaleString('id-ID')} berhasil dicatat! Stok otomatis ditambah.`
  };
}

export async function deleteTransaction(transactionId: string, revertStock: boolean = true) {
  const user = await getUser();
  if (!user) return { error: 'Sesi akun berakhir.' };

  const { data: trx, error: fetchErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('umkm_id', user.id)
    .single();

  if (fetchErr || !trx) {
    return { error: 'Transaksi tidak ditemukan.' };
  }

  if (revertStock && trx.items && Array.isArray(trx.items)) {
    for (const item of trx.items) {
      if (item.productId && item.quantity) {
        const { data: p } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.productId)
          .eq('umkm_id', user.id)
          .single();

        if (p) {
          const restoredStock = trx.type === 'IN' 
            ? p.stock + item.quantity
            : Math.max(0, p.stock - item.quantity);

          await supabase
            .from('products')
            .update({ stock: restoredStock })
            .eq('id', item.productId)
            .eq('umkm_id', user.id);
        }
      }
    }
  }

  if (trx.debt_id) {
    await supabase.from('debts').delete().eq('id', trx.debt_id).eq('umkm_id', user.id);
  }

  const { error: delErr } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('umkm_id', user.id);

  if (delErr) {
    return { error: 'Gagal menghapus transaksi: ' + delErr.message };
  }

  revalidatePath('/dashboard/penjual');
  revalidatePath('/dashboard/penjual/transaksi');
  revalidatePath('/dashboard/penjual/stok');
  revalidatePath('/dashboard/penjual/laporan');
  revalidatePath('/dashboard/penjual/piutang');

  return { success: true, message: 'Transaksi berhasil dibatalkan dan stok telah disesuaikan kembali.' };
}

/**
 * Mengonfirmasi status pembayaran transaksi PENDING (misal pesanan online CASH/QRIS) menjadi PAID (Lunas) atau CANCEL
 */
export async function confirmTransactionPayment(
  transactionId: string,
  nextStatus: 'PAID' | 'CANCEL' = 'PAID'
) {
  const user = await getUser();
  if (!user) return { error: 'Sesi akun berakhir. Silakan login kembali.' };

  const { data: trx, error: fetchErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('umkm_id', user.id)
    .single();

  if (fetchErr || !trx) {
    return { error: 'Transaksi tidak ditemukan.' };
  }

  if (trx.payment_method === 'CREDIT') {
    return { error: 'Untuk transaksi kasbon, kelola persetujuan/pelunasan melalui menu Piutang / Kasbon.' };
  }

  if (trx.payment_status === 'PAID' || trx.payment_status === 'SETTLEMENT') {
    return { error: 'Transaksi ini sudah berstatus lunas.' };
  }

  if (trx.payment_status !== 'PENDING') {
    return { error: `Status transaksi (${trx.payment_status}) tidak dapat dikonfirmasi lagi.` };
  }

  const trxItems = Array.isArray(trx.items)
    ? trx.items
    : typeof trx.items === 'string'
    ? JSON.parse(trx.items)
    : [];

  if (nextStatus === 'PAID' && trx.payment_method === 'ONLINE' && trx.type === 'IN') {
    // Midtrans online checkout belum memotong stok saat token dibuat -> verifikasi & potong stok sekarang
    const productIds = trxItems.map((it: any) => it.productId || it.id).filter(Boolean);
    if (productIds.length > 0) {
      const { data: dbProducts } = await supabase
        .from('products')
        .select('id, name, stock, unit')
        .in('id', productIds)
        .eq('umkm_id', user.id);

      const prodMap = new Map<string, any>((dbProducts || []).map((p: any) => [p.id, p]));
      for (const item of trxItems) {
        const pid = item.productId || item.id;
        const p = pid ? prodMap.get(pid) : null;
        const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
        if (p && Number(p.stock) < qty) {
          return {
            error: `Stok "${p.name}" tidak mencukupi (tersisa ${p.stock} ${p.unit || 'pcs'}, dipesan ${qty}).`,
          };
        }
      }

      for (const item of trxItems) {
        const pid = item.productId || item.id;
        const p = pid ? prodMap.get(pid) : null;
        if (p) {
          const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
          await supabase
            .from('products')
            .update({ stock: Math.max(0, Number(p.stock) - qty) })
            .eq('id', p.id)
            .eq('umkm_id', user.id);
        }
      }
    }
  } else if (nextStatus === 'CANCEL' && trx.payment_method !== 'ONLINE' && trx.type === 'IN') {
    // Pesanan reguler (/api/orders) sudah memotong stok saat dibuat -> kembalikan stok jika dibatalkan
    for (const item of trxItems) {
      const pid = item.productId || item.id;
      const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
      if (pid && qty) {
        const { data: p } = await supabase
          .from('products')
          .select('stock')
          .eq('id', pid)
          .eq('umkm_id', user.id)
          .single();

        if (p) {
          await supabase
            .from('products')
            .update({ stock: Number(p.stock) + qty })
            .eq('id', pid)
            .eq('umkm_id', user.id);
        }
      }
    }
  }

  const { error: updateErr } = await supabase
    .from('transactions')
    .update({ payment_status: nextStatus })
    .eq('id', transactionId)
    .eq('umkm_id', user.id);

  if (updateErr) {
    return { error: 'Gagal memperbarui status pembayaran: ' + updateErr.message };
  }

  revalidatePath('/dashboard/penjual');
  revalidatePath('/dashboard/penjual/transaksi');
  revalidatePath('/dashboard/penjual/laporan');
  revalidatePath('/dashboard/penjual/stok');
  revalidatePath('/dashboard/pelanggan/struk');

  return {
    success: true,
    newStatus: nextStatus,
    message:
      nextStatus === 'PAID'
        ? 'Pembayaran transaksi berhasil dikonfirmasi LUNAS!'
        : 'Pesanan dibatalkan dan stok telah dikembalikan.',
  };
}
