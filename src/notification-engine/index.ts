import { createEngine, createHealth } from '@/modules/engine';

const hasEmail = () => Boolean(process.env.RESEND_API_KEY);
const hasSms = () => Boolean(process.env.SMS_API_KEY);
const hasWhatsapp = () => Boolean(process.env.WHATSAPP_API_KEY);

async function healthCheck() {
  const channels = {
    email: hasEmail(),
    sms: hasSms(),
    whatsapp: hasWhatsapp(),
  };
  const channelCount = Object.values(channels).filter(Boolean).length;
  return createHealth(
    channelCount > 0 ? 'healthy' : 'degraded',
    channelCount > 0 ? 'Notification channels configured' : 'No notification channels configured',
    { channels }
  );
}

export const engine = createEngine({
  id: 'notification-engine',
  name: 'Notification Engine',
  description: 'Email, SMS, WhatsApp, and in-app notifications.',
  capabilities: ['email alerts', 'sms alerts', 'whatsapp alerts', 'in-app notifications'],
  dependencies: ['supabase'],
  healthCheck,
});
