import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import type { Product, Transaction, Category } from '@/types';
import TransaksiClient from './TransaksiClient';

export const dynamic = 'force-dynamic';

export default async function TransaksiPage() {
  const user = await getCurrentUser();
  let products: Product[] = [];
  let categories: Category[] = [];
  let recentTransactions: Transaction[] = [];

  if (user?.id) {
    try {
      const [prodRes, catRes, trxRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('umkm_id', user.id)
          .order('name', { ascending: true }),
        supabase
          .from('categories')
          .select('*')
          .eq('umkm_id', user.id)
          .order('name', { ascending: true }),
        supabase
          .from('transactions')
          .select('*')
          .eq('umkm_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (prodRes.data) products = prodRes.data as Product[];
      if (catRes.data) categories = catRes.data as Category[];
      if (trxRes.data) recentTransactions = trxRes.data as Transaction[];
    } catch (e) {
      console.error('Error fetching data for transaksi page:', e);
    }
  }

  return (
    <TransaksiClient
      user={user}
      initialProducts={products}
      initialCategories={categories}
      initialRecentTransactions={recentTransactions}
    />
  );
}

