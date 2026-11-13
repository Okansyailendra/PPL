import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatProductResponse } from '@/lib/product-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/catalog/[id]
 * Mengambil detail produk dari database untuk halaman detail pembeli.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const { data: rawProduct, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !rawProduct) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    const formatted = formatProductResponse(rawProduct);
    const stock = Number(formatted.stock) || 0;
    const minStock = Number(formatted.min_stock) || 5;

    return NextResponse.json({
      success: true,
      data: {
        ...formatted,
        stock,
        min_stock: minStock,
        isLowStock: stock > 0 && stock <= minStock,
        isOutOfStock: stock <= 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching catalog product detail:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

