import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedCashier } from '@/lib/auth';

function unauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized. Silakan login kasir terlebih dahulu.' },
    { status: 401 }
  );
}

/**
 * GET /api/categories
 * Mengambil seluruh kategori milik toko/kasir yang login.
 */
export async function GET(req: Request) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .eq('umkm_id', user.id)
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: 'Gagal mengambil data kategori: ' + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: categories || [],
  });
}

/**
 * POST /api/categories
 * Membuat kategori produk baru.
 */
export async function POST(req: Request) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const description =
      typeof body?.description === 'string' ? body.description.trim() || null : null;

    if (!name) {
      return NextResponse.json(
        { error: 'Nama kategori wajib diisi.' },
        { status: 400 }
      );
    }

    // Cek duplikat nama kategori pada UMKM yang sama
    const { data: existingList } = await supabase
      .from('categories')
      .select('id, name')
      .eq('umkm_id', user.id);

    const isDuplicate = (existingList || []).some(
      (c: any) => String(c.name).toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      return NextResponse.json(
        { error: `Kategori "${name}" sudah ada.` },
        { status: 409 }
      );
    }

    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          id,
          umkm_id: user.id,
          name,
          description,
        },
      ])
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Gagal menambahkan kategori: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Kategori berhasil ditambahkan.',
        data: data || { id, umkm_id: user.id, name, description },
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
 * PUT /api/categories
 * Memperbarui kategori berdasarkan `id` pada body JSON.
 */
export async function PUT(req: Request) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const description =
      body?.description !== undefined
        ? typeof body.description === 'string'
          ? body.description.trim() || null
          : null
        : undefined;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'ID dan nama kategori wajib diisi.' },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('umkm_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Kategori tidak ditemukan.' },
        { status: 404 }
      );
    }

    const updatePayload: Record<string, any> = { name };
    if (description !== undefined) {
      updatePayload.description = description;
    }

    const { error } = await supabase
      .from('categories')
      .update(updatePayload)
      .eq('id', id)
      .eq('umkm_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: 'Gagal memperbarui kategori: ' + error.message },
        { status: 500 }
      );
    }

    // Sinkronkan nama kategori pada produk terkait
    await supabase
      .from('products')
      .update({ category: name })
      .eq('category_id', id)
      .eq('umkm_id', user.id);

    const { data: updated } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('umkm_id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Kategori berhasil diperbarui.',
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Payload JSON tidak valid: ' + (err?.message || 'Bad Request') },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/categories?id=... (atau body { id })
 * Menghapus kategori milik kasir yang login.
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
        { error: 'ID kategori wajib disertakan.' },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .eq('umkm_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Kategori tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Lepaskan relasi kategori pada produk terkait sebelum menghapus
    await supabase
      .from('products')
      .update({ category_id: null, category: null })
      .eq('category_id', id)
      .eq('umkm_id', user.id);

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('umkm_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: 'Gagal menghapus kategori: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kategori berhasil dihapus.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Gagal memproses permintaan: ' + (err?.message || 'Server Error') },
      { status: 500 }
    );
  }
}

