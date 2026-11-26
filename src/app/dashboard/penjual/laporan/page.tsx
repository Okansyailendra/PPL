import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import type { Product, Debt } from '@/types';
import { isConfirmedTransaction } from '@/lib/ledger';
import LaporanClient from './LaporanClient';

export const dynamic = 'force-dynamic';

export default async function LaporanPage() {
  const user = await getCurrentUser();
  let transactions: any[] = [];
  let products: Product[] = [];
  let debts: Debt[] = [];

  if (user?.id) {
    try {
      const [trxRes, prodRes, debtRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('umkm_id', user.id).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('umkm_id', user.id),
        supabase.from('debts').select('*').eq('umkm_id', user.id)
      ]);
      if (trxRes.data) {
        transactions = trxRes.data.filter(isConfirmedTransaction);
      }
      if (prodRes.data) products = prodRes.data;
      if (debtRes.data) debts = debtRes.data;
    } catch (e) {
      console.error('Error fetching data for laporan:', e);
    }
  }

  return (
    <LaporanClient 
      user={user} 
      initialTransactions={transactions} 
      products={products} 
      debts={debts} 
    />
  );
}
