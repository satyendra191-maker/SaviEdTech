# Database Schema Diagram

```mermaid
erDiagram
  profiles ||--o{ students : has
  profiles ||--o{ parents : linked_as
  profiles ||--o{ faculty : teaches
  profiles ||--o{ ai_interactions : logs
  profiles ||--o{ system_events : triggers
  profiles ||--o{ payments : makes
  profiles ||--o{ donations : gives

  courses ||--o{ lessons : contains
  courses ||--o{ assignments : assigns
  courses ||--o{ live_classes : schedules

  assignments ||--o{ submissions : receives
  profiles ||--o{ submissions : submits

  experiments ||--o{ journals : recorded_in
  profiles ||--o{ journals : writes

  marketing_campaigns ||--o{ leads : generates
  faculty ||--o{ live_classes : hosts
  course_enrollments }o--|| profiles : enrolls
  course_enrollments }o--|| courses : includes
```

Notes
- `profiles` is the canonical user profile table linked to `auth.users`.
- `roles` provides the role catalog; `profiles.role` uses controlled values.
- Realtime is enabled for `live_classes`, `assignments`, `submissions`, `journals`, `payments`, `donations`, `system_events`.
