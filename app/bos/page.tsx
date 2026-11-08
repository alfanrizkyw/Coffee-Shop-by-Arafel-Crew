import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import BosApp from '@/components/staff/BosApp';
import { ToastProvider } from '@/components/Toast';

export const metadata = { title: 'Panel Bos' };

export default async function BosPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return (
    <ToastProvider>
      <BosApp username={session.username} role={session.role} />
    </ToastProvider>
  );
}