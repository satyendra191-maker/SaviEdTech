# SaviEduTech Brand Guidelines

> **Version:** 3.0 · **Updated:** March 2026 · **Platform:** AI-powered Education (India)

---

## 1. Brand Identity

**SaviEduTech** is an AI-powered education platform for Class 6–12 students, teachers, and parents. Our brand personality is:

- **Futuristic** — rooted in modern technology (AI, analytics, automation)
- **Intelligent** — adaptive, data-driven, personalized
- **Trustworthy** — dependable for competitive exams (JEE/NEET/Board)
- **Clean SaaS** — modern, uncluttered, professional

### Taglines (approved)
1. *Empowering Digital Learning* ← **Primary**
2. *Future of Intelligent Learning*
3. *Where AI Meets Education*
4. *Learn Smarter with AI*
5. *Next Generation Education*

---

## 2. Logo System

### Master Logo

- **File:** `public/brand/logo.png`
- **Orientation:** horizontal (icon + wordmark + tagline)
- **Do not:** stretch, rotate, recolor, or apply filters

### React Component Usage

```tsx
import { Logo } from '@/components/brand/Logo';

// Navbar (priority load)
<Logo size="md" priority />

// Footer / dark sections (adds contrast container)
<Logo size="lg" variant="dark" />

// Auth / hero sections
<Logo size="lg" />
```

#### Props Reference

| Prop | Options | Default | Description |
|------|---------|---------|-------------|
| `size` | `sm` `md` `lg` | `md` | Controls rendered height (32 / 44 / 60px) |
| `variant` | `light` `dark` | `light` | Adds a light container for contrast on dark backgrounds |
| `priority` | `boolean` | `false` | Preloads the logo for faster header rendering |
| `alt` | `string` | `SaviEduTech Official Logo` | Accessible alt text |
| `className` | `string` | `''` | Extra classes for alignment / spacing |

---

## 3. Color Palette

### Primary — Blue
| Token | Hex | Usage |
|-------|-----|-------|
| `primary-600` | `#2563EB` | Buttons, links, CTA |
| `primary-500` | `#3B82F6` | Hover states |
| `primary-800` | `#1E40AF` | Dark text emphasis |
| `primary-100` | `#DBEAFE` | Backgrounds, chips |

### Accent — Orange
| Token | Hex | Usage |
|-------|-----|-------|
| `brand-orange` | `#F58220` | Logo accent, highlights |

### Semantic
| Name | Hex | Usage |
|------|-----|-------|
| Success | `#059669` | Correct answers, success states |
| Warning | `#D97706` | Alerts, time warnings |
| Error | `#E11D48` | Error states, destructive actions |
| Neutral-900 | `#0F172A` | Primary text |
| Neutral-500 | `#64748B` | Muted text |
| Neutral-100 | `#F1F5F9` | Subtle backgrounds |

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

### Wordmark Guidance
- The wordmark + tagline are part of the master logo asset (`public/brand/logo.png`).
- Do not recreate the wordmark with live text in UI components.

---

## 5. Logo Usage — Do's & Don'ts

### ✅ Do
- Use the canonical `Logo` component (`src/components/brand/Logo.tsx`) everywhere.
- Use `variant="dark"` on dark/colored backgrounds for contrast.
- Keep the logo linked to the homepage (`href="/"`) in headers and footers.
- Preserve aspect ratio (no stretching).

### ❌ Don't
- Do not use raw `<img>` tags for the brand logo.
- Do not inline SVG/logo markup in components.
- Do not ship multiple logo files for the same mark.
- Do not apply external filters/shadows that change brand appearance.

---

## 6. Spacing & Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `0.75rem` (12px) | Default border radius |
| Mobile header | 56px (`h-14`) | Mobile header |
| Desktop header | 64px (`h-16`) | Navbar / dashboard header |
| Page max width | 1280px (`max-w-7xl`) | Content container |
| Section padding | 56px vertical | `py-14` |
| Card padding | 32px | `p-8` |

---

## 7. Responsive Logo Rules

| Context | Size |
|---------|------|
| Mobile navbar/header | `sm` |
| Desktop navbar/header | `md` |
| Hero / login / marketing sections | `lg` |

---

## 8. Animation Guidelines

- Hero logo animation: `animate-float` (subtle, 6s ease)
- CTA hover: `translateY(-2px)` or `scale(1.01)` (200ms)
- Page transitions: keep short (≤ 300ms)

---

## 9. File Reference

```
src/
└── components/
    └── brand/
        └── Logo.tsx           ← Canonical Logo component

public/
├── brand/
│   └── logo.png              ← Master logo (used by Logo component)
├── favicon.svg               ← Browser favicon (icon mark)
├── icons/
│   ├── icon-192.png          ← PWA icon
│   └── icon-512.png          ← PWA icon
└── branding/
    └── app-icon.svg          ← Maskable PWA icon
```

