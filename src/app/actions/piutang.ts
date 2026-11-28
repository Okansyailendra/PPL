'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import { getSellerUser } from '@/lib/auth';
import type { Debt, PaymentLog, UserSession } from '@/types';

const getUser = getSellerUser;

export interface AddDebtInput {
  customer_name: string;
  customer_phone?: string;
  amount: number;
  due_date: string;
  type?: 'BARANG' | 'PINJAMAN_TUNAI';
  notes?: string;
}

/**
 * [DEL-5] Tambah catatan kasbon terpisah (Barang atau Pinjaman Uang Tunai)
 */
export async function addDebt(formData: FormData) {
  const user = await getUser();
  if (!user) {
    return { error: 'Sesi akun tidak ditemukan. Silakan login kembali.' };
  }

  const customer_name = formData.get('customer_name') as string;
  const customer_phone = (formData.get('customer_phone') as string) || '';
  const amount = parseInt((formData.get('amount') as string) || '0', 10);
  const due_date = formData.get('due_date') as string;
  const type = 'BARANG';
  const notes = (formData.get('notes') as string) || '';

  if (!customer_name || !amount || amount <= 0 || !due_date) {
    return { error: 'Nama pelanggan, nominal utang valid (>0), dan tanggal jatuh tempo wajib diisi.' };
  }

  const debtId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('debts')
    .insert([
      {
        id: debtId,
        umkm_id: user.id,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim() || null,
        amount: amount,
        paid_amount: 0,
        remaining_amount: amount,
        due_date: new Date(due_date).toISOString(),
        type: type,
        status: 'UNPAID',
        notes: notes.trim() || null,
        created_at: now,
      }
    ]);

  if (error) {
    console.error('Error adding debt:', error);
    return { error: 'Gagal menyimpan catatan kasbon: ' + error.message };
  }

  revalidatePath('/dashboard/penjual/piutang');
  revalidatePath('/dashboard/penjual');
  return { success: true, debtId };
}

export interface PayDebtInput {
  debtId: string;
  amountPaid: number;
  paymentMethod?: 'CASH' | 'QRIS' | 'TRANSFER';
  notes?: string;
}

export async function recordDebtPayment(input: PayDebtInput) {
  const user = await getUser();
  if (!user) {
    return { error: 'Sesi akun tidak ditemukan. Silakan login kembali.' };
  }

  const { debtId, amountPaid, paymentMethod = 'CASH', notes } = input;

  if (!debtId || !amountPaid || amountPaid <= 0) {
    return { error: 'ID kasbon dan nominal pembayaran valid (>0) wajib diisi.' };
  }

  const { data: debt, error: fetchErr } = await supabase
    .from('debts')
    .select('*')
    .eq('id', debtId)
    .eq('umkm_id', user.id)
    .single();

  if (fetchErr || !debt) {
    return { error: 'Data kasbon tidak ditemukan.' };
  }

  const totalAmount = Number(debt.amount) || 0;
  const currentPaid = Number(debt.paid_amount) || 0;
  const remainingBefore = Number(debt.remaining_amount ?? (totalAmount - currentPaid));

  if (remainingBefore <= 0) {
    return { error: 'Kasbon ini sudah lunas sebelumnya.' };
  }

  const newPaidAmount = currentPaid + amountPaid;
  const newRemaining = Math.max(0, totalAmount - newPaidAmount);
  const newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' =
    newRemaining <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID';

  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from('debts')
    .update({
      paid_amount: newPaidAmount,
      remaining_amount: newRemaining,
      status: newStatus,
    })
    .eq('id', debtId)
    .eq('umkm_id', user.id);

  if (updateErr) {
    console.error('Error updating debt payment:', updateErr);
    return { error: 'Gagal memperbarui kasbon: ' + updateErr.message };
  }

  const logId = crypto.randomUUID();
  const { error: logErr } = await supabase
    .from('payment_logs')
    .insert([
      {
        id: logId,
        debt_id: debtId,
        umkm_id: user.id,
        amount_paid: amountPaid,
        payment_method: paymentMethod,
        notes: notes?.trim() || null,
        payment_date: now,
        created_at: now,
      }
    ]);

  if (logErr) {
    console.error('Error inserting payment_logs:', logErr);
  }

  try {
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
  } catch (trxErr) {
    console.warn('Gagal mencatat transaksi pemasukan kasbon:', trxErr);
  }

  revalidatePath('/dashboard/penjual/piutang');
  revalidatePath('/dashboard/penjual');
  revalidatePath('/dashboard/penjual/laporan');

  return {
    success: true,
    paidAmount: amountPaid,
    remainingAmount: newRemaining,
    status: newStatus,
  };
}

/**
 * Mengambil histori pembayaran (payment logs) dari kasbon tertentu
 */
export async function getPaymentLogs(debtId: string) {
  const user = await getUser();
  if (!user) return { error: 'Sesi akun tidak ditemukan.' };

  const { data, error } = await supabase
    .from('payment_logs')
    .select('*')
    .eq('debt_id', debtId)
    .eq('umkm_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { success: true, logs: (data || []) as PaymentLog[] };
}

export async function toggleDebtStatus(debtId: string, currentStatus: Debt['status']) {
  const user = await getUser();
  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  const { data: debt } = await supabase
    .from('debts')
    .select('*')
    .eq('id', debtId)
    .eq('umkm_id', user.id)
    .single();

  if (!debt) return { error: 'Data kasbon tidak ditemukan.' };

  const totalAmount = Number(debt.amount) || 0;
  const isNowPaid = currentStatus !== 'PAID';
  const newStatus = isNowPaid ? 'PAID' : 'UNPAID';
  const newPaidAmount = isNowPaid ? totalAmount : 0;
  const newRemaining = isNowPaid ? 0 : totalAmount;
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('debts')
    .update({
      status: newStatus,
      paid_amount: newPaidAmount,
      remaining_amount: newRemaining,
    })
    .eq('id', debtId)
    .eq('umkm_id', user.id);

  if (error) {
    console.error('Error updating debt status:', error);
    return { error: 'Gagal memperbarui status: ' + error.message };
  }

  if (isNowPaid) {
    await supabase.from('payment_logs').insert([
      {
        id: crypto.randomUUID(),
        debt_id: debtId,
        umkm_id: user.id,
        amount_paid: Number(debt.remaining_amount) || totalAmount,
        payment_method: 'CASH',
        notes: 'Pelunasan instan',
        payment_date: now,
        created_at: now,
      }
    ]);
  }

  revalidatePath('/dashboard/penjual/piutang');
  revalidatePath('/dashboard/penjual');
  return { success: true, newStatus };
}

export async function deleteDebt(debtId: string) {
  const user = await getUser();
  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  await supabase
    .from('payment_logs')
    .delete()
    .eq('debt_id', debtId)
    .eq('umkm_id', user.id);

  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', debtId)
    .eq('umkm_id', user.id);

  if (error) {
    console.error('Error deleting debt:', error);
    return { error: 'Gagal menghapus catatan: ' + error.message };
  }

  revalidatePath('/dashboard/penjual/piutang');
  revalidatePath('/dashboard/penjual');
  return { success: true };
}

export async function updateLastBilled(debtId: string) {
  const user = await getUser();
  if (!user) return { error: 'No session' };

  try {
    await supabase
      .from('debts')
      .update({ last_billed_at: new Date().toISOString() })
      .eq('id', debtId)
      .eq('umkm_id', user.id);
  } catch (e) {
    console.error('Error updating last_billed_at', e);
  }
  
  revalidatePath('/dashboard/penjual/piutang');
  return { success: true };
}

export async function updateDebtPhone(debtId: string, phone: string) {
  const user = await getUser();
  if (!user) return { error: 'No session' };

  try {
    const { error } = await supabase
      .from('debts')
      .update({ customer_phone: phone })
      .eq('id', debtId)
      .eq('umkm_id', user.id);
      
    if (error) return { error: error.message };
  } catch (e: any) {
    console.error('Error updating phone', e);
    return { error: e.message };
  }
  
  revalidatePath('/dashboard/penjual/piutang');
  return { success: true };
}

export async function updateDebt(formData: FormData) {
  const user = await getUser();
  if (!user) {
    return { error: 'Sesi akun tidak ditemukan. Silakan login kembali.' };
  }

  const id = formData.get('id') as string;
  const customer_name = formData.get('customer_name') as string;
  const customer_phone = (formData.get('customer_phone') as string) || '';
  const amount = parseInt((formData.get('amount') as string) || '0', 10);
  const due_date = formData.get('due_date') as string;
  const type = 'BARANG';
  const notes = (formData.get('notes') as string) || '';

  if (!id || !customer_name || !amount || !due_date) {
    return { error: 'Data tidak lengkap.' };
  }

  // Hitung ulang remaining_amount berdasarkan paid_amount saat ini (pastikan milik UMKM yang sama)
  const { data: currentDebt } = await supabase
    .from('debts')
    .select('paid_amount')
    .eq('id', id)
    .eq('umkm_id', user.id)
    .single();

  const paidAmount = Number(currentDebt?.paid_amount) || 0;
  const newRemaining = Math.max(0, amount - paidAmount);
  const newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' =
    newRemaining <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

  const { error } = await supabase
    .from('debts')
    .update({
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim() || null,
      amount,
      remaining_amount: newRemaining,
      status: newStatus,
      type,
      notes: notes.trim() || null,
      due_date: new Date(due_date).toISOString(),
    })
    .eq('id', id)
    .eq('umkm_id', user.id);

  if (error) {
    console.error('Error updating debt:', error);
    return { error: 'Gagal memperbarui catatan kasbon: ' + error.message };
  }

  revalidatePath('/dashboard/penjual/piutang');
  revalidatePath('/dashboard/penjual');
  return { success: true };
}

export async function approveDebt(debtId: string) {
  const user = await getUser();
  if (!user) {
    return { error: 'Sesi akun tidak ditemukan. Silakan login kembali.' };
  }

  const { data: debt, error: fetchErr } = await supabase
    .from('debts')
    .select('*')
    .eq('id', debtId)
    .eq('umkm_id', user.id)
    .single();

  if (fetchErr || !debt) {
    return { error: 'Catatan pengajuan kasbon tidak ditemukan.' };
  }

  if (debt.status !== 'PENDING_APPROVAL') {
    return { error: 'Pengajuan kasbon ini sudah diproses sebelumnya.' };
  }

  // Jika pengajuan kasbon berasal dari checkout keranjang online, verifikasi & potong stok barang terlebih dahulu
  if (debt.related_trx_id) {
    const { data: relatedTrx } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', debt.related_trx_id)
      .eq('umkm_id', user.id)
      .single();

    if (relatedTrx && relatedTrx.payment_status === 'PENDING') {
      const trxItems = Array.isArray(relatedTrx.items) ? relatedTrx.items : [];
      const productIds = trxItems.map((it: any) => it.productId || it.id).filter(Boolean);

      if (productIds.length > 0) {
        const { data: dbProducts, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds)
          .eq('umkm_id', user.id);

        if (prodErr || !dbProducts) {
          return { error: 'Gagal memverifikasi stok barang pesanan kasbon.' };
        }

        const productMap = new Map<string, any>((dbProducts as any[]).map((p: any) => [p.id, p]));

        for (const item of trxItems) {
          const pid = item.productId || item.id;
          if (!pid) continue;
          const dbProd = productMap.get(pid);
          const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
          if (!dbProd) {
            return { error: `Produk "${item.name}" sudah tidak tersedia di katalog.` };
          }
          if (Number(dbProd.stock) < qty) {
            return {
              error: `Stok "${dbProd.name}" tidak mencukupi (tersisa ${dbProd.stock} ${dbProd.unit || 'pcs'}, diminta ${qty}). Persetujuan dibatalkan.`,
            };
          }
        }

        for (const item of trxItems) {
          const pid = item.productId || item.id;
          const dbProd = pid ? productMap.get(pid) : null;
          if (dbProd) {
            const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
            const newStock = Math.max(0, Number(dbProd.stock) - qty);
            await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', dbProd.id)
              .eq('umkm_id', user.id);
          }
        }
      }

      await supabase
        .from('transactions')
        .update({ payment_status: 'UNPAID' })
        .eq('id', relatedTrx.id)
        .eq('umkm_id', user.id);
    }
  }

  const { error: updateErr } = await supabase
    .from('debts')
    .update({
      status: 'UNPAID',
    })
    .eq('id', debtId)
    .eq('umkm_id', user.id);

  if (updateErr) {
    return { error: 'Gagal menyetujui kasbon: ' + updateErr.message };
  }

  revalidatePath('/dashboard/penjual/piutang');
  revalidatePath('/dashboard/penjual/stok');
  revalidatePath('/dashboard/penjual/laporan');
  revalidatePath('/dashboard/penjual/transaksi');
  revalidatePath('/dashboard/penjual');
  revalidatePath('/dashboard/pelanggan/kasbon');
  revalidatePath('/dashboard/pelanggan/struk');
  return { success: true, message: `Kasbon atas nama "${debt.customer_name}" berhasil disetujui!` };
}

export async function rejectDebt(debtId: string, reason?: string) {
  const user = await getUser();
  if (!user) {
    return { error: 'Sesi akun tidak ditemukan. Silakan login kembali.' };
  }

  const { data: debt, error: fetchErr } = await supabase
    .from('debts')
    .select('*')
    .eq('id', debtId)
    .eq('umkm_id', user.id)
    .single();

  if (fetchErr || !debt) {
    return { error: 'Catatan pengajuan kasbon tidak ditemukan.' };
  }

  const rejectNote = reason?.trim() ? `[DITOLAK ADMIN: ${reason.trim()}]` : '[DITOLAK ADMIN]';
  const updatedNotes = debt.notes ? `${debt.notes} ${rejectNote}` : rejectNote;

  const { error: updateErr } = await supabase
    .from('debts')
    .update({
      status: 'REJECTED',
      notes: updatedNotes,
    })
    .eq('id', debtId)
    .eq('umkm_id', user.id);

  if (updateErr) {
    return { error: 'Gagal menolak pengajuan kasbon: ' + updateErr.message };
  }

  if (debt.related_trx_id) {
    await supabase
      .from('transactions')
      .update({ payment_status: 'CANCEL' })
      .eq('id', debt.related_trx_id)
      .eq('umkm_id', user.id);
  }

  revalidatePath('/dashboard/penjual/piutang');
  revalidatePath('/dashboard/penjual/laporan');
  revalidatePath('/dashboard/pelanggan/kasbon');
  revalidatePath('/dashboard/pelanggan/struk');
  return { success: true, message: `Pengajuan kasbon "${debt.customer_name}" telah ditolak.` };
}
