import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedCashier } from '@/lib/auth';

function unauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized. Silakan login kasir terlebih dahulu.' },
    { status: 401 }
  );
}

/**
 * GET /api/categories/[id]
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  const { id } = await context.params;
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .eq('umkm_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Kategori tidak ditemukan.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
}

/**
 * PUT /api/categories/[id]
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
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const description =
      body?.description !== undefined
        ? typeof body.description === 'string'
          ? body.description.trim() || null
          : null
        : undefined;

    if (!name) {
      return NextResponse.json(
        { error: 'Nama kategori wajib diisi.' },
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

    const updatePayload: Record<string, any> = { name };
    if (description !== undefined) updatePayload.description = description;

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
 * DELETE /api/categories/[id]
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedCashier(req);
  if (!user) return unauthorized();

  const { id } = await context.params;
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
}

