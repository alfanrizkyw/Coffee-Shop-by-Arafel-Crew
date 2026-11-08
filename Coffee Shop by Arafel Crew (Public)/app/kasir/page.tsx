import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import KasirApp from '@/components/staff/KasirApp';
import { ToastProvider } from '@/components/Toast';

export const metadata = { title: 'Kasir' };

export default async function KasirPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return (
    <ToastProvider>
      <KasirApp username={session.username} role={session.role} />
    </ToastProvider>
  );
}