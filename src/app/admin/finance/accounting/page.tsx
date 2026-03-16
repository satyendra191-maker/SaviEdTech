import FinanceAccountingPanel from '@/components/finance/accounting-panel';
import { createServerSupabaseClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function FinanceAccountingPage() {
  const supabase = createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as any;

  const financeRoles = ['admin', 'super_admin', 'finance', 'finance_manager', 'accountant'];
  if (!profile || !financeRoles.includes(profile.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6 px-6 py-4 bg-white border-b">
        <h1 className="text-2xl font-bold text-gray-900">Tally-like Accounting</h1>
        <p className="text-gray-600">Manage ledgers, vouchers, trial balance, P&L, and balance sheet</p>
      </div>
      <FinanceAccountingPanel />
    </div>
  );
}
