# SaviEduTech Engineering Documentation

## System Overview

SaviEduTech is a comprehensive digital coaching ecosystem for competitive exam preparation (JEE, NEET). The platform is built on modern web technologies with a focus on security, scalability, and performance.

---

## Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS 3.4 |
| State Management | Zustand |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Supabase) |
| Authentication | Supabase Auth (JWT) |
| Payments | Razorpay |
| AI | Google Gemini API |
| Email | Resend |
| Caching | Redis (optional) |
| Monitoring | Sentry |
| Deployment | Vercel / Docker |

### Architecture Pattern

**Hybrid Monolith with Serverless Features**

- Next.js App Router for both frontend and API
- Server Components for optimal performance
- API Routes for backend logic
- Cron Jobs for automation

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/           # Auth routes
│   ├── admin/            # Admin dashboard
│   ├── api/              # API routes
│   ├── dashboard/        # Student dashboard
│   └── savitech-ai/      # AI features
├── components/           # React components
│   ├── admin/           # Admin-specific
│   ├── dashboard/       # Dashboard components
│   ├── gamification/    # Gamification system
│   └── payments/        # Payment components
├── lib/                  # Core libraries
│   ├── platform-manager/ # Self-healing, monitoring
│   ├── security.ts      # Security utilities
│   ├── cache.ts         # Caching layer
│   └── supabase.ts      # Database client
├── types/               # TypeScript definitions
├── ai-engine/           # AI modules
├── analytics/           # Analytics engine
└── automation/          # Automation scripts
```

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with roles |
| `courses` | Course catalog |
| `enrollments` | Course purchases |
| `quizzes` | Quiz definitions |
| `quiz_attempts` | Quiz submissions |
| `notifications` | User notifications |

### Role System

| Role | Permissions |
|------|-------------|
| `student` | Access dashboard, take tests |
| `parent` | View child progress |
| `faculty` | Create content |
| `content_manager` | Manage courses, lectures |
| `finance_manager` | View finances |
| `hr` | Manage careers |
| `admin` | Full access |

---

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/callback` | OAuth callback |
| POST | `/api/auth/reset-password` | Password reset |
| POST | `/api/auth/bootstrap-profile` | Create profile |

### Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/create-order` | Create Razorpay order |
| POST | `/api/payments/verify` | Verify payment |
| POST | `/api/payments/webhook` | Payment webhook |
| GET | `/api/payments/invoice` | Generate invoice |

### AI Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/query` | AI tutor query |
| POST | `/api/ai/doubt-solver` | Solve doubts |
| POST | `/api/ai/generate-questions` | Generate questions |
| POST | `/api/ai/study-plan` | Create study plan |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/cms` | CMS management |
| GET | `/api/admin/reports/export` | Export reports |
| POST | `/api/admin/cron-trigger` | Trigger cron jobs |

---

## Security Implementation

### Authentication

- Supabase Auth with JWT tokens
- Session cookies with secure httpOnly
- Role-based access control (RBAC)

### Security Headers

Implemented in `next.config.ts` and `middleware.ts`:

- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options`
- `X-Frame-Options: DENY`
- `Content-Security-Policy`
- `Referrer-Policy`

### Rate Limiting

In-memory rate limiting with Redis fallback:

```typescript
// Usage
const result = await checkRateLimit(identifier, RATE_LIMITS.API);
if (!result.allowed) {
    // Handle rate limit
}
```

### Input Validation

Zod schemas for all inputs:

```typescript
const { email, password } = await request.json();
emailSchema.parse(email);
passwordSchema.parse(password);
```

---

## Deployment

### Local Development

```bash
# Install dependencies
npm install

# Run database (requires Docker)
docker-compose up -d redis

# Run development server
npm run dev
```

### Docker Deployment

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f app
```

### Vercel Deployment

1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

Required environment variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
GEMINI_API_KEY
RESEND_API_KEY
```

---

## Testing

### Unit Tests

```bash
npm test
```

### Coverage

Target: 80% code coverage

### CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci-cd.yml`):

1. Lint & Type Check
2. Unit Tests
3. Build
4. Security Scan
5. Deploy Preview/Production

---

## Monitoring

### Sentry Integration

Error tracking and performance monitoring:

```typescript
import { captureError, captureMessage } from '@/lib/sentry';

try {
    // Your code
} catch (error) {
    captureError(error, { context: 'user_action' });
}
```

### Health Checks

- `/api/cron/health-monitor` - System health
- `/api/cron/supabase-health` - Database health

---

## Performance Optimization

### Implemented Optimizations

1. **Redis Caching** - AI responses, leaderboards
2. **Database Indexes** - Query performance
3. **Image Optimization** - Next.js Image component
4. **Bundle Analysis** - Code splitting
5. **CDN** - Static assets via Vercel

### Database Indexes

```sql
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_enrollments_user_course ON enrollments(user_id, course_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
```

---

## Automation Cron Jobs

### Available Cron Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `database-maintenance` | Daily | Optimize DB |
| `email-notifications` | Hourly | Send emails |
| `gamification` | Daily | Update points |
| `lead-management` | Daily | CRM automation |
| `quiz-analytics` | Weekly | Generate reports |

### Running Cron Jobs

```bash
# Via API (requires cron secret)
curl -X POST https://saviedutech.com/api/cron/database-maintenance \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

## Feature Flags

Control features via environment variables:

```
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

---

## Troubleshooting

### Common Issues

1. **Build failures**: Check TypeScript errors `npm run typecheck`
2. **Auth issues**: Verify Supabase configuration
3. **Payment failures**: Check Razorpay keys
4. **AI not working**: Verify Gemini API key

### Logs

```bash
# View application logs
vercel logs saviedutech

# View Docker logs
docker-compose logs -f app
```

---

## Contributing

### Code Style

- ESLint for linting
- Prettier for formatting
- TypeScript strict mode

### Pull Request Process

1. Create feature branch
2. Add tests
3. Ensure lint passes
4. Submit PR
5. Request review

---

## License

Proprietary - SaviEduTech
