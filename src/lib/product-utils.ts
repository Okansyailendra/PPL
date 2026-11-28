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
 * Memformat baris produk dari DB untuk dashboard kasir/penjual
 * menyertakan field modal dan cost_price untuk kalkulasi keuntungan.
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
 * Helper khusus etalase publik pelanggan:
 * Menjamin harga modal (cost_price dan modal) tidak bocor ke publik atau kompetitor.
 */
export function formatPublicCatalogProduct(product: any) {
  if (!product) return null;
  const { cost_price, modal, ...publicData } = product;
  return {
    ...publicData,
    harga_jual: product.price,
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

export const DEFAULT_STORE_UMKM_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const PPOB_PULSA_PRICES = [7000, 12000, 17000, 22000, 27000, 32000, 52000, 102000];
const PPOB_LISTRIK_PRICES = [2500, 22000, 52000, 102000, 202000, 502000];
const PPOB_PDAM_PRICES = [2500];

/**
 * Menentukan harga resmi item pesanan di sisi server untuk mencegah manipulasi harga (termasuk PPOB).
 */
export function resolveOfficialOrderPrice(
  product: any,
  requestedPrice?: unknown
): { price?: number; error?: string } {
  const dbPrice = Number(product?.price) || 0;
  if (product?.category !== 'Tagihan & Pulsa') {
    return { price: dbPrice };
  }

  const parsedPrice =
    requestedPrice !== undefined && requestedPrice !== null && requestedPrice !== ''
      ? Math.round(Number(requestedPrice))
      : dbPrice;

  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return { error: `Nominal PPOB untuk "${product?.name || 'Produk'}" tidak valid.` };
  }

  const lowerName = String(product?.name || '').toLowerCase();
  let allowedPrices: number[] | null = null;

  if (lowerName.includes('pulsa')) {
    allowedPrices = PPOB_PULSA_PRICES;
  } else if (lowerName.includes('listrik') || lowerName.includes('token')) {
    allowedPrices = PPOB_LISTRIK_PRICES;
  } else if (lowerName.includes('pdam') || lowerName.includes('air')) {
    allowedPrices = PPOB_PDAM_PRICES;
  }

  if (allowedPrices) {
    if (!allowedPrices.includes(parsedPrice)) {
      return {
        error: `Nominal PPOB Rp${parsedPrice.toLocaleString('id-ID')} untuk "${product.name}" tidak tersedia dalam daftar resmi.`,
      };
    }
    return { price: parsedPrice };
  }

  if (parsedPrice !== dbPrice) {
    return {
      error: `Harga untuk "${product?.name || 'Produk PPOB'}" harus sesuai harga resmi toko.`,
    };
  }

  return { price: dbPrice };
}

