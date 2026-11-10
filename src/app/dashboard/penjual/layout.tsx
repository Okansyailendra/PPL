import { cookies } from 'next/headers';
import DashboardShell from '@/components/admin/DashboardShell';
import { supabase } from '@/lib/supabase';
import type { UserSession } from '@/types';

export default async function PenjualLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userSessionStr = cookieStore.get('userSession')?.value;
  let user: UserSession | null = userSessionStr ? JSON.parse(userSessionStr) : null;

  if (user?.id) {
    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, email, store_name, owner_name, phone_number')
        .eq('id', user.id)
        .single();
      if (dbUser) {
        user = dbUser;
      }
    } catch (e) {
      console.error('Error fetching fresh user in PenjualLayout:', e);
    }
  }

  return (
    <DashboardShell user={user}>
      {children}
    </DashboardShell>
  );
}
