import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import StokClient from './StokClient';
import type { Category, Product, UserSession } from '@/types';

export default async function StokPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('userSession')?.value;
  let products: Product[] = [];
  let categories: Category[] = [];

  if (sessionCookie) {
    try {
      const user: UserSession = JSON.parse(sessionCookie);
      if (user?.id) {
        const [prodRes, catRes] = await Promise.all([
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
        ]);

        if (prodRes.data) products = prodRes.data as Product[];
        if (catRes.data) categories = catRes.data as Category[];
      }
    } catch (e) {
      console.error('Error fetching products in StokPage:', e);
    }
  }

  return <StokClient initialProducts={products} initialCategories={categories} />;
}
