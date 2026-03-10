import { createEngine, createHealth } from '@/modules/engine';
import { isConfigured } from '@/lib/payments/razorpay';

async function healthCheck() {
  const configured = isConfigured();
  return createHealth(
    configured ? 'healthy' : 'degraded',
    configured ? 'Razorpay configured' : 'Razorpay credentials missing',
    { configured }
  );
}

export const engine = createEngine({
  id: 'finance-engine',
  name: 'Finance Engine',
  description: 'Accounting, GST reporting, and payment reconciliation.',
  capabilities: ['ledger management', 'gst reports', 'payment reconciliation'],
  dependencies: ['supabase', 'razorpay'],
  healthCheck,
});
