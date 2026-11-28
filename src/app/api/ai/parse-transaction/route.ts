import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSellerApi } from '@/lib/auth';
import { applyRateLimit } from '@/lib/rate-limit';
import { parseTransactionText } from '@/lib/ai-transaction-parser';
import type { Product } from '@/types';

/**
 * GET /api/ai/parse-transaction
 * Wajib terautentikasi sebagai Penjual / Admin.
 */
export async function GET(req: NextRequest) {
  const auth = await requireSellerApi(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const textQuery = searchParams.get('text');

  if (textQuery) {
    return handleParseRequest(auth.user.id, textQuery);
  }

  // Dokumentasi Endpoint untuk Pengembang / Dosen Penguji
  return NextResponse.json({
    endpoint: '/api/ai/parse-transaction',
    description:
      'Engine Parser Teks Transaksi Berbasis AI (LLM / NLP Entity Extraction) untuk Warung Digital Wadira',
    developer: 'Zaki [DEL-6]',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    payload_schema: {
      text: 'string (wajib, contoh: "laku indomi 3, telur 1/2 kg, rokok surya 1 bks cash")',
      store_id: 'string (opsional, ID UMKM untuk mencocokkan stok toko spesifik)',
    },
    response_schema: {
      success: 'boolean',
      data: {
        action: "'SALE' | 'RESTOCK'",
        payment_method: "'CASH' | 'QRIS' | 'CREDIT'",
        payment_status: "'PAID' | 'UNPAID' | 'PENDING'",
        customer_name: 'string | null',
        total_estimated: 'number',
        matched_count: 'number',
        unmatched_count: 'number',
        items: [
          {
            product_id: 'string | null',
            name: 'string',
            raw_query: 'string',
            quantity: 'number',
            unit: 'string',
            price: 'number',
            subtotal: 'number',
            matched: 'boolean',
            match_type: "'EXACT' | 'FUZZY' | 'UNMATCHED'",
            confidence: 'number',
            current_stock: 'number | null',
          },
        ],
        engine: "'GEMINI_LLM' | 'HEURISTIC_RULE_FALLBACK'",
      },
    },
    examples: [
      'laku indomi 3, telur 1/2 kg',
      'beli rokok surya 1 bungkus, le mineral 2 botol bayar cash',
      'pak budi kasbon beras 5 kg sama masako sapi 2 renteng',
      'kulakan minyak goreng bimoli 10 botol, sabun nuvo 2 lusin',
      'token listrik 50rb bu ani bayar qris',
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitCheck = applyRateLimit(req, {
      limit: 60,
      windowMs: 60 * 1000,
      prefix: 'ai_parse_transaction',
    });
    if (rateLimitCheck.response) {
      return rateLimitCheck.response;
    }

    const auth = await requireSellerApi(req);
    if (auth.errorResponse) return auth.errorResponse;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Format body request tidak valid. Harap kirimkan format JSON { "text": "..." }',
        },
        { status: 400 }
      );
    }

    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parameter "text" wajib diisi dengan kalimat/catatan transaksi kasir.',
          example: 'laku indomi 3, telur 1/2 kg',
        },
        { status: 400 }
      );
    }

    return await handleParseRequest(auth.user.id, text);
  } catch (err: any) {
    console.error('[API /api/ai/parse-transaction] Unhandled error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Terjadi kesalahan internal saat memproses parsing transaksi AI.',
      },
      { status: 500 }
    );
  }
}

async function handleParseRequest(targetUmkmId: string, text: string) {
  let catalogProducts: Product[] = [];
  try {
    const { data: dbProducts, error: dbError } = await supabase
      .from('products')
      .select('*')
      .eq('umkm_id', targetUmkmId);

    if (!dbError && dbProducts) {
      catalogProducts = dbProducts as Product[];
    }
  } catch (dbQueryErr) {
    console.warn('[API /api/ai/parse-transaction] Gagal memuat produk database:', dbQueryErr);
  }

  const parseResult = await parseTransactionText(text, {
    catalogProducts,
    storeId: targetUmkmId,
  });

  return NextResponse.json({
    success: true,
    message: `Berhasil mem-parsing ${parseResult.items.length} item transaksi.`,
    data: {
      action: parseResult.action,
      payment_method: parseResult.paymentMethod,
      payment_status: parseResult.paymentStatus,
      customer_name: parseResult.customerName,
      customer_phone: parseResult.customerPhone || null,
      notes: parseResult.notes,
      total_estimated: parseResult.totalEstimated,
      matched_count: parseResult.matchedCount,
      unmatched_count: parseResult.unmatchedCount,
      items: parseResult.items.map((it) => ({
        product_id: it.productId,
        name: it.name,
        raw_query: it.rawQuery,
        quantity: it.quantity,
        unit: it.unit,
        price: it.price,
        subtotal: it.subtotal,
        matched: it.matched,
        match_type: it.matchType,
        confidence: it.confidence,
        current_stock: it.currentStock,
        category: it.category,
      })),
      engine: parseResult.engine,
      raw_input: parseResult.rawInput,
      timestamp: new Date().toISOString(),
    },
  });
}
