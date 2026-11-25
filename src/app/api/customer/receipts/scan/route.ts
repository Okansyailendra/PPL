import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithFallback } from '@/lib/gemini';
import { getCurrentUser } from '@/lib/auth';
import { applyRateLimit } from '@/lib/rate-limit';
import type { ScannedReceiptItem } from '@/types';

// Batas ukuran gambar maksimal ~5MB (dalam base64 string ~7MB)
const MAX_BASE64_LENGTH = 7 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];
const ALLOWED_PAYMENT_METHODS = ['CASH', 'QRIS', 'TRANSFER', 'CREDIT', 'ONLINE'] as const;

function toLocalDateTimeInput(rawDate?: string): string {
  const fallback = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatLocal = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (!rawDate || typeof rawDate !== 'string') {
    return formatLocal(fallback);
  }

  const trimmed = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 16);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T12:00`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return formatLocal(parsed);
  }
  return formatLocal(fallback);
}

function parseJsonResponse(rawText: string): any {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitCheck = applyRateLimit(req, {
      limit: 15,
      windowMs: 60 * 1000,
      prefix: 'customer-receipt-scan',
    });
    if (rateLimitCheck.response) {
      return rateLimitCheck.response;
    }

    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Silakan masuk terlebih dahulu untuk memindai struk belanja.' },
        { status: 401 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Layanan AI belum dikonfigurasi (GEMINI_API_KEY tidak tersedia).' },
        { status: 500 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Format body request harus berupa JSON yang valid.' },
        { status: 400 }
      );
    }

    const imageBase64: string = body?.imageBase64;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Tidak ada gambar struk yang diunggah.' },
        { status: 400 }
      );
    }

    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'Ukuran gambar terlalu besar. Maksimal ukuran gambar adalah 5MB.' },
        { status: 413 }
      );
    }

    const mimeTypeMatch = imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
    const mimeType = (mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg').toLowerCase();

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { success: false, error: 'Format gambar tidak didukung. Gunakan JPG, PNG, atau WEBP.' },
        { status: 400 }
      );
    }

    const base64Parts = imageBase64.split(',');
    const base64Data = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];

    if (!base64Data || base64Data.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Data gambar kosong.' },
        { status: 400 }
      );
    }

    const systemInstruction = `Kamu adalah sistem OCR ekstraksi struk belanja fisik Indonesia yang sangat akurat.
Tugasmu mengekstrak data dari foto struk belanja fisik menjadi JSON murni tanpa teks tambahan.
Kembalikan JSON dengan skema persis berikut:
{
  "storeName": "Nama toko/warung pada struk (jika tidak terbaca, isi 'Toko / Warung')",
  "purchaseDate": "Tanggal dan jam belanja dalam format YYYY-MM-DDTHH:mm (jika hanya tanggal, gunakan T12:00; jika tidak terbaca, kosongkan '')",
  "paymentMethod": "Pilih salah satu: CASH, QRIS, TRANSFER, CREDIT, atau ONLINE (default CASH)",
  "items": [
    {
      "name": "Nama barang",
      "quantity": 1,
      "unit": "pcs",
      "price": 5000,
      "subtotal": 5000
    }
  ],
  "totalAmount": 5000,
  "notes": "Catatan singkat opsional seperti nomor struk atau diskon jika ada, jika tidak ada isi ''"
}
Aturan penting:
- Semua nominal harga ("price", "subtotal", "totalAmount") wajib angka bulat integer Rupiah tanpa titik/koma/Rp.
- "quantity" wajib angka positif (default 1 jika tidak tertulis).
- Jika di struk hanya tertulis total per baris ("subtotal") tanpa harga satuan, hitung price = Math.round(subtotal / quantity).
- Jika di struk hanya tertulis harga satuan ("price"), hitung subtotal = Math.round(price * quantity).
- Pastikan daftar barang di "items" hanya berisi item belanjaan (bukan baris TOTAL, TUNAI, KEMBALIAN, atau PPN kecuali relevan sebagai catatan).`;

    const { text } = await generateContentWithFallback(
      [
        'Ekstrak seluruh detail struk belanja fisik ini ke dalam format JSON sesuai skema.',
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
      ],
      {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    );

    const parsed = parseJsonResponse(text);

    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
    const items: ScannedReceiptItem[] = rawItems
      .filter((it: any) => it && String(it.name || '').trim().length > 0)
      .map((it: any) => {
        const quantity = Math.max(1, Math.round(Number(it.quantity) || 1));
        let price = Math.max(0, Math.round(Number(it.price) || 0));
        let subtotal = Math.max(0, Math.round(Number(it.subtotal) || 0));

        if (subtotal > 0 && price === 0) {
          price = Math.round(subtotal / quantity);
        } else if (price > 0 && subtotal === 0) {
          subtotal = price * quantity;
        }

        return {
          name: String(it.name).trim(),
          quantity,
          unit: String(it.unit || 'pcs').trim() || 'pcs',
          price,
          subtotal,
        };
      });

    const computedTotal = items.reduce((sum, it) => sum + it.subtotal, 0);
    const parsedTotal = Math.max(0, Math.round(Number(parsed?.totalAmount) || 0));
    const totalAmount = parsedTotal > 0 ? parsedTotal : computedTotal;

    const rawMethod = String(parsed?.paymentMethod || 'CASH').toUpperCase();
    const paymentMethod = (ALLOWED_PAYMENT_METHODS as readonly string[]).includes(rawMethod)
      ? (rawMethod as (typeof ALLOWED_PAYMENT_METHODS)[number])
      : 'CASH';

    return NextResponse.json({
      success: true,
      receipt: {
        storeName: String(parsed?.storeName || 'Toko / Warung').trim() || 'Toko / Warung',
        purchaseDate: toLocalDateTimeInput(parsed?.purchaseDate),
        paymentMethod,
        items:
          items.length > 0
            ? items
            : [{ name: '', quantity: 1, unit: 'pcs', price: totalAmount, subtotal: totalAmount }],
        totalAmount,
        notes: String(parsed?.notes || '').trim(),
      },
    });
  } catch (error: any) {
    console.error('Error in Customer Receipt Scan API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Gagal membaca struk dengan AI. Anda tetap dapat mengisi detail struk secara manual.',
      },
      { status: 500 }
    );
  }
}
