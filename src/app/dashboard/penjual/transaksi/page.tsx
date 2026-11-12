import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import type { UserSession, Product, Transaction, Category } from '@/types';
import TransaksiClient from './TransaksiClient';

export default async function TransaksiPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('userSession')?.value;
  let user: UserSession | null = null;
  let products: Product[] = [];
  let categories: Category[] = [];
  let recentTransactions: Transaction[] = [];

  if (sessionCookie) {
    try {
      user = JSON.parse(sessionCookie);
      if (user?.id) {
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
      }
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

