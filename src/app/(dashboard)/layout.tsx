import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStores } from '@/app/actions/stores';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { StoreProvider } from '@/components/dashboard/store-provider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const stores = await getStores();

  if (stores.length === 0) {
    redirect('/onboarding');
  }

  return (
    <StoreProvider stores={stores}>
      <DashboardShell>{children}</DashboardShell>
    </StoreProvider>
  );
}
