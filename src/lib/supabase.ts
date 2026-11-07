import { mysqlClient } from './mysql-client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseKey) &&
  !supabaseUrl.includes('placeholder.supabase.co');

function createSupabaseClient() {
  if (!isSupabaseConfigured) {
    return mysqlClient;
  }
  // Lazy import hanya ketika Supabase benar-benar dikonfigurasi
  const { createClient } = require('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseKey);
}

// Gunakan MySQL jika Supabase tidak dikonfigurasi
export const supabase: any = createSupabaseClient();
