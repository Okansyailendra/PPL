import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedCashier } from '@/lib/auth';
import {
  formatProductResponse,
  normalizeUnit,
  resolveCategoryForUmkm,
} from '@/lib/product-utils';

function unauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized. Silakan login kasir terlebih dahulu.' },
    { status: 401 }
  );
}

/**
 * GET /api/products/[id]
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  const { id } = await context.params;
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('umkm_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Produk tidak ditemukan.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: formatProductResponse(data),
  });
}

/**
 * PUT /api/products/[id]
 */
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  try {
    const { id } = await context.params;
    const body = await req.json();

    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('umkm_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan.' },
        { status: 404 }
      );
    }

    const updatePayload: Record<string, any> = {};

    if (typeof body?.name === 'string') {
      const clean = body.name.trim();
      if (!clean) {
        return NextResponse.json({ error: 'Nama produk tidak boleh kosong.' }, { status: 400 });
      }
      updatePayload.name = clean;
    }

    const rawPrice = body?.harga_jual ?? body?.price;
    if (rawPrice !== undefined) {
      const price = Number(rawPrice);
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: 'Harga jual tidak valid.' }, { status: 400 });
      }
      updatePayload.price = Math.round(price);
    }

    const rawCost = body?.modal ?? body?.cost_price;
    if (rawCost !== undefined) {
      const cost_price = Number(rawCost);
      if (isNaN(cost_price) || cost_price < 0) {
        return NextResponse.json({ error: 'Harga modal tidak valid.' }, { status: 400 });
      }
      updatePayload.cost_price = Math.round(cost_price);
    }

    if (body?.stock !== undefined) {
      const stock = Number(body.stock);
      if (isNaN(stock) || stock < 0) {
        return NextResponse.json({ error: 'Stok tidak valid.' }, { status: 400 });
      }
      updatePayload.stock = Math.round(stock);
    }

    if (body?.min_stock !== undefined) {
      const min_stock = Number(body.min_stock);
      if (isNaN(min_stock) || min_stock < 0) {
        return NextResponse.json({ error: 'Batas minimum stok tidak valid.' }, { status: 400 });
      }
      updatePayload.min_stock = Math.round(min_stock);
    }

    if (body?.unit !== undefined) {
      updatePayload.unit = normalizeUnit(body.unit, existing.unit || 'pcs');
    }

    if (body?.category_id !== undefined || body?.category !== undefined) {
      const catResolved = await resolveCategoryForUmkm(
        user.id,
        typeof body?.category_id === 'string' ? body.category_id.trim() : null,
        typeof body?.category === 'string' ? body.category.trim() : null
      );
      if (catResolved.error) {
        return NextResponse.json({ error: catResolved.error }, { status: 400 });
      }
      updatePayload.category_id = catResolved.category_id;
      updatePayload.category = catResolved.category;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada field yang diperbarui.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .eq('umkm_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: 'Gagal memperbarui produk: ' + error.message },
        { status: 500 }
      );
    }

    const { data: updated } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('umkm_id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil diperbarui.',
      data: formatProductResponse(updated),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Payload JSON tidak valid: ' + (err?.message || 'Bad Request') },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  const { id } = await context.params;
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('id', id)
    .eq('umkm_id', user.id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: 'Produk tidak ditemukan.' },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('umkm_id', user.id);

  if (error) {
    return NextResponse.json(
      { error: 'Gagal menghapus produk: ' + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Produk berhasil dihapus.',
  });
}

