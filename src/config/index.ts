export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'SaviEduTech';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const CLOUDFLARE_STREAM_TOKEN = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_TOKEN ?? '';

export const FEATURE_FLAGS = {
  aiEnabled: true,
  examsEnabled: true,
  paymentsEnabled: true,
  notificationsEnabled: true,
};
