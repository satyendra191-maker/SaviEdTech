# SaviEduTech Brand Guidelines

> **Version:** 2.0 · **Updated:** March 2026 · **Platform:** AI-powered Education (India)

---

## 1. Brand Identity

**SaviEduTech** is an AI-powered education platform for Class 6–12 students, teachers, and parents. Our brand personality is:

- **Futuristic** — rooted in emerging technology (AI, 3D, neural networks)
- **Intelligent** — data-driven, adaptive, personalized
- **Trustworthy** — dependable for competitive exams (JEE/NEET/Board)
- **Clean SaaS** — modern, uncluttered, professional

### Taglines (approved)
1. *Future of Intelligent Learning* ← **Primary**
2. *Where AI Meets Education*
3. *Learn Smarter with AI*
4. *The Intelligent Learning Platform*
5. *Next Generation Education*

---

## 2. Logo System

### Logo Concept
The logo features a **neural circuit S-form** — an abstract S-shape constructed from connected nodes and circuit lines, symbolizing:
- The letter **S** for *Savi*
- **Neural networks** (AI)
- **Knowledge circuits** connecting ideas
- A **book** element embedded in the lower-right quadrant

The icon sits on a **blue-indigo-violet gradient** background (representing intelligence + creativity).

### Logo Files

| File | Use Case |
|------|----------|
| `public/branding/logo-primary.svg` | Standard full logo (icon + wordmark + tagline) |
| `public/branding/logo-icon.svg` | Icon-only (for favicons, app icons, square contexts) |
| `public/branding/logo-dark.svg` | Dark backgrounds (white wordmark) |
| `public/branding/logo-light.svg` | Light backgrounds (dark wordmark) |
| `public/branding/logo-compact.svg` | Icon + name, no tagline (navbar) |
| `public/branding/logo-monogram.svg` | S monogram only (small spaces) |
| `public/branding/app-icon.svg` | PWA / App Store icon (512px) |
| `public/branding/favicon.svg` | Browser tab favicon (32px) |
| `public/favicon.svg` | Root favicon |

### React Component Usage

```tsx
import { Logo } from '@/components/brand/Logo';

// Full logo with tagline (hero, login page)
<Logo size="lg" variant="full" showTagline={true} />

// Compact logo (navbar)
<Logo size="md" variant="compact" />

// Icon only (mobile, small spaces)
<Logo size="sm" variant="icon" />

// Dark theme (footer, dark sections)
<Logo size="md" variant="full" theme="dark" />
```

#### Props Reference

| Prop | Options | Default | Description |
|------|---------|---------|-------------|
| `size` | `xs` `sm` `md` `lg` `xl` `2xl` | `md` | Controls icon + text scale |
| `variant` | `icon` `compact` `full` | `full` | Layout variant |
| `theme` | `light` `dark` `auto` | `light` | Color scheme |
| `showTagline` | `boolean` | `false` | Shows tagline beneath name |

---

## 3. Color Palette

### Primary — Electric Blue
| Token | Hex | Usage |
|-------|-----|-------|
| `primary-600` | `#2563EB` | Buttons, links, CTA |
| `primary-500` | `#3B82F6` | Hover states |
| `primary-800` | `#1E40AF` | Dark text emphasis |
| `primary-100` | `#DBEAFE` | Backgrounds, chips |

### Secondary — Cyan (AI / Tech)
| Token | Hex | Usage |
|-------|-----|-------|
| `secondary-500` | `#06B6D4` | AI widget accents, neural nodes |
| `secondary-400` | `#22D3EE` | Highlight glows |
| `secondary-600` | `#0891B2` | Active secondary state |

### Accent — Violet (Intelligence)
| Token | Hex | Usage |
|-------|-----|-------|
| `accent-600` | `#7C3AED` | Gradient partner, premium features |
| `accent-500` | `#8B5CF6` | Base accent |
| `accent-400` | `#A78BFA` | Muted accent |

### Semantic
| Name | Hex | Usage |
|------|-----|-------|
| Success | `#059669` | Correct answers, success states |
| Warning | `#D97706` | Alerts, time warnings |
| Error | `#E11D48` | Error states, destructive actions |
| Neutral-900 | `#0F172A` | Primary text |
| Neutral-500 | `#64748B` | Muted text |
| Neutral-100 | `#F1F5F9` | Subtle backgrounds |

### Canonical Gradients
```css
/* Hero / CTA */
background: linear-gradient(135deg, #2563EB 0%, #4F46E5 50%, #7C3AED 100%);

/* AI / Tech  */
background: linear-gradient(135deg, #06B6D4 0%, #2563EB 100%);

/* Knowledge */
background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%);
```

---

## 4. Typography

### Font Stack
```css
font-family: 'Inter', 'Poppins', system-ui, sans-serif;
```

Import (already in `globals.css`):
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap');
```

### Type Scale

| Level | Element | Size | Weight | Usage |
|-------|---------|------|--------|-------|
| H1 Display | Hero headline | `text-5xl` / 48px | 900 | Page heroes |
| H1 | Page title | `text-4xl` / 36px | 800 | Section heads |
| H2 | Section title | `text-3xl` / 30px | 700 | Card headers |
| H3 | Card title | `text-xl` / 20px | 600 | UI components |
| Body Large | Description | `text-lg` / 18px | 400 | Primary content |
| Body | Content | `text-base` / 16px | 400 | Default text |
| Body Small | Metadata | `text-sm` / 14px | 400 | Labels, captions |
| Caption | Tooltips | `text-xs` / 12px | 500 | Badges, chips |
| Micro | Fine print | `text-[10px]` / 10px | 500 | Role labels |

### Wordmark Typography
- Font: **Inter** (weight 800 "Savi" + 700 "EduTech")
- Letter spacing: `-0.05em` (tight)
- "Savi" — Blue gradient (`#1D4ED8 → #4338CA`)
- "EduTech" — Dark slate (`#0F172A`)

---

## 5. Logo Usage — Do's & Don'ts

### ✅ Do's
- Use the SVG `Logo` component — never embed raster images
- Maintain clear space equal to **1× the icon width** around the logo
- Use `theme="dark"` on dark/colored backgrounds
- Use `variant="icon"` in very small spaces (< 32px width)
- Always link the logo to the homepage (`href="/"`)

### ❌ Don'ts
- Do **not** recolor the logo (the gradient is protected)
- Do **not** use the old `logo.png` raster file
- Do **not** add drop shadows or filters externally
- Do **not** compress/stretch the logo (maintain aspect ratio)
- Do **not** place the logo on busy photo backgrounds without overlay
- Do **not** use any variant below `xs` size in production

---

## 6. Spacing & Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `0.75rem` (12px) | Default border radius |
| Navbar height | 80px (`h-20`) | Desktop nav |
| Mobile header | 56px (`h-14`) | Mobile header |
| Page max width | 1280px (`max-w-7xl`) | Content container |
| Section padding | 56px vertical | `py-14` |
| Card padding | 32px | `p-8` |

---

## 7. Component Brand Tokens

```typescript
import { brandColors, brandGradients, semanticColors } from '@/styles/brand-colors';

// Usage
const primaryBtn = brandColors.primary[600];    // #2563EB
const aiAccent   = brandColors.secondary[500];  // #06B6D4
const heroGrad   = brandGradients.primary;
```

---

## 8. Responsive Logo Rules

| Breakpoint | Variant | Size |
|------------|---------|------|
| Mobile (< 768px) | `compact` or `icon` | `sm` |
| Tablet (768–1024px) | `compact` | `md` |
| Desktop (> 1024px) | `full` | `md` or `lg` |

---

## 9. Animation Guidelines

- Logo used in hero: `animate-float` (6s ease)
- Node pulsing: `opacity` keyframe (subtle, 3s)
- Page transitions: `fade-in` (0.3s ease-out)
- CTA hover: `scale(1.02)` (0.2s)
- Gradient shimmer: `200% auto` (2s linear)

---

## 10. File Reference

```
src/
├── components/
│   ├── brand/
│   │   └── Logo.tsx          ← Canonical Logo component
│   └── brand-logo.tsx        ← Re-export (backward compat)
└── styles/
    └── brand-colors.ts       ← Color system tokens

public/
├── favicon.svg               ← Root favicon
└── branding/
    ├── logo-primary.svg      ← Full primary logo
    ├── logo-icon.svg         ← Icon only
    ├── logo-dark.svg         ← Dark variant
    ├── logo-light.svg        ← Light variant
    ├── logo-compact.svg      ← Compact (icon + name)
    ├── logo-monogram.svg     ← S monogram
    ├── app-icon.svg          ← PWA / app icon
    └── favicon.svg           ← Favicon SVG
```
