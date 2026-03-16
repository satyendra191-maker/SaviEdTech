import AIAutomationHub from '@/components/admin/ai-automation-hub';
import { createServerSupabaseClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AIAutomationPage() {
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

  const adminRoles = ['admin', 'super_admin', 'technical_support'];
  if (!profile || !adminRoles.includes(profile.role)) {
    redirect('/dashboard');
  }

  return <AIAutomationHub />;
}
