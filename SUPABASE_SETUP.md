# Supabase Setup

This repo now includes a committed `supabase/config.toml`, ordered migrations through Features 1-23, and cross-platform helper scripts.

## Required environment

Add these to `.env.local` for remote migration management:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_PROJECT_ID=your_project_ref
SUPABASE_DB_PASSWORD=your_database_password
```

Optional non-interactive remote push:

```env
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

## Local development database

```bash
npm run db:start
npm run db:push:local
npm run db:generate
```

## Remote project sync

```bash
npm run db:push
npm run db:generate
```

`npm run db:push` supports:

- `SUPABASE_DB_URL` for direct remote migration push
- `SUPABASE_DB_PASSWORD` with `SUPABASE_PROJECT_ID` or `NEXT_PUBLIC_SUPABASE_URL` for `supabase link` + `supabase db push`

## Migration coverage

The migration chain covers the platform through Features 1-23, including:

- learning engine and question bank
- study planner and doubts
- analytics, rank prediction, and payments
- popup ads, notifications, AI assistant, and mobile-hardening support
- schema validation, error logging, request metrics, and performance RPCs

Latest migration:

- `supabase/migrations/20260309193000_database_validation_error_performance_repairs.sql`
