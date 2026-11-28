import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();
  let dbStatus: 'connected' | 'degraded' = 'connected';
  let dbLatencyMs = 0;

  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    dbLatencyMs = Date.now() - startedAt;
    if (error) {
      dbStatus = 'degraded';
    }
  } catch {
    dbLatencyMs = Date.now() - startedAt;
    dbStatus = 'degraded';
  }

  return NextResponse.json(
    {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      app: 'wadira-warung-digital',
      database: dbStatus,
      latencyMs: dbLatencyMs,
      timestamp: new Date().toISOString(),
    },
    { status: dbStatus === 'connected' ? 200 : 503 }
  );
}
