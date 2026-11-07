import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardIndexPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('userSession')?.value;

  if (session) {
    redirect('/dashboard/penjual');
  } else {
    redirect('/dashboard/pelanggan');
  }
}
