import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import type { Debt, Product, UserSession } from '@/types';
import RingkasanClient from './RingkasanClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('userSession')?.value;
  let user: UserSession | null = null;
  let debts: Debt[] = [];
  let products: Product[] = [];

  if (sessionCookie) {
    try {
      user = JSON.parse(sessionCookie);
      if (user?.id) {
        const [debtsRes, productsRes, userRes] = await Promise.all([
          supabase.from('debts').select('*').eq('umkm_id', user.id),
          supabase.from('products').select('*').eq('umkm_id', user.id),
          supabase.from('users').select('id, email, store_name, owner_name, phone_number').eq('id', user.id).single()
        ]);
        if (debtsRes.data) debts = debtsRes.data;
        if (productsRes.data) products = productsRes.data;
        if (userRes.data) user = userRes.data;
      }
    } catch (e) {
      console.error('Error fetching data in DashboardPage:', e);
    }
  }

  return <RingkasanClient user={user} products={products} debts={debts} />;
}
