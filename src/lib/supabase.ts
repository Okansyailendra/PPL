import { createClient } from '@supabase/supabase-js';
import { mysqlClient } from './mysql-client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  !supabaseUrl.includes('placeholder.supabase.co');

export const supabase: any = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : mysqlClient;
