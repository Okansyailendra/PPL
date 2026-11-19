import DashboardShell from '@/components/admin/DashboardShell';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function PenjualLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardShell user={user}>
      {children}
    </DashboardShell>
  );
}
