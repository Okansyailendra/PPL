import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import StokClient from './StokClient';
import type { Category, Product } from '@/types';

export const dynamic = 'force-dynamic';

export default async function StokPage() {
  const user = await getCurrentUser();
  let products: Product[] = [];
  let categories: Category[] = [];

  if (user?.id) {
    try {
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
    } catch (e) {
      console.error('Error fetching products in StokPage:', e);
    }
  }

  return <StokClient initialProducts={products} initialCategories={categories} />;
}
