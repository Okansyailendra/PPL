'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import type { Debt, PaymentLog, UserSession } from '@/types';

async function getUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('userSession')?.value;
  if (!sessionCookie) return null;
  try {
    const parsed: UserSession = JSON.parse(sessionCookie);
    if (!parsed?.id) return null;

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, email, store_name, owner_name, phone_number')
      .eq('id', parsed.id)
      .single();

    if (dbUser) {
      return dbUser as UserSession;
    }

    if (parsed.email) {
      const { data: emailUser } = await supabase
        .from('users')
        .select('id, email, store_name, owner_name, phone_number')
        .eq('email', parsed.email)
        .single();

      if (emailUser) {
        cookieStore.set('userSession', JSON.stringify(emailUser), {
          httpOnly: true,
          maxAge: 24 * 60 * 60,
        });
        return emailUser as UserSession;
      }
    }

    return null;
  } catch {
    return null;
  }
}

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
  const type = ((formData.get('type') as string) || 'BARANG') as 'BARANG' | 'PINJAMAN_TUNAI';
  const notes = (formData.get('notes') as string) || '';

  if (!customer_name || !amount || amount <= 0 || !due_date) {
    return { error: 'Nama pelanggan, nominal utang valid (>0), dan tanggal jatuh tempo wajib diisi.' };
  }

  const debtId = 'debt-' + crypto.randomUUID();
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
        updated_at: now,
      }
    ]);

  if (error) {
    console.error('Error adding debt:', error);
    return { error: 'Gagal menyimpan catatan kasbon: ' + error.message };
  }

  // Jika pinjaman uang tunai, catat sebagai transaksi pengeluaran (OUT) di buku kas
  if (type === 'PINJAMAN_TUNAI') {
    try {
      await supabase.from('transactions').insert([
        {
          umkm_id: user.id,
          type: 'OUT',
          category: 'PINJAMAN_KASBON',
          payment_method: 'CASH',
          payment_status: 'PAID',
          total_amount: amount,
          items: [{ name: `Pinjaman Tunai: ${customer_name}`, quantity: 1, price: amount, subtotal: amount }],
          debt_id: debtId,
          transaction_date: now,
          created_at: now,
        }
      ]);
    } catch (trxErr) {
      console.warn('Gagal mencatat transaksi OUT kasbon tunai:', trxErr);
    }
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

/**
 * [Zaki] Pencatatan bayar kasbon (cicil sebagian / bayar lunas)
 * - Memperbarui paid_amount dan remaining_amount di debts
 * - Memperbarui status: 'UNPAID' | 'PARTIAL' | 'PAID'
 * - Mencatat riwayat pembayaran ke tabel payment_logs
 * - Mencatat transaksi pemasukan kas (IN) ke tabel transactions
 */
export async function recordDebtPayment(input: PayDebtInput) {
  const user = await getUser();
  if (!user) {
    return { error: 'Sesi akun tidak ditemukan. Silakan login kembali.' };
  }

  const { debtId, amountPaid, paymentMethod = 'CASH', notes } = input;

  if (!debtId || !amountPaid || amountPaid <= 0) {
    return { error: 'ID kasbon dan nominal pembayaran valid (>0) wajib diisi.' };
  }

  // 1. Ambil data kasbon saat ini
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

  // 2. Update data debts
  const { error: updateErr } = await supabase
    .from('debts')
    .update({
      paid_amount: newPaidAmount,
      remaining_amount: newRemaining,
      status: newStatus,
      updated_at: now,
    })
    .eq('id', debtId)
    .eq('umkm_id', user.id);

  if (updateErr) {
    console.error('Error updating debt payment:', updateErr);
    return { error: 'Gagal memperbarui kasbon: ' + updateErr.message };
  }

  // 3. Catat riwayat di payment_logs
  const logId = 'log-' + crypto.randomUUID();
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

  // 4. Catat transaksi pemasukan kas (IN) ke Buku Kas
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

export async function toggleDebtStatus(debtId: string, currentStatus: 'UNPAID' | 'PARTIAL' | 'PAID') {
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
      updated_at: now,
    })
    .eq('id', debtId)
    .eq('umkm_id', user.id);

  if (error) {
    console.error('Error updating debt status:', error);
    return { error: 'Gagal memperbarui status: ' + error.message };
  }

  if (isNowPaid) {
    // Buat log pembayaran penuh
    await supabase.from('payment_logs').insert([
      {
        id: 'log-' + crypto.randomUUID(),
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

  // Hapus log pembayaran terkait terlebih dahulu
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
  const type = ((formData.get('type') as string) || 'BARANG') as 'BARANG' | 'PINJAMAN_TUNAI';
  const notes = (formData.get('notes') as string) || '';

  if (!id || !customer_name || !amount || !due_date) {
    return { error: 'Data tidak lengkap.' };
  }

  // Hitung ulang remaining_amount berdasarkan paid_amount saat ini
  const { data: currentDebt } = await supabase
    .from('debts')
    .select('paid_amount')
    .eq('id', id)
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
      updated_at: new Date().toISOString(),
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
