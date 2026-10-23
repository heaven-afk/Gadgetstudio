import { redirect } from 'next/navigation';
import { configured } from '@/lib/config';
import CompleteSignIn from '@/components/complete-sign-in';
export const dynamic = 'force-dynamic';
export default function Page() {
  if (!configured()) redirect('/sign-in');
  return <CompleteSignIn />;
}
