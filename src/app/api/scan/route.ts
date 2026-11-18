import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithFallback } from '@/lib/gemini';
import { getCurrentUser } from '@/lib/auth';
import { applyRateLimit } from '@/lib/rate-limit';

// Batas ukuran gambar maksimal ~5MB (dalam base64 string ~7MB)
const MAX_BASE64_LENGTH = 7 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Protection (Maksimal 15 request scan per menit)
    const rateLimitCheck = applyRateLimit(req, {
      limit: 15,
      windowMs: 60 * 1000,
      prefix: 'scan',
    });
    if (rateLimitCheck.response) {
      return rateLimitCheck.response;
    }

    // 2. Autentikasi Pengguna: Hanya merchant/penjual terautentikasi yang dapat memproses scan AI
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Sesi telah berakhir atau Anda belum login' },
        { status: 401 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in .env.local' },
        { status: 500 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Format body request harus berupa JSON yang valid' },
        { status: 400 }
      );
    }

    const imageBase64: string = body?.imageBase64;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { error: 'Tidak ada gambar yang diunggah atau format tidak valid' },
        { status: 400 }
      );
    }

    // 3. Batasi ukuran gambar untuk mencegah serangan Memory Exhaustion DoS
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: 'Ukuran gambar terlalu besar. Maksimal ukuran gambar adalah 5MB.' },
        { status: 413 }
      );
    }

    // 4. Ekstrak dan validasi tipe MIME gambar
    const mimeTypeMatch = imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
    const mimeType = (mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg').toLowerCase();

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Format berkas tidak didukung. Harap unggah gambar JPG, PNG, atau WEBP.' },
        { status: 400 }
      );
    }

    const base64Parts = imageBase64.split(',');
    const base64Data = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];

    if (!base64Data || base64Data.trim().length === 0) {
      return NextResponse.json(
        { error: 'Data base64 gambar kosong' },
        { status: 400 }
      );
    }

    const systemInstruction =
      'Kamu adalah asisten ahli untuk pemilik warung. Analisis gambar yang dikirim pengguna. Jika itu adalah NOTA/STRUK BELANJA, ekstrak daftar barang beserta harganya secara terstruktur. Jika itu adalah FOTO RAK/ETALASE, analisis barang apa yang stoknya mulai menipis atau kosong. Jawab menggunakan bahasa Indonesia yang rapi, dan format hasilnya menggunakan Markdown.';

    const { text } = await generateContentWithFallback(
      [
        'Tolong analisis gambar ini dan berikan laporannya.',
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
      ],
      { systemInstruction }
    );

    return NextResponse.json({ result: text });
  } catch (error: any) {
    console.error('Error in Scan API:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal menganalisis gambar dengan AI' },
      { status: 500 }
    );
  }
}
