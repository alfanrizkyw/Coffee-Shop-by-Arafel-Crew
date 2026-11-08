import TrackOrder from '@/components/customer/TrackOrder';
import { ToastProvider } from '@/components/Toast';

export const metadata = { title: 'Lacak Pesanan' };

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <ToastProvider>
      <TrackOrder token={token} />
    </ToastProvider>
  );
}