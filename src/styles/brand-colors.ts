/**
 * SaviEduTech Brand Color System
 * AI-powered Education Platform — Complete Design Token Sheet
 */

export const brandColors = {
  // ─── Primary: Electric Blue ───────────────────────────────────────────────
  primary: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',  // base
    600: '#2563EB',  // DEFAULT
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    950: '#172554',
  },

  // ─── Secondary: Cyan (AI / Tech accent) ──────────────────────────────────
  secondary: {
    50:  '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#06B6D4',  // base
    600: '#0891B2',  // DEFAULT
    700: '#0E7490',
    800: '#155E75',
    900: '#164E63',
  },

  // ─── Accent: Violet (intelligence / depth) ───────────────────────────────
  accent: {
    50:  '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',  // base
    600: '#7C3AED',  // DEFAULT
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },

  // ─── Success: Emerald ─────────────────────────────────────────────────────
  success: {
    50:  '#ECFDF5',
    100: '#D1FAE5',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',  // DEFAULT
    700: '#047857',
  },

  // ─── Warning: Amber ───────────────────────────────────────────────────────
  warning: {
    50:  '#FFFBEB',
    100: '#FEF3C7',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',  // DEFAULT
    700: '#B45309',
  },

  // ─── Error: Rose ────────────────────────────────────────────────────────
  error: {
    50:  '#FFF1F2',
    100: '#FFE4E6',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',  // DEFAULT
    700: '#BE123C',
  },

  // ─── Neutral: Slate ───────────────────────────────────────────────────────
  neutral: {
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
} as const;

/** ─── CSS Linear Gradient Presets ──────────────────────────────────────── */
export const brandGradients = {
  /** Hero / CTA: Blue → Indigo → Violet */
  primary:   'linear-gradient(135deg, #2563EB 0%, #4F46E5 50%, #7C3AED 100%)',
  /** AI / Tech: Cyan → Blue */
  ai:        'linear-gradient(135deg, #06B6D4 0%, #2563EB 100%)',
  /** Knowledge: Indigo → Violet → Pink */
  knowledge: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)',
  /** Dark surface */
  dark:      'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
  /** Light surface */
  light:     'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 50%, #F5F3FF 100%)',
  /** Success green */
  success:   'linear-gradient(135deg, #059669 0%, #0891B2 100%)',
  /** Frost glass overlay */
  glass:     'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
  /** Card shimmer */
  shimmer:   'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
} as const;

/** ─── Semantic Alias Map ────────────────────────────────────────────────── */
export const semanticColors = {
  brand:      brandColors.primary[600],
  brandLight: brandColors.primary[400],
  brandDark:  brandColors.primary[800],
  aiAccent:   brandColors.secondary[500],
  deepAccent: brandColors.accent[600],
  text:       brandColors.neutral[900],
  textMuted:  brandColors.neutral[500],
  surface:    brandColors.neutral[50],
  border:     brandColors.neutral[200],
} as const;

export type BrandColorKey     = keyof typeof brandColors;
export type BrandGradientKey  = keyof typeof brandGradients;
export type SemanticColorKey  = keyof typeof semanticColors;
