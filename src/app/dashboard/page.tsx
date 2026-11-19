import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardIndexPage() {
  const user = await getCurrentUser();

  if (user?.role === 'penjual' || user?.role === 'admin') {
    redirect('/dashboard/penjual');
  } else {
    redirect('/dashboard/pelanggan');
  }
}
