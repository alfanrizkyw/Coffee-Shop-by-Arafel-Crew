import CustomerApp from '@/components/customer/CustomerApp';
import { ToastProvider } from '@/components/Toast';

export default function HomePage() {
  return (
    <ToastProvider>
      <CustomerApp />
    </ToastProvider>
  );
}