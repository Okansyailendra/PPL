import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatProductResponse } from '@/lib/product-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/catalog
 * Endpoint publik untuk etalase pembeli.
 * Mengambil katalog barang riil dan kategori dari database.
 * Mendukung filter: ?search=..., ?category=..., ?stock_filter=all|in_stock|low_stock
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search')?.trim().toLowerCase() || '';
    const categoryParam = url.searchParams.get('category')?.trim() || '';
    const stockFilter = url.searchParams.get('stock_filter') || 'all';

    // 1. Ambil data produk dari database
    const { data: rawProducts, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (prodErr) {
      console.error('Error fetching catalog products:', prodErr);
      return NextResponse.json({ error: 'Gagal mengambil katalog produk' }, { status: 500 });
    }

    // 2. Ambil data kategori dari database
    const { data: rawCategories, error: catErr } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (catErr) {
      console.warn('Warning: Gagal mengambil categories dari db, fallback ke default:', catErr);
    }

    // Format products
    let products = (rawProducts || []).map((p: any) => {
      const formatted = formatProductResponse(p);
      const stock = Number(formatted.stock) || 0;
      const minStock = Number(formatted.min_stock) || 5;
      return {
        ...formatted,
        stock,
        min_stock: minStock,
        isLowStock: stock > 0 && stock <= minStock,
        isOutOfStock: stock <= 0,
      };
    });

    // Filter kategori jika diberikan dan bukan 'all'
    if (categoryParam && categoryParam !== 'all') {
      products = products.filter((p: any) => {
        const catIdMatch = p.category_id === categoryParam;
        const catSlugMatch = String(p.category || '').toLowerCase() === categoryParam.toLowerCase();
        return catIdMatch || catSlugMatch;
      });
    }

    // Filter pencarian
    if (search) {
      products = products.filter((p: any) => {
        const nameMatch = String(p.name || '').toLowerCase().includes(search);
        const brandMatch = String(p.brand || '').toLowerCase().includes(search);
        const catMatch = String(p.category || '').toLowerCase().includes(search);
        return nameMatch || brandMatch || catMatch;
      });
    }

    // Filter status stok
    if (stockFilter === 'in_stock') {
      products = products.filter((p: any) => p.stock > 0);
    } else if (stockFilter === 'low_stock') {
      products = products.filter((p: any) => p.isLowStock);
    }

    // Format categories
    const categories = (rawCategories || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      iconName: c.icon || 'LayoutGrid',
    }));

    return NextResponse.json({
      success: true,
      data: {
        products,
        categories,
        total: products.length,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/catalog:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

