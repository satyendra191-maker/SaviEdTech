# RLS Policy Documentation

**Overview**
- RLS enabled on: `faculty`, `students`, `parents`, `lessons`, `experiments`, `journals`, `simulations`, `live_classes`, `assignments`, `submissions`, `marketing_campaigns`, `leads`, `ai_interactions`, `financial_reports`, `system_events`.
- Admin roles: `admin`, `super_admin`, `platform_admin`, `academic_director`.
- Finance roles: `finance`, `finance_manager`, `accounts_manager`, plus admin roles.
- Marketing roles: `marketing`, `marketing_manager`, `social_media_manager`, plus admin roles.
- Parent access uses `public.is_parent_of_student(student_id)` based on `parent_links`.

**Role helper functions**
- `public.is_finance_user(user_id)` checks finance + admin roles.
- `public.is_marketing_user(user_id)` checks marketing + admin roles.
- `public.is_faculty_user(user_id)` checks faculty/teacher + admin roles.

**Table policies**
- `faculty`: select own row or admin. Manage (insert/update/delete) admin only.
- `students`: select self or parent of student or admin. Insert/update self or admin.
- `parents`: select self or admin. Insert/update self or admin.
- `lessons`: select if course is published, user enrolled, or instructor/admin. Manage content roles.
- `experiments`: select all authenticated. Manage content roles.
- `journals`: select student, parent, faculty for matching subject, or admin. Write by student or admin.
- `simulations`: select all authenticated. Manage content roles.
- `live_classes`: select if enrolled, instructor, or admin. Manage by instructor/admin.
- `assignments`: select if enrolled, instructor, or admin. Manage by instructor/admin.
- `submissions`: select student, parent, instructor, or admin. Write by student or admin.
- `marketing_campaigns`: manage by marketing roles.
- `leads`: select by marketing roles. Insert allowed for `anon` and `authenticated`.
- `ai_interactions`: select/write by owner or admin.
- `financial_reports`: manage by finance roles.
- `system_events`: select by actor or admin. Insert by actor or admin.

**Notes**
- `payments` and `donations` RLS are already enforced and include finance role access.
- When testing realtime subscriptions, ensure the subscribing role matches these policies.
