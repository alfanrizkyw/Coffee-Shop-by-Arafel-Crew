import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import DevApp from '@/components/staff/DevApp';
import { ToastProvider } from '@/components/Toast';

export const metadata = { title: 'Developer' };

export default async function DevPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return (
    <ToastProvider>
      <DevApp username={session.username} role={session.role} />
    </ToastProvider>
  );
}