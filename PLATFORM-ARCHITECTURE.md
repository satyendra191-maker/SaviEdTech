# SaviEduTech Enterprise EdTech Platform - Architecture Documentation

## PHASE 1: TECHNOLOGY STACK

### Frontend
- **Framework**: Next.js 15.5.12 (React 18)
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React, ShadCN-style components
- **State Management**: React Query, Zustand
- **Forms**: React Hook Form
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth + Google OAuth
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

### AI & External Services
- **OpenAI**: GPT-4 for content generation
- **Gemini**: AI processing
- **YouTube Data API**: Video management
- **Razorpay**: Payment processing
- **Resend**: Email delivery
- **Redis**: Caching (optional)
- **Sentry**: Error tracking
- **Vercel**: Hosting & Deployment

---

## PHASE 2: REPOSITORY STRUCTURE

```
SaviEdTech/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes
│   │   ├── admin/             # Admin dashboard (24 modules)
│   │   ├── api/               # API routes (100+ endpoints)
│   │   ├── dashboard/         # Student dashboard
│   │   ├── experiments/       # Virtual Labs
│   │   ├── simulations/       # 3D Simulations
│   │   ├── knowledge-universe/ # AI Knowledge System
│   │   └── ...                # 50+ page routes
│   ├── components/            # React components
│   ├── lib/                   # Utility libraries
│   ├── hooks/                 # Custom React hooks
│   ├── types/                  # TypeScript definitions
│   ├── ai-engine/             # AI processing
│   ├── agents/                # Autonomous agents
│   ├── superbrain/            # AI Brain system
│   └── ...                    # 20+ engine modules
├── supabase/
│   └── migrations/            # Database migrations (30+)
├── public/                    # Static assets
└── scripts/                   # Build scripts
```

---

## PHASE 3: FEATURE AUDIT

### Working Features
| Feature | Module | Status |
|---------|--------|--------|
| User Authentication | Auth | ✅ Working |
| Student Dashboard | Dashboard | ✅ Working |
| Course Management | Admin/Courses | ✅ Working |
| Lecture System | Lectures | ✅ Working |
| Test System | Tests | ✅ Working |
| Question Bank | Questions | ✅ Working |
| Payment System | Payments | ✅ Working |
| YouTube Integration | YouTube | ✅ Working |
| AI Content Generation | AI | ✅ Working |
| Virtual Labs | Experiments | ✅ Working |
| Simulations | Simulations | ✅ Working |
| Knowledge Universe | AI | ✅ Working |
| Admin Dashboard | Admin | ✅ Working |
| Cron Jobs | Automation | ✅ Working (40+) |
| Gamification | System | ✅ Working |
| Email System | Notifications | ✅ Working |

### Partially Implemented
| Feature | Status | Issue |
|---------|--------|-------|
| 3D Simulations | ⚠️ | Basic structure exists |
| AI Teacher Avatar | ⚠️ | Framework exists |
| Live Classroom | ⚠️ | UI exists |
| Auto YouTube Generator | ⚠️ | API integration |

---

## PHASE 4: ROUTE MAP

### Public Routes (50+)
- `/` - Homepage
- `/about`, `/contact`, `/faq`
- `/courses`, `/lectures`, `/tests`
- `/experiments`, `/simulations`, `/journal`
- `/knowledge-universe`
- `/demo`, `/login`, `/signup`
- `/careers`, `/blog`
- `/donate`, `/donations`
- `/jee`, `/neet`, `/cbse`
- `/ai-tutor`, `/savitech-ai`

### Protected Routes
- `/dashboard/*` - Student dashboard
- `/admin/*` - Admin panel (24 modules)
- `/parent/*` - Parent portal

### API Routes (100+)
- `/api/auth/*` - Authentication
- `/api/admin/*` - Admin operations
- `/api/cron/*` - Automation (40+ jobs)
- `/api/ai/*` - AI services
- `/api/payments/*` - Payment processing
- `/api/youtube/*` - YouTube management
- `/api/superbrain/*` - AI Brain

---

## PHASE 5: ADMIN DASHBOARD MODULES

Current Admin Modules (24):
1. `/admin` - Main dashboard
2. `/admin/control-center` - Unified control
3. `/admin/cron-jobs` - Automation control
4. `/admin/finance` - Financial management
5. `/admin/analytics` - Platform analytics
6. `/admin/youtube` - YouTube management
7. `/admin/students` - Student management
8. `/admin/courses` - Course management
9. `/admin/lectures` - Lecture management
10. `/admin/tests` - Test management
11. `/admin/questions` - Question bank
12. `/admin/payments` - Payment tracking
13. `/admin/leads` - Lead management
14. `/admin/subscriptions` - Subscription management
15. `/admin/affiliates` - Affiliate tracking
16. `/admin/growth` - Growth analytics
17. `/admin/ai-assistant` - AI tools
18. `/admin/ai-content` - Content generation
19. `/admin/superbrain` - AI Engine
20. `/admin/cms` - Content management
21. `/admin/careers` - Job portal
22. `/admin/backups` - Database backups
23. `/admin/settings` - Platform settings
24. `/admin/ads` - Ad management

---

## PHASE 6: DATABASE SCHEMA

Tables (100+):
- `profiles` - User profiles
- `courses`, `chapters`, `topics`
- `lectures`, `lecture_progress`
- `questions`, `options`
- `tests`, `test_attempts`, `test_answers`
- `payments`, `subscriptions`
- `enrollments`
- `activity_logs`
- `notifications`
- `lead_forms`
- `job_listings`, `job_applications`
- `donations`
- `cron_logs`
- `system_health`
- And 60+ more...

---

## PHASE 7: SECURITY

- ✅ Row Level Security (RLS) policies
- ✅ Role-based access control
- ✅ API key protection
- ✅ Rate limiting
- ✅ CSRF protection
- ✅ Input validation
- ✅ Error handling
- ✅ Audit logging

---

## PHASE 8: DEPLOYMENT

- **Platform**: Vercel
- **URL**: https://saviedutech.vercel.app
- **Build**: Next.js 15
- **Node**: 20+
- **Status**: ✅ Deployed & Running

---

Generated: March 2026
