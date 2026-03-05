# SaviEdTech Gamification System

A comprehensive gamification system designed to increase student engagement through study streaks, achievements, points, and leaderboards.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Components](#components)
- [Usage Examples](#usage-examples)
- [Points System](#points-system)
- [Achievements](#achievements)
- [Deployment](#deployment)

## Overview

The gamification system provides a complete solution for tracking and rewarding student learning activities. It includes:

- **Study Streaks**: Track consecutive days of learning
- **Points System**: Award points for various activities
- **Achievements**: Unlock badges for milestones
- **Leaderboards**: Compare progress with peers

## Features

### Study Streaks

- Automatic streak tracking based on daily activity
- Milestone celebrations (7, 14, 30, 60, 100+ days)
- Streak freeze feature (once per week)
- Visual calendar view

### Points System

| Activity | Points | Daily Limit |
|----------|--------|-------------|
| Lecture Completed | 10 | 50 |
| Correct Answer | 5 | 100 |
| Test Completed | 50 | - |
| Daily Challenge | 25 | - |
| Practice Session | 15 | 75 |
| DPP Completed | 30 | 90 |
| Revision Completed | 20 | 60 |
| Achievement Unlocked | 100 | - |
| Streak Milestone | 50 | - |

### Achievements

| Achievement | Description | Points |
|-------------|-------------|--------|
| **First Steps** | Complete your first learning activity | 50 |
| **Scholar** | Complete 10 lectures | 100 |
| **Problem Solver** | Answer 50 questions correctly | 150 |
| **Test Taker** | Complete 5 tests | 200 |
| **Week Warrior** | Maintain a 7-day study streak | 250 |
| **Monthly Master** | Maintain a 30-day study streak | 500 |
| **Challenger** | Complete 10 daily challenges | 300 |
| **Lecture Lover** | Watch 50 hours of lectures | 400 |
| **Perfectionist** | Score 100% on a test | 350 |
| **Speed Demon** | Complete test with 30+ mins remaining | 200 |
| **Consistent Learner** | Study for 30 days total | 450 |
| **Topic Master** | Master 5 topics (90%+ accuracy) | 500 |

### Leaderboards

Multiple leaderboard types:
- **Points Leaders**: Total points earned
- **Streak Champions**: Longest study streaks
- **Accuracy Masters**: Highest accuracy in practice
- **Test Warriors**: Most tests completed
- **Study Hours**: Most time spent learning

Time periods: Daily, Weekly, Monthly, All Time

## Architecture

### File Structure

```
src/
├── lib/gamification/
│   ├── index.ts          # Main exports and orchestration
│   ├── streaks.ts        # Streak management
│   ├── points.ts         # Points system
│   ├── achievements.ts   # Achievement system
│   └── leaderboards.ts   # Leaderboard system
├── components/gamification/
│   ├── index.ts          # Component exports
│   ├── StreakDisplay.tsx # Streak UI components
│   ├── AchievementBadge.tsx # Achievement UI components
│   └── Leaderboard.tsx   # Leaderboard UI components
├── app/api/gamification/
│   └── track-activity/
│       └── route.ts      # Activity tracking API
├── types/
│   └── gamification.ts   # TypeScript types
└── ...

supabase/migrations/
└── 20240304220000_gamification_system.sql  # Database migration
```

## Database Schema

### Tables

#### achievements
Stores available achievements/badges.

```sql
- id (varchar, primary key)
- name (varchar)
- description (text)
- icon_url (text)
- badge_color (varchar)
- criteria_type (varchar)
- criteria_value (integer)
- points (integer)
- is_active (boolean)
- created_at (timestamp)
```

#### user_achievements
Tracks user-earned achievements.

```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- achievement_id (varchar, foreign key)
- earned_at (timestamp)
```

#### study_streaks
Daily study activity tracking.

```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- streak_date (date)
- study_minutes (integer)
- activities_count (integer)
- created_at (timestamp)
```

#### user_points
Point transaction history.

```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- activity_type (varchar)
- points (integer)
- description (text)
- metadata (jsonb)
- created_at (timestamp)
```

#### leaderboard_snapshots
Cached leaderboard data.

```sql
- id (uuid, primary key)
- period (varchar)
- leaderboard_type (varchar)
- data (jsonb)
- updated_at (timestamp)
```

### Extended student_profiles

Additional columns:
- `total_points` (integer) - Total accumulated points
- `streak_freeze_used_at` (timestamp) - Last streak freeze usage

## API Reference

### POST /api/gamification/track-activity

Tracks a learning activity and updates gamification state.

**Request Body:**
```json
{
  "activityType": "lecture_completed",
  "metadata": {
    "lectureId": "uuid",
    "duration": 30
  }
}
```

**Activity Types:**
- `lecture_completed` - Completed a lecture
- `test_completed` - Completed a test
- `practice_completed` - Completed practice session
- `challenge_completed` - Completed daily challenge
- `dpp_completed` - Completed DPP
- `revision_completed` - Completed revision
- `correct_answer` - Answered correctly

**Response:**
```json
{
  "success": true,
  "data": {
    "pointsAwarded": 10,
    "totalPoints": 150,
    "newAchievements": ["first_steps"],
    "streakUpdated": true,
    "currentStreak": 5
  },
  "message": "+10 points earned! Streak extended! 1 achievement unlocked!"
}
```

### GET /api/gamification/track-activity

Returns the user's complete gamification summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "points": {
      "total": 150,
      "today": 25,
      "thisWeek": 120,
      "thisMonth": 150
    },
    "streaks": {
      "current": 5,
      "longest": 12,
      "isActiveToday": true,
      "nextMilestone": 7,
      "milestoneProgress": 71
    },
    "achievements": {
      "unlocked": 2,
      "total": 12,
      "recentlyUnlocked": ["first_steps", "scholar"],
      "inProgress": [...]
    },
    "leaderboards": {
      "pointsRank": 45,
      "streaksRank": 12
    }
  }
}
```

## Components

### StreakDisplay

```tsx
import { StreakDisplay, StreakBadge, StreakCalendar } from '@/components/gamification';

// Full streak display
<StreakDisplay userId={userId} variant="full" />

// Compact version
<StreakDisplay userId={userId} variant="compact" />

// Minimal badge
<StreakBadge userId={userId} />

// Weekly calendar
<StreakCalendar userId={userId} />
```

### AchievementBadge

```tsx
import { AchievementBadge, SingleAchievementBadge } from '@/components/gamification';

// Full achievement display
<AchievementBadge userId={userId} variant="grid" showProgress />

// List view
<AchievementBadge userId={userId} variant="list" limit={5} />

// Compact count
<AchievementBadge userId={userId} variant="compact" />

// Single badge
<SingleAchievementBadge achievementId="scholar" size="md" />
```

### Leaderboard

```tsx
import { Leaderboard, CompactLeaderboard, UserRankCard } from '@/components/gamification';

// Full leaderboard
<Leaderboard 
  userId={userId} 
  defaultType="points" 
  defaultPeriod="weekly"
  showFilters 
/>

// Compact version
<CompactLeaderboard userId={userId} type="streaks" />

// User rank card
<UserRankCard userId={userId} type="points" />
```

## Usage Examples

### Tracking Activity

```typescript
import { trackActivity } from '@/lib/gamification';

// Track lecture completion
const result = await trackActivity({
  userId: 'user-uuid',
  activityType: 'lecture_completed',
  metadata: { lectureId: 'lec-123', duration: 45 }
});

console.log(result.pointsAwarded); // 10
console.log(result.newAchievements); // ['first_steps']
```

### Getting User Summary

```typescript
import { getUserGamificationSummary } from '@/lib/gamification';

const summary = await getUserGamificationSummary('user-uuid');
console.log(summary.points.total);
console.log(summary.streaks.current);
```

### Checking Achievements

```typescript
import { checkAchievements, getUserAchievements } from '@/lib/gamification';

// Check and award any new achievements
const newAchievements = await checkAchievements('user-uuid');

// Get all achievements with progress
const { unlocked, inProgress } = await getUserAchievements('user-uuid');
```

### Working with Streaks

```typescript
import { 
  trackStreakActivity, 
  getUserStreak,
  getStreakHistory 
} from '@/lib/gamification';

// Track daily activity
const result = await trackStreakActivity('user-uuid');
console.log(result.currentStreak);

// Get streak info
const streakInfo = await getUserStreak('user-uuid');

// Get history
const history = await getStreakHistory('user-uuid', 30);
```

### Awarding Points

```typescript
import { awardPoints, getUserTotalPoints } from '@/lib/gamification';

// Award points
const result = await awardPoints(
  'user-uuid',
  'correct_answer',
  { questionId: 'q-123', difficulty: 'hard' }
);

// Get total
const total = await getUserTotalPoints('user-uuid');
```

### Getting Leaderboards

```typescript
import { getLeaderboard } from '@/lib/gamification';

const { entries, userRank, totalParticipants } = await getLeaderboard(
  { type: 'points', period: 'weekly', limit: 10 },
  'user-uuid' // current user ID to highlight their position
);
```

## Points System

### Daily Limits

Some activities have daily point limits to encourage consistent learning rather than binge studying:

- **Lecture Completed**: 50 points/day max (5 lectures)
- **Correct Answer**: 100 points/day max (20 correct answers)
- **Practice Session**: 75 points/day max (5 sessions)
- **DPP Completed**: 90 points/day max (3 DPPs)
- **Revision Completed**: 60 points/day max (3 revisions)

### Special Bonuses

- **Achievement Unlocked**: 100 points (no limit)
- **Streak Milestone**: 50 points at each milestone

## Deployment

### 1. Apply Database Migration

```bash
# Using Supabase CLI
supabase db push

# Or apply manually via Supabase Dashboard
# Copy contents of: supabase/migrations/20240304220000_gamification_system.sql
```

### 2. Update Supabase Types (Optional)

```bash
npm run db:generate
```

### 3. Install Dependencies

```bash
npm install
# or
npm install framer-motion  # For enhanced animations (optional)
```

### 4. Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 5. Testing

```bash
# Run type check
npm run typecheck

# Run tests
npm test
```

## Integration with Existing Features

### Test System

Automatically track when students complete tests:

```typescript
// In test completion handler
await trackActivity({
  userId,
  activityType: 'test_completed',
  metadata: { testId, score, timeTaken }
});
```

### Lecture System

Track lecture progress:

```typescript
// When lecture is marked complete
await trackActivity({
  userId,
  activityType: 'lecture_completed',
  metadata: { lectureId, duration }
});
```

### Daily Challenges

Track challenge completion:

```typescript
// When challenge is solved correctly
await trackActivity({
  userId,
  activityType: 'challenge_completed',
  metadata: { challengeId, isCorrect }
});
```

## Best Practices

1. **Always track activity**: Call `trackActivity()` after any meaningful learning action
2. **Handle errors gracefully**: Gamification should never block core functionality
3. **Batch updates**: For bulk operations, consider batching gamification updates
4. **Cache leaderboard data**: Leaderboards are expensive to compute; use caching
5. **Respect daily limits**: The system enforces limits automatically
6. **Show progress**: Display in-progress achievements to motivate continued engagement

## Troubleshooting

### Common Issues

**Points not updating:**
- Check if daily limit has been reached
- Verify `user_points` table exists and has RLS policies

**Streak not extending:**
- Streaks only extend once per day
- Check `study_streaks` table for existing entry

**Achievements not unlocking:**
- Run `checkAchievements()` to trigger check
- Verify achievement criteria is met

**Leaderboard not loading:**
- Check that `student_profiles` table has data
- Verify the query is not timing out (add pagination if needed)

### Debug Mode

Enable debug logging:

```typescript
// In browser console
localStorage.setItem('gamification_debug', 'true');
```

## Future Enhancements

- [ ] Team/Classroom leaderboards
- [ ] Seasonal events and limited-time achievements
- [ ] Reward redemption system
- [ ] Integration with notification system
- [ ] Advanced analytics dashboard
- [ ] Social sharing of achievements
- [ ] Custom achievement creation for admins
