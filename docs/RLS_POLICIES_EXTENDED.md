# RLS Policy Documentation - Extended

## Overview

This document details the Row Level Security (RLS) policies for the SaviEduTech platform's extended database schema.

## Roles Overview

### Administrative Roles
- `super_admin` - Highest privilege for platform governance
- `platform_admin` - Platform-wide administrative role
- `admin` - Administrative role for platform operators

### Academic Roles
- `academic_director` - Academic leadership and oversight
- `faculty` / `teacher` - Faculty role for instructors
- `content_manager` - Content publishing and academic ops
- `video_production_manager` - Video production operations
- `ai_content_trainer` / `ai_trainer` - AI content training

### Operational Roles
- `hr` / `hr_manager` - Human resources
- `finance` / `finance_manager` / `accounts_manager` - Finance operations
- `marketing` / `marketing_manager` / `social_media_manager` - Marketing operations
- `technical_support` / `support` - Support operations
- `compliance` / `compliance_team` - Compliance operations

### User Roles
- `student` - Learner role
- `parent` - Parent access role

---

## Table Policies

### System Settings (`system_settings`)
| Operation | Access Control |
|-----------|----------------|
| ALL | Admin roles only |

### Languages (`languages`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Public (is_active = TRUE) |
| ALL | Admin roles only |

### Translations (`translations`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Public |
| ALL | Admin + Content Manager |

### Notifications (`notifications`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Owner or Admin |
| INSERT | Authenticated users |
| UPDATE | Owner or Admin |

### Announcements (`announcements`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Published OR creator OR Admin |
| ALL | Admin + Marketing roles |

### Employees (`employees`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Self OR HR roles |
| ALL | HR roles |

### Payroll (`payroll`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Self OR Finance/HR roles |
| ALL | Finance roles |

### Leaves (`leaves`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Self OR HR roles |
| INSERT | Self OR HR roles |
| UPDATE | Self OR HR roles |

### Leave Balances (`leave_balances`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Self OR HR roles |

### Student Progress (`student_progress`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Student OR Faculty/Teacher/Admin |
| INSERT | Student OR Admin |
| UPDATE | Student OR Admin |

### Quizzes (`quizzes`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Published OR creator OR Content/Faculty/Admin |
| ALL | Content/Faculty/Admin |

### Quiz Questions (`quiz_questions`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Via quiz visibility |
| ALL | Content Manager/Admin |

### Quiz Submissions (`quiz_submissions`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Student OR Faculty/Teacher/Admin |
| INSERT | Student only |
| UPDATE | Student OR Faculty/Teacher/Admin |

### Subscription Plans (`subscription_plans`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Public (is_active = TRUE) |
| ALL | Finance/Admin roles |

### Subscriptions (`subscriptions`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Owner OR Finance/Admin |
| INSERT | Owner only |
| UPDATE | Owner OR Finance/Admin |

### Refunds (`refunds`)
| Operation | Access Control |
|-----------|----------------|
| ALL | Finance roles |

### Marketing Metrics (`marketing_metrics`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Marketing/Admin roles |
| ALL | Marketing/Admin roles |

### Social Posts (`social_posts`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Posted OR creator OR Marketing/Admin |
| ALL | Marketing/Admin roles |

### Donation Campaigns (`donation_campaigns`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Public (is_active = TRUE) |
| ALL | Finance/Admin roles |

### Cron Tasks (`cron_tasks`)
| Operation | Access Control |
|-----------|----------------|
| ALL | Admin/Technical Support |

### System Logs (`system_logs`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Admin/Technical Support/Compliance |
| INSERT | Authenticated |

### Analytics Events (`analytics_events`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Admin/Marketing roles |
| INSERT | Authenticated |

### Live Class Attendees (`live_class_attendees`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Self OR Faculty/Teacher/Admin |
| INSERT | Authenticated |
| UPDATE | Self OR Faculty/Teacher/Admin |

### Course Ratings (`course_ratings`)
| Operation | Access Control |
|-----------|----------------|
| SELECT | Approved OR Self OR Admin |
| INSERT | Self only |
| UPDATE | Self OR Admin |

---

## Helper Functions

| Function | Description | Roles |
|----------|-------------|-------|
| `is_finance_user(user_id)` | Check finance roles | finance, finance_manager, accounts_manager + Admin |
| `is_marketing_user(user_id)` | Check marketing roles | marketing, marketing_manager, social_media_manager + Admin |
| `is_faculty_user(user_id)` | Check faculty roles | faculty, teacher + Admin |
| `is_parent_of_student(student_id)` | Check parent relationship | Via parent_links table |

---

## Realtime Tables

The following tables support Supabase Realtime subscriptions:

- `notifications` - Real-time alerts
- `announcements` - Instant announcements
- `live_classes` - Live class updates
- `live_class_attendees` - Attendance tracking
- `assignments` - Assignment updates
- `submissions` - Submission tracking
- `quiz_submissions` - Quiz progress
- `payments` - Payment notifications
- `donations` - Donation alerts
- `system_events` - System-wide events
- `student_progress` - Progress tracking
- `ai_interactions` - AI response updates
- `social_posts` - Social media status
- `marketing_metrics` - Analytics updates
- `leads` - Lead updates
- `cron_tasks` - Task status monitoring
- `system_logs` - Log streaming
- `analytics_events` - Event streaming
- `refunds` - Refund status
- `subscriptions` - Subscription status

---

## Notes

- When testing realtime subscriptions, ensure the subscribing role matches these policies
- All tables include `created_at` and `updated_at` timestamps for audit purposes
- Use metadata JSONB columns for flexible data storage
- All monetary values use DECIMAL for precision
