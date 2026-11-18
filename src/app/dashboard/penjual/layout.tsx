import DashboardShell from '@/components/admin/DashboardShell';
import { getCurrentUser } from '@/lib/auth';

export default async function PenjualLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <DashboardShell user={user}>
      {children}
    </DashboardShell>
  );
}
