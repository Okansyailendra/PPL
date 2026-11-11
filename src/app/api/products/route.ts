import { NextResponse } from 'next/server';
import crypto from 'crypto';
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
 * GET /api/products
 * Mendukung query opsional: ?category_id=..., ?category=..., ?search=..., ?low_stock=true
 */
export async function GET(req: Request) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const categoryId = url.searchParams.get('category_id')?.trim();
  const categoryName = url.searchParams.get('category')?.trim().toLowerCase();
  const search = url.searchParams.get('search')?.trim().toLowerCase();
  const lowStockOnly = url.searchParams.get('low_stock') === 'true';

  let query = supabase
    .from('products')
    .select('*')
    .eq('umkm_id', user.id)
    .order('name', { ascending: true });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data: products, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: 'Gagal mengambil data produk: ' + error.message },
      { status: 500 }
    );
  }

  let filtered = (products || []) as any[];
  if (categoryName) {
    filtered = filtered.filter(
      (p) => String(p.category || '').toLowerCase() === categoryName
    );
  }
  if (search) {
    filtered = filtered.filter((p) =>
      String(p.name || '').toLowerCase().includes(search)
    );
  }
  if (lowStockOnly) {
    filtered = filtered.filter((p) => Number(p.stock) <= Number(p.min_stock));
  }

  return NextResponse.json({
    success: true,
    data: filtered.map(formatProductResponse),
  });
}

/**
 * POST /api/products
 * Menerima field: name, price/harga_jual, cost_price/modal, stock, min_stock, unit (pcs/renceng/pack/dll), category_id, category
 */
export async function POST(req: Request) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const rawPrice = body?.harga_jual ?? body?.price;
    const rawCostPrice = body?.modal ?? body?.cost_price ?? 0;
    const rawStock = body?.stock ?? 0;
    const rawMinStock = body?.min_stock ?? 5;

    const price = Number(rawPrice);
    const cost_price = Number(rawCostPrice);
    const stock = Number(rawStock);
    const min_stock = Number(rawMinStock);
    const unit = normalizeUnit(body?.unit, 'pcs');

    if (!name || rawPrice === undefined || isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: 'Nama produk dan harga jual (price/harga_jual) valid wajib diisi.' },
        { status: 400 }
      );
    }

    if (isNaN(cost_price) || cost_price < 0 || isNaN(stock) || stock < 0 || isNaN(min_stock) || min_stock < 0) {
      return NextResponse.json(
        { error: 'Nilai modal, stok, dan batas minimum stok tidak boleh negatif.' },
        { status: 400 }
      );
    }

    const catResolved = await resolveCategoryForUmkm(
      user.id,
      typeof body?.category_id === 'string' ? body.category_id.trim() : null,
      typeof body?.category === 'string' ? body.category.trim() : null
    );

    if (catResolved.error) {
      return NextResponse.json({ error: catResolved.error }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const newProduct = {
      id,
      umkm_id: user.id,
      category_id: catResolved.category_id,
      category: catResolved.category,
      name,
      price: Math.round(price),
      cost_price: Math.round(cost_price),
      stock: Math.round(stock),
      min_stock: Math.round(min_stock),
      unit,
    };

    const { data, error } = await supabase
      .from('products')
      .insert([newProduct])
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Gagal menambahkan produk: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Produk berhasil ditambahkan.',
        data: formatProductResponse(data || newProduct),
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Payload JSON tidak valid: ' + (err?.message || 'Bad Request') },
      { status: 400 }
    );
  }
}

/**
 * PUT /api/products
 * Memperbarui produk berdasarkan `id` pada body JSON.
 */
export async function PUT(req: Request) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id.trim() : '';

    if (!id) {
      return NextResponse.json(
        { error: 'ID produk wajib diisi.' },
        { status: 400 }
      );
    }

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
 * DELETE /api/products?id=... (atau body { id })
 */
export async function DELETE(req: Request) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  try {
    const url = new URL(req.url);
    let id = url.searchParams.get('id')?.trim() || '';

    if (!id) {
      try {
        const body = await req.json();
        id = typeof body?.id === 'string' ? body.id.trim() : '';
      } catch {
        // body kosong
      }
    }

    if (!id) {
      return NextResponse.json(
        { error: 'ID produk wajib disertakan.' },
        { status: 400 }
      );
    }

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
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Gagal memproses permintaan: ' + (err?.message || 'Server Error') },
      { status: 500 }
    );
  }
}

