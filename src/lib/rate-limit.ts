import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();

  constructor() {
    // Bersihkan entri kedaluwarsa secara berkala agar memori tetap hemat
    if (typeof setInterval !== 'undefined') {
      const timer = setInterval(() => {
        const now = Date.now();
        for (const [key, value] of this.store.entries()) {
          if (now > value.resetTime) {
            this.store.delete(key);
          }
        }
      }, 60000);

      // Jangan tahan proses node agar bisa exit secara wajar saat build/shutdown
      if (timer.unref) {
        timer.unref();
      }
    }
  }

  check(
    key: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number; retryAfterSeconds: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: Math.max(0, limit - 1),
        resetTime,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }

    if (entry.count >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfterSeconds,
      };
    }

    entry.count += 1;
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
    return {
      allowed: true,
      remaining: Math.max(0, limit - entry.count),
      resetTime: entry.resetTime,
      retryAfterSeconds,
    };
  }

  // Khusus untuk pengujian / reset cache jika diperlukan
  reset(key?: string) {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}

export const globalRateLimiter = new RateLimiter();

/**
 * Ekstrak IP klien secara andal dari header request
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  return '127.0.0.1';
}

interface CheckRateLimitOptions {
  limit?: number; // Maksimum request dalam window (default: 30)
  windowMs?: number; // Durasi jendela waktu dalam ms (default: 60000 / 1 menit)
  prefix?: string; // Identifier prefix unik per endpoint
  customKey?: string; // Kustom key (misal userId) jika tidak ingin pakai IP
}

/**
 * Utilitas untuk membatasi laju request (Rate Limiting).
 * Jika melebihi kuota, mengembalikan NextResponse dengan status 429 Too Many Requests.
 * Jika masih dalam kuota, mengembalikan null.
 */
export function applyRateLimit(
  req: Request,
  options: CheckRateLimitOptions = {}
): { response: NextResponse | null; remaining: number } {
  const limit = options.limit ?? 30;
  const windowMs = options.windowMs ?? 60 * 1000;
  const prefix = options.prefix ?? 'global';
  const identifier = options.customKey || getClientIp(req);
  const key = `${prefix}:${identifier}`;

  const result = globalRateLimiter.check(key, limit, windowMs);

  if (!result.allowed) {
    const res = NextResponse.json(
      {
        error: 'Terlalu banyak permintaan (Rate limit exceeded). Silakan coba lagi beberapa saat.',
        retryAfterSeconds: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfterSeconds),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
        },
      }
    );
    return { response: res, remaining: 0 };
  }

  return { response: null, remaining: result.remaining };
}
