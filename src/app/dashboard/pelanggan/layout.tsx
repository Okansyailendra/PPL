import { getCurrentUser } from '@/lib/auth';
import PelangganShell from '@/components/pembeli/PelangganShell';

export const dynamic = 'force-dynamic';

export default async function PelangganLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <PelangganShell user={user}>
      {children}
    </PelangganShell>
  );
}
