import { supabase } from '@/lib/supabase';

export const ALLOWED_UNITS = [
  'pcs',
  'renceng',
  'pack',
  'bungkus',
  'botol',
  'dus',
  'sak',
  'karung',
  'kg',
  'liter',
  'kaleng',
  'galon',
  'kotak',
  'pouch',
  'sachet',
  'tabung',
  'butir',
] as const;

/**
 * Memformat baris produk dari DB agar kompatibel dengan field UI (`price`, `cost_price`)
 * maupun alias spesifikasi backend (`harga_jual`, `modal`).
 */
export function formatProductResponse(product: any) {
  if (!product) return null;
  return {
    ...product,
    harga_jual: product.price,
    modal: product.cost_price ?? 0,
  };
}

/**
 * Memvalidasi dan menormalkan payload input produk dari API.
 */
export async function resolveCategoryForUmkm(
  umkmId: string,
  categoryId?: string | null,
  categoryName?: string | null
): Promise<{ category_id: string | null; category: string | null; error?: string }> {
  if (categoryId) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', categoryId)
      .eq('umkm_id', umkmId)
      .single();

    if (!cat) {
      return {
        category_id: null,
        category: null,
        error: 'Kategori tidak ditemukan untuk toko Anda.',
      };
    }

    return { category_id: cat.id, category: cat.name };
  }

  if (categoryName && categoryName.trim()) {
    const cleanName = categoryName.trim();
    const { data: existingCats } = await supabase
      .from('categories')
      .select('id, name')
      .eq('umkm_id', umkmId);

    const matched = (existingCats || []).find(
      (c: any) => String(c.name).toLowerCase() === cleanName.toLowerCase()
    );
    if (matched) {
      return { category_id: matched.id, category: matched.name };
    }
    return { category_id: null, category: cleanName };
  }

  return { category_id: null, category: null };
}

export function normalizeUnit(unitInput: unknown, fallback = 'pcs'): string {
  if (typeof unitInput !== 'string' || !unitInput.trim()) return fallback;
  return unitInput.trim();
}

