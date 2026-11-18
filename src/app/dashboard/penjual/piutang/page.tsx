import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import PiutangClient from './PiutangClient';
import type { Debt } from '@/types';

export const dynamic = 'force-dynamic';

export default async function PiutangPage() {
  const user = await getCurrentUser();
  let debts: Debt[] = [];
  
  if (user?.id) {
    try {
      const { data } = await supabase
        .from('debts')
        .select('*')
        .eq('umkm_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) debts = data;
    } catch (e) {
      console.error('Error fetching debts in PiutangPage:', e);
    }
  }

  return <PiutangClient initialDebts={debts} />;
}
