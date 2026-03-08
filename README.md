# SaviEduTech - Digital Coaching Ecosystem

A comprehensive, production-ready digital learning platform for JEE and NEET preparation.

## Overview

SaviEduTech is a scalable digital coaching ecosystem where students prepare for competitive exams through:
- Interactive lectures by expert faculty
- Daily practice problems (DPP)
- Full-length mock tests
- Performance analytics and rank prediction
- Smart revision recommendations
- National daily question challenges

## Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Query** - Server state management
- **Zustand** - Client state management
- **Recharts** - Data visualization

### Backend
- **Supabase** - Backend as a Service
- **PostgreSQL** - Primary database
- **Edge Functions** - Serverless functions
- **Row Level Security** - Database security

### Infrastructure
- **Vercel** - Frontend hosting & edge functions
- **Cloudflare** - CDN and video streaming
- **Supabase** - Database and authentication

## Project Structure

```
saviedutech/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth group routes
│   │   ├── dashboard/          # Student dashboard
│   │   ├── admin/              # Admin panel
│   │   ├── api/                # API routes
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Homepage
│   ├── components/             # React components
│   │   ├── dashboard/          # Dashboard components
│   │   ├── faculty/            # Faculty components
│   │   ├── questions/          # Question components
│   │   ├── tests/              # Test components
│   │   └── ui/                 # UI components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility functions
│   │   ├── supabase.ts         # Supabase clients
│   │   └── utils.ts            # Helper functions
│   ├── store/                  # Zustand stores
│   ├── types/                  # TypeScript types
│   └── utils/                  # Additional utilities
├── supabase/
│   ├── migrations/             # Database migrations
│   └── functions/              # Edge functions
├── public/                     # Static assets
└── docs/                       # Documentation
```

## Database Schema

### Core Tables

#### User Management
- `profiles` - User profiles extending auth.users
- `student_profiles` - Extended student data
- `user_sessions` - Session tracking

#### Academic Structure
- `exams` - JEE, NEET, etc.
- `subjects` - Physics, Chemistry, Mathematics, Biology
- `chapters` - Chapter hierarchy
- `topics` - Topic-level content

#### Faculty System
- `faculties` - Dharmendra, Harendra, Ravindra, Arvind

#### Content
- `lectures` - Video lectures with progress tracking
- `lecture_progress` - Student watch progress
- `questions` - Question bank (MCQ, Numerical, Assertion-Reason)
- `question_options` - MCQ options

#### Practice & Tests
- `dpp_sets` - Daily Practice Problems
- `dpp_questions` - DPP question mapping
- `dpp_attempts` - Student DPP attempts
- `tests` - Mock tests
- `test_questions` - Test question mapping
- `test_attempts` - Test attempt records

#### Analytics
- `student_progress` - Subject-level progress
- `topic_mastery` - Topic-level mastery tracking
- `rank_predictions` - ML-based rank predictions
- `mistake_logs` - Error tracking
- `revision_tasks` - Smart revision scheduling

#### Gamification
- `daily_challenges` - Daily question challenges
- `challenge_attempts` - Challenge participation
- `leaderboards` - Rankings
- `achievements` - Badge system
- `study_streaks` - Streak tracking

#### Platform
- `lead_forms` - Lead capture
- `notifications` - User notifications
- `popup_ads` - Advertisement system

## Key Features

### 1. Faculty Teaching System
Four expert faculty members with distinct teaching styles:
- **Dharmendra Sir** - Physics (Blue theme)
- **Harendra Sir** - Chemistry (Green theme)
- **Ravindra Sir** - Mathematics (Amber theme)
- **Arvind Sir** - Biology (Red theme)

Features:
- Video lectures with progress tracking
- Lecture notes and attachments
- Continue watching functionality
- Faculty-specific color themes

### 2. Question Bank System
Three question types supported:
- **MCQ** - Multiple choice with 4 options
- **Numerical** - Numeric answers
- **Assertion-Reason** - Special JEE/NEET format

Each question includes:
- Difficulty level (Easy/Medium/Hard)
- Topic tagging
- Solution with video/text
- Average solve time tracking
- Success rate analytics

### 3. Daily Practice Problem (DPP) System
- Auto-generated daily at 2:30 AM
- 15 questions per set
- Mixed difficulty levels
- 30-minute time limit
- Immediate scoring

### 4. Mock Test Engine
Features:
- Full-length JEE/NEET pattern tests
- Section-wise timing
- Auto-scoring with negative marking
- Rank analysis with percentile
- Detailed performance breakdown
- Solution review

### 5. Rank Prediction System
ML-based prediction using:
- Test scores history
- Accuracy trends
- Solve time analysis
- Topic mastery levels

Outputs:
- Predicted rank
- Percentile estimate
- Exam readiness score

### 6. Smart Revision Engine
Automatically:
- Tracks mistakes by type (conceptual, calculation, misread)
- Identifies weak topics
- Schedules revision tasks
- Recommends targeted questions

### 7. Daily National Challenge
- One question published daily
- National leaderboard
- Ranking by accuracy then speed
- Streak bonuses

### 8. Gamification
- Study streak tracking (fire animation)
- Achievement badges
- Points system
- Weekly/Monthly leaderboards

### 9. Lead Generation
Homepage lead capture with:
- Name, phone, email
- Exam target selection
- Class level
- City

Admin can:
- View all leads
- Export to CSV
- Convert leads to students

### 10. Admin Command Center
Dashboard with:
- Total students & active users
- Lead conversion metrics
- Revenue tracking
- Daily challenge participation
- System health monitoring

## Automation System

Scheduled tasks (Vercel Cron):
- **02:00 AM** - Publish scheduled lectures
- **02:30 AM** - Generate daily practice problems
- **03:00 AM** - Update revision tasks
- **04:00 AM** - Calculate rank predictions
- **12:00 AM** - Publish daily challenge

## Security

- Row Level Security (RLS) on all tables
- JWT-based authentication
- CSRF protection
- XSS prevention
- Rate limiting
- Input sanitization

## Mobile-First Design

Responsive features:
- Mobile navigation (bottom bar)
- Desktop navigation (sidebar)
- Touch-friendly buttons (44px min)
- Optimized loading
- Safe area insets

## Performance Optimizations

- Image optimization (Next.js Image)
- Code splitting
- Lazy loading
- Database indexing
- Query optimization
- CDN caching

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase account
- Vercel account

### Installation

1. Clone the repository
```bash
git clone https://github.com/saviedutech/platform.git
cd platform
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

4. Start local Supabase or configure a remote target
```bash
# Local stack
npm run db:start

# Apply migrations to local Supabase
npm run db:push:local

# OR apply migrations to a remote Supabase project
# Requires SUPABASE_DB_URL, or SUPABASE_DB_PASSWORD + project ref variables
npm run db:push
```

5. Regenerate Supabase types after schema changes
```bash
npm run db:generate
```

6. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_PROJECT_ID=your_project_ref
SUPABASE_DB_PASSWORD=your_database_password
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=SaviEduTech

# Cloudflare (for video)
NEXT_PUBLIC_CLOUDFLARE_STREAM_TOKEN=your_token

# Email
RESEND_API_KEY=your_resend_key
EMAIL_FROM=noreply@saviedutech.com
```

## Deployment

### Vercel
1. Connect GitHub repository to Vercel
2. Set environment variables
3. Deploy

### Supabase
1. Create new project
2. Update `.env.local` with `SUPABASE_PROJECT_ID` and either `SUPABASE_DB_PASSWORD` or `SUPABASE_DB_URL`
3. Run `npm run db:push`
4. Run `npm run db:generate`
5. Set up authentication providers
6. Configure storage buckets

## API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/reset-password` - Password reset

### Lectures
- `GET /api/lectures` - List lectures
- `GET /api/lectures/:id` - Get lecture details
- `POST /api/lectures/:id/progress` - Update progress

### Questions
- `GET /api/questions` - List questions
- `POST /api/questions/attempt` - Submit attempt

### Tests
- `GET /api/tests` - List tests
- `POST /api/tests/:id/start` - Start test
- `POST /api/tests/:id/submit` - Submit test

### DPP
- `GET /api/dpp/today` - Get today's DPP
- `POST /api/dpp/:id/submit` - Submit DPP

### Admin
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/admin/leads` - List leads
- `POST /api/admin/leads/:id/convert` - Convert lead

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Submit pull request

## License

Proprietary - SaviTech AI © 2026

## Support

- Email: contact@saviedutech.com
- Phone: +91 95069 43134
- Address: 302, Parth A, 3/11 Patel Colony, Jamnagar - 361008, Gujarat

---

Built with ❤️ by SaviTech AI Team
