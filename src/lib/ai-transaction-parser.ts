import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Product, ParsedTransactionItem, ParsedTransactionResponse } from '@/types';

// ============================================================================
// 1. FUZZY STRING MATCHING & SIMILARITY UTILITIES
// ============================================================================

/**
 * Menghitung Levenshtein Distance antara dua string.
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];
  for (let i = 0; i <= an; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bn; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[an][bn];
}

/**
 * Normalisasi teks untuk pencocokan produk (hapus tanda baca, huruf kecil, spasi ganda).
 */
export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Menghitung skor kemiripan (0.0 sampai 1.0) antara teks query kasir dan nama produk database.
 * Menggabungkan: Substring match, Token Overlap (Jaccard), dan Levenshtein distance.
 */
export function calculateProductSimilarity(query: string, target: string): number {
  const normQuery = normalizeText(query);
  const normTarget = normalizeText(target);

  if (!normQuery || !normTarget) return 0;
  if (normQuery === normTarget) return 1.0;

  // 1. Cek Exact Substring
  if (normTarget.includes(normQuery)) {
    // Jika kata query kasir persis terdapat dalam nama produk
    // Semakin proporsional panjangnya, semakin tinggi confidence-nya
    return 0.85 + 0.15 * (normQuery.length / normTarget.length);
  }
  if (normQuery.includes(normTarget)) {
    return 0.85 + 0.15 * (normTarget.length / normQuery.length);
  }

  // 2. Token Set Overlap (misal: "bimoli botol" vs "Minyak Goreng Bimoli Botol 1L")
  const queryTokens = normQuery.split(' ').filter(Boolean);
  const targetTokens = normTarget.split(' ').filter(Boolean);

  let matchedTokens = 0;
  for (const qToken of queryTokens) {
    if (targetTokens.some((tToken) => tToken.includes(qToken) || qToken.includes(tToken))) {
      matchedTokens++;
    } else {
      // Cek toleransi typo token (Levenshtein)
      const hasCloseToken = targetTokens.some((tToken) => {
        const dist = levenshteinDistance(qToken, tToken);
        const maxLen = Math.max(qToken.length, tToken.length);
        return dist <= 2 && maxLen >= 4;
      });
      if (hasCloseToken) matchedTokens += 0.8;
    }
  }

  const tokenScore = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0;
  if (tokenScore >= 0.7) {
    return Math.min(0.95, 0.7 + 0.25 * tokenScore);
  }

  // 3. Normalized Levenshtein Distance
  const maxLen = Math.max(normQuery.length, normTarget.length);
  const dist = levenshteinDistance(normQuery, normTarget);
  const levSimilarity = 1 - dist / maxLen;

  return Math.max(0, Math.min(1, Math.max(tokenScore * 0.7, levSimilarity)));
}

/**
 * Mencocokkan nama query hasil ekstrak AI dengan seluruh produk di database warung.
 */
export function matchProductWithCatalog(
  rawQuery: string,
  catalog: Product[],
  threshold = 0.55
): {
  product: Product | null;
  matchType: 'EXACT' | 'FUZZY' | 'UNMATCHED';
  confidence: number;
} {
  const normQuery = normalizeText(rawQuery);
  if (!normQuery || !catalog || catalog.length === 0) {
    return { product: null, matchType: 'UNMATCHED', confidence: 0 };
  }

  let bestMatch: Product | null = null;
  let highestScore = 0;

  for (const product of catalog) {
    // Cek kesamaan dengan nama produk
    const nameScore = calculateProductSimilarity(normQuery, product.name);

    // Cek juga dengan barcode jika kasir mengetik nomor barcode
    let barcodeScore = 0;
    const barcode = (product as any).barcode;
    if (barcode && (barcode === rawQuery || barcode.includes(rawQuery))) {
      barcodeScore = 1.0;
    }

    const finalScore = Math.max(nameScore, barcodeScore);
    if (finalScore > highestScore) {
      highestScore = finalScore;
      bestMatch = product;
    }
  }

  if (bestMatch && highestScore >= 0.9) {
    return { product: bestMatch, matchType: 'EXACT', confidence: Number(highestScore.toFixed(2)) };
  }

  if (bestMatch && highestScore >= threshold) {
    return { product: bestMatch, matchType: 'FUZZY', confidence: Number(highestScore.toFixed(2)) };
  }

  return { product: null, matchType: 'UNMATCHED', confidence: Number(highestScore.toFixed(2)) };
}

// ============================================================================
// 2. PROMPT ENGINEERING & FEW-SHOT EXAMPLES (LLM)
// ============================================================================

export const SYSTEM_PROMPT_TRANSACTION_PARSER = `
Anda adalah mesin Named Entity Recognition (NER) dan NLP Parser spesialis transaksi kasir Warung Madura dan Toko Kelontong Digital "Wadira".
Tugas Anda adalah membaca catatan teks bebas atau ucapan kasir (bahasa Indonesia percakapan / slang warung), mengekstrak entitas penting transaksi, dan mengembalikannya HANYA DALAM FORMAT JSON VALID yang ketat.

ATURAN PARSING:
1. "action": Tentukan apakah transaksi berupa penjualan ("SALE") atau kulakan/pasok barang ("RESTOCK").
   - Kata kunci "laku", "kejual", "beli", "ambil", "jual", "kasbon", "bungkus" -> "SALE"
   - Kata kunci "kulakan", "masuk stok", "belanja barang", "nambah stok", "datang" -> "RESTOCK"
   - Default jika ambigu: "SALE".

2. "payment_method":
   - "CASH": Uang tunai, "lunas", "uang pas", "tunai", "cash".
   - "CREDIT": Kasbon, utang, ngutang, catat bon, bayar besok, bon pak/bu.
   - "QRIS": Scan qris, transfer, gopay, ovo, shopeepay.
   - Default: "CASH".

3. "customer_name": Nama pelanggan jika kasir menyebutkan (terutama jika kasbon / utang), contoh "pak budi", "bu ani", "mas agus". Jika tidak ada, kembalikan null.

4. "items": Daftar barang yang disebutkan. Setiap item memiliki:
   - "raw_name": Nama barang atau merek yang disebutkan kasir (misal: "indomi goreng", "telur", "rokok surya").
   - "quantity": Jumlah angka desimal/bulat (misal 3, 1, 0.5 untuk setengah/stgh, 0.25 untuk seperempat).
   - "unit": Satuan barang ("Bungkus", "kg", "pcs", "botol", "renteng", "lusin", "kardus", "kotak", dsb).
   - "price_hint": Perkiraan nominal angka jika kasir menyebutkan harga (misal "token 50rb" -> 50000), jika tidak ada isi null.

5. JANGAN menulis penjelasan atau markdown selain JSON. Output WAJIB JSON murni.
`;

export const FEW_SHOT_EXAMPLES = [
  {
    input: 'laku indomi 3, telur 1/2 kg',
    output: {
      action: 'SALE',
      payment_method: 'CASH',
      customer_name: null,
      notes: 'Penjualan tunai kasir',
      items: [
        { raw_name: 'indomi', quantity: 3, unit: 'Bungkus', price_hint: null },
        { raw_name: 'telur', quantity: 0.5, unit: 'kg', price_hint: null },
      ],
    },
  },
  {
    input: 'beli rokok surya 1 bungkus, le mineral 2 botol bayar cash',
    output: {
      action: 'SALE',
      payment_method: 'CASH',
      customer_name: null,
      notes: 'Penjualan tunai',
      items: [
        { raw_name: 'rokok surya', quantity: 1, unit: 'Bungkus', price_hint: null },
        { raw_name: 'le mineral', quantity: 2, unit: 'botol', price_hint: null },
      ],
    },
  },
  {
    input: 'pak budi kasbon beras 5 kg sama masako sapi 2 renteng',
    output: {
      action: 'SALE',
      payment_method: 'CREDIT',
      customer_name: 'Pak Budi',
      notes: 'Kasbon pelanggan Pak Budi',
      items: [
        { raw_name: 'beras', quantity: 5, unit: 'kg', price_hint: null },
        { raw_name: 'masako sapi', quantity: 2, unit: 'renteng', price_hint: null },
      ],
    },
  },
  {
    input: 'kulakan minyak goreng bimoli 10 botol, sabun nuvo 2 lusin',
    output: {
      action: 'RESTOCK',
      payment_method: 'CASH',
      customer_name: null,
      notes: 'Restock kulakan barang',
      items: [
        { raw_name: 'minyak goreng bimoli', quantity: 10, unit: 'botol', price_hint: null },
        { raw_name: 'sabun nuvo', quantity: 24, unit: 'pcs', price_hint: null },
      ],
    },
  },
  {
    input: 'token listrik 50rb bu dewi bayar scan qris',
    output: {
      action: 'SALE',
      payment_method: 'QRIS',
      customer_name: 'Bu Dewi',
      notes: 'Pembelian token listrik via QRIS',
      items: [
        { raw_name: 'token listrik', quantity: 1, unit: 'transaksi', price_hint: 50000 },
      ],
    },
  },
];

// ============================================================================
// 3. HEURISTIC RULE-BASED FALLBACK PARSER (OFFLINE RESILIENCE)
// ============================================================================

/**
 * Parser berbasis aturan (Regex & Heuristik bahasa Indonesia) ketika Gemini API Key belum ada atau kuota habis.
 */
export function heuristicRuleParser(rawText: string): {
  action: 'SALE' | 'RESTOCK';
  payment_method: 'CASH' | 'QRIS' | 'CREDIT';
  customer_name: string | null;
  notes: string;
  items: Array<{ raw_name: string; quantity: number; unit: string; price_hint: number | null }>;
} {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();

  // 1. Tentukan Action
  let action: 'SALE' | 'RESTOCK' = 'SALE';
  if (/kulak|masuk stok|pasok|nambah stok|belanja barang|restock/.test(lower)) {
    action = 'RESTOCK';
  }

  // 2. Tentukan Payment Method & Kasbon Customer
  let payment_method: 'CASH' | 'QRIS' | 'CREDIT' = 'CASH';
  let customer_name: string | null = null;

  if (/kasbon|utang|ngutang|bon/i.test(lower)) {
    payment_method = 'CREDIT';

    // Format A: "pak budi kasbon ..."
    const beforeKasbon = lower.match(/([a-z0-9_\s]{2,20}?)\s+(?:kasbon|utang|ngutang|bon)\b/i);
    // Format B: "kasbon pak budi ..."
    const afterKasbon = lower.match(/(?:kasbon|utang|ngutang|bon)\s+(?:ke\s+|oleh\s+)?(?:pak\s+|bu\s+|mas\s+|mbak\s+)?([a-z0-9_]{2,15})/i);

    if (beforeKasbon && beforeKasbon[1]) {
      const candidate = beforeKasbon[1].replace(/^(?:laku|beli|ambil|transaksi)\s+/i, '').trim();
      const excludedWords = ['indomi', 'telur', 'beras', 'rokok', 'minyak', 'gula', 'kopi', 'sabun'];
      if (candidate.length >= 2 && !excludedWords.includes(candidate.toLowerCase())) {
        customer_name = candidate.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    } else if (afterKasbon && afterKasbon[1]) {
      const candidate = afterKasbon[1].trim();
      const excludedWords = ['indomi', 'telur', 'beras', 'rokok', 'minyak', 'gula', 'kopi', 'sabun', 'sama'];
      if (!excludedWords.includes(candidate.toLowerCase())) {
        customer_name = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  } else if (/qris|transfer|scan|gopay|ovo|shopee/i.test(lower)) {
    payment_method = 'QRIS';
  }

  // Jika nama pelanggan belum terdeteksi dari kasbon, cek apakah kasir menyebut "pak ...", "bu ...", "mas ..."
  if (!customer_name) {
    const personMatch = text.match(/\b(pak|bu|mas|mbak)\s+([a-zA-Z]{3,15})\b/i);
    if (personMatch) {
      customer_name = `${personMatch[1].charAt(0).toUpperCase() + personMatch[1].slice(1).toLowerCase()} ${personMatch[2].charAt(0).toUpperCase() + personMatch[2].slice(1).toLowerCase()}`;
    }
  }

  // 3. Ekstrak Baris Item Belanjaan
  let cleanText = text
    .replace(/^(?:laku|terjual|beli|ambil|kejual|kulakan|belanja)\s+/i, '')
    .replace(/\bbayar\s+(?:cash|tunai|qris|transfer|uang pas)\b/gi, '')
    .replace(/\b(?:via|pakai|scan)?\s*(?:qris|transfer|gopay|ovo)\b/gi, '');

  if (customer_name) {
    cleanText = cleanText
      .replace(new RegExp(`\\b${customer_name}\\b`, 'gi'), ' ')
      .replace(/\b(?:kasbon|utang|ngutang|bon)\b/gi, ' ');
  } else {
    cleanText = cleanText.replace(/\b(?:kasbon|utang|ngutang|bon)\s+(?:ke\s+|oleh\s+)?(?:pak\s+|bu\s+|mas\s+|mbak\s+)?/gi, ' ');
  }

  // Pisahkan kalimat berdasarkan koma, 'dan', 'sama', '+', atau baris baru
  const rawSegments = cleanText
    .split(/(?:,|\bdan\b|\bsama\b|\+|\n)/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  const parsedItems: Array<{ raw_name: string; quantity: number; unit: string; price_hint: number | null }> = [];

  for (const seg of rawSegments) {
    let segClean = seg.trim();
    if (!segClean) continue;

    let quantity = 1;
    let unit = 'pcs';
    let priceHint: number | null = null;

    // 1. Ekstrak Pecahan Kuantitas Terlebih Dahulu (1/2, 1/4, 3/4, setengah, seperempat)
    if (/1\/2|setengah|stgh/i.test(segClean)) {
      quantity = 0.5;
      segClean = segClean.replace(/1\/2|setengah|stgh/gi, ' ').trim();
    } else if (/1\/4|seperempat/i.test(segClean)) {
      quantity = 0.25;
      segClean = segClean.replace(/1\/4|seperempat/gi, ' ').trim();
    } else if (/3\/4/i.test(segClean)) {
      quantity = 0.75;
      segClean = segClean.replace(/3\/4/gi, ' ').trim();
    }

    // 2. Deteksi Lusin (misal "2 lusin" -> quantity = 24 pcs)
    const lusinMatch = segClean.match(/(?:(\d+(?:[.,]\d+)?)\s*)?\blusin\b/i);
    if (lusinMatch) {
      const lusinQty = lusinMatch[1] ? parseFloat(lusinMatch[1].replace(',', '.')) : 1;
      quantity = Math.round(lusinQty * 12);
      unit = 'pcs';
      segClean = segClean.replace(lusinMatch[0], ' ').trim();
    }

    // 3. Ekstrak Satuan lainnya
    const unitMatch = segClean.match(
      /\b(kg|bungkus|bks|botol|btl|buah|pcs|renteng|rtg|dus|kardus|karton|cup|gelas|saset|liter|ltr|pack|btg|batang|sak)\b/i
    );
    if (unitMatch && !lusinMatch) {
      const u = unitMatch[1].toLowerCase();
      if (u === 'bks' || u === 'bungkus') unit = 'Bungkus';
      else if (u === 'kg') unit = 'kg';
      else if (u === 'botol' || u === 'btl') unit = 'Botol';
      else if (u === 'renteng' || u === 'rtg') unit = 'Renteng';
      else if (u === 'kardus' || u === 'dus' || u === 'karton') unit = 'kardus';
      else if (u === 'saset') unit = 'saset';
      else if (u === 'cup' || u === 'gelas') unit = 'cup';
      else if (u === 'sak') unit = 'Sak';
      else unit = u;

      segClean = segClean.replace(new RegExp(`\\b${unitMatch[0]}\\b`, 'i'), ' ').trim();
    }

    // 3. Ekstrak Kuantitas Angka (sebelum harga)
    const numMatch = segClean.match(/(?:^|\s)(\d+(?:[.,]\d+)?)(?:\s|$)/);
    if (numMatch && quantity === 1) {
      const parsedNum = parseFloat(numMatch[1].replace(',', '.'));
      // Jika angka wajar untuk kuantitas barang warung (misal 1 s/d 100)
      if (parsedNum > 0 && parsedNum <= 100 && !/\b(?:rb|k|ribu)\b/i.test(segClean)) {
        quantity = parsedNum;
        segClean = segClean.replace(numMatch[0], ' ').trim();
      }
    }

    // 4. Ekstrak Harga / Nominal (misal "50rb", "20k", "50000", tidak cocok jika berakhiran "kg")
    const priceMatch = segClean.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|\bk\b)(?!g)/i);
    if (priceMatch) {
      const num = parseFloat(priceMatch[1].replace(',', '.'));
      priceHint = Math.round(num * 1000);
      segClean = segClean.replace(priceMatch[0], ' ').trim();
    } else {
      const directPriceMatch = segClean.match(/(?:rp\.?|harga\s*)?\s*(\d{4,7})/i);
      if (directPriceMatch) {
        priceHint = parseInt(directPriceMatch[1], 10);
        segClean = segClean.replace(directPriceMatch[0], ' ').trim();
      }
    }

    // Bersihkan sisa kata hubung
    const finalName = segClean.replace(/^[^\w]+|[^\w]+$/g, '').trim();
    if (finalName.length >= 2) {
      parsedItems.push({
        raw_name: finalName,
        quantity,
        unit,
        price_hint: priceHint,
      });
    }
  }

  // Jika tidak ada item yang terurai sama sekali, masukkan seluruh teks sebagai 1 item
  if (parsedItems.length === 0 && cleanText.length > 1) {
    parsedItems.push({
      raw_name: cleanText,
      quantity: 1,
      unit: 'pcs',
      price_hint: null,
    });
  }

  return {
    action,
    payment_method,
    customer_name,
    notes: `Parsed via Heuristic Rules: "${text}"`,
    items: parsedItems,
  };
}

// ============================================================================
// 4. MAIN ENGINE: PARSE TRANSACTION WITH LLM & FUZZY CATALOG VALIDATION
// ============================================================================

export interface ParseTransactionOptions {
  geminiApiKey?: string;
  catalogProducts?: Product[];
  storeId?: string;
}

/**
 * Fungsi Utama: Mengonversi teks bebas transaksi menjadi format JSON terstruktur
 * dengan validasi dan pencocokan fuzzy ke database katalog produk warung.
 */
export async function parseTransactionText(
  rawInput: string,
  options: ParseTransactionOptions = {}
): Promise<ParsedTransactionResponse> {
  const text = (rawInput || '').trim();
  if (!text) {
    throw new Error('Input teks transaksi tidak boleh kosong.');
  }

  const catalog = options.catalogProducts || [];
  const apiKey = options.geminiApiKey || process.env.GEMINI_API_KEY || '';

  let parsedRaw: {
    action: 'SALE' | 'RESTOCK';
    payment_method: 'CASH' | 'QRIS' | 'CREDIT';
    customer_name: string | null;
    notes?: string | null;
    items: Array<{ raw_name: string; quantity: number | string; unit?: string; price_hint?: number | null }>;
  } | null = null;

  let engineUsed: 'GEMINI_LLM' | 'HEURISTIC_RULE_FALLBACK' = 'HEURISTIC_RULE_FALLBACK';

  // 1. Coba gunakan Gemini AI jika API key tersedia
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];

      const promptPayload = `
Contoh Masukan & Keluaran yang diharapkan:
${JSON.stringify(FEW_SHOT_EXAMPLES, null, 2)}

Teks Transaksi Kasir Sekarang:
"${text}"

Keluarkan HANYA JSON object dengan format yang sama:
`;

      let lastError: any = null;
      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: SYSTEM_PROMPT_TRANSACTION_PARSER,
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1, // Suhu rendah agar deterministic dan akurat
            },
          });

          const result = await model.generateContent(promptPayload);
          const responseText = result.response.text();

          // Bersihkan markdown fence jika ada (```json ... ```)
          const cleanJsonStr = responseText
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

          const jsonParsed = JSON.parse(cleanJsonStr);
          if (jsonParsed && Array.isArray(jsonParsed.items)) {
            parsedRaw = jsonParsed;
            engineUsed = 'GEMINI_LLM';
            break;
          }
        } catch (modelErr) {
          lastError = modelErr;
          continue;
        }
      }

      if (!parsedRaw && lastError) {
        console.warn('[AI Transaction Parser] Gemini gagal, mengalihkan ke fallback heuristik:', lastError?.message);
      }
    } catch (e: any) {
      console.warn('[AI Transaction Parser] Exception pada Gemini LLM:', e?.message);
    }
  }

  // 2. Fallback jika Gemini tidak tersedia atau gagal menghasilkan output
  if (!parsedRaw) {
    parsedRaw = heuristicRuleParser(text);
    engineUsed = 'HEURISTIC_RULE_FALLBACK';
  }

  // 3. Normalisasi Struktur & Pencocokan Fuzzy ke Database Produk
  const action: 'SALE' | 'RESTOCK' = parsedRaw.action === 'RESTOCK' ? 'RESTOCK' : 'SALE';
  const paymentMethod: 'CASH' | 'QRIS' | 'CREDIT' =
    parsedRaw.payment_method === 'CREDIT'
      ? 'CREDIT'
      : parsedRaw.payment_method === 'QRIS'
      ? 'QRIS'
      : 'CASH';

  const paymentStatus: 'PAID' | 'UNPAID' | 'PENDING' =
    paymentMethod === 'CREDIT' ? 'UNPAID' : 'PAID';

  const items: ParsedTransactionItem[] = [];
  let totalEstimated = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const rawItem of parsedRaw.items || []) {
    const rawName = String(rawItem.raw_name || '').trim();
    if (!rawName) continue;

    // Normalisasi kuantitas
    let qty = typeof rawItem.quantity === 'number' ? rawItem.quantity : parseFloat(String(rawItem.quantity));
    if (isNaN(qty) || qty <= 0) qty = 1;

    // Pencocokan fuzzy ke katalog warung
    const matchResult = matchProductWithCatalog(rawName, catalog);
    const matchedProduct = matchResult.product;

    if (matchedProduct) {
      matchedCount++;
      const unit = matchedProduct.unit || rawItem.unit || 'pcs';
      const price = matchedProduct.price || (matchedProduct as any).harga_jual || 0;
      const subtotal = Math.round(price * qty);
      totalEstimated += subtotal;

      items.push({
        productId: matchedProduct.id,
        name: matchedProduct.name,
        rawQuery: rawName,
        quantity: qty,
        unit,
        price,
        subtotal,
        matched: true,
        matchType: matchResult.matchType,
        confidence: matchResult.confidence,
        currentStock: matchedProduct.stock,
        category: (matchedProduct as any).category || null,
      });
    } else {
      unmatchedCount++;
      const priceHint = typeof rawItem.price_hint === 'number' ? rawItem.price_hint : 0;
      const subtotal = Math.round(priceHint * qty);
      totalEstimated += subtotal;

      items.push({
        productId: null,
        name: rawName,
        rawQuery: rawName,
        quantity: qty,
        unit: rawItem.unit || 'pcs',
        price: priceHint,
        subtotal,
        matched: false,
        matchType: 'UNMATCHED',
        confidence: matchResult.confidence,
        currentStock: null,
        category: null,
      });
    }
  }

  return {
    action,
    paymentMethod,
    paymentStatus,
    customerName: parsedRaw.customer_name || null,
    notes: parsedRaw.notes || `Ekstraksi teks: "${text}"`,
    items,
    totalEstimated,
    matchedCount,
    unmatchedCount,
    rawInput: text,
    engine: engineUsed,
  };
}
