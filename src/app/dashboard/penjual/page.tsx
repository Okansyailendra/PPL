import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import type { Debt, Product, UserSession } from '@/types';
import RingkasanClient from './RingkasanClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  let debts: Debt[] = [];
  let products: Product[] = [];

  if (user?.id) {
    try {
      const [debtsRes, productsRes] = await Promise.all([
        supabase.from('debts').select('*').eq('umkm_id', user.id),
        supabase.from('products').select('*').eq('umkm_id', user.id),
      ]);
      if (debtsRes.data) debts = debtsRes.data;
      if (productsRes.data) products = productsRes.data;
    } catch (e) {
      console.error('Error fetching data in DashboardPage:', e);
    }
  }

  return <RingkasanClient user={user} products={products} debts={debts} />;
}
