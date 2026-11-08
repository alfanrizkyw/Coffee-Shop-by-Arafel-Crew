import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { homeFor } from '@/lib/session';
import LoginForm from '@/components/staff/LoginForm';

export const metadata = { title: 'Login Staff' };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));
  return <LoginForm />;
}