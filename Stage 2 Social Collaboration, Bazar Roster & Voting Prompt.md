Now expand **Mess Calculator** with Phase 2 collaboration features while keeping Supabase database usage minimal:

### 1. Bazar Duty Roster & Route Planner
- Create a `bazar_schedule` table (`id`, `mess_id`, `assigned_user_id`, `scheduled_date`, `market_route_notes`, `shopping_list_json`, `status`: 'upcoming' | 'completed' | 'missed').
- Build a **Bazar Planner UI** where managers assign rotating bazar turns, attach a shared checklist of items to buy, and add preferred market/route notes.
- Add an **In-App Alert Banner** on the Dashboard when a logged-in user has Bazar duty today or tomorrow, plus a 1-click "Nudge via WhatsApp/Share" message generator.

### 2. Democratic Mess Voting System
- Create `polls` (`id`, `mess_id`, `question`, `options_json`, `closes_at`, `created_by`) and `poll_votes` (`poll_id`, `user_id`, `option_index`, unique constraint per user).
- Build a **Voting Card** in the `Arena & Polls` tab (e.g., "Friday Special Menu: Beef vs. Chicken Biryani?", "Approve Cook Salary Hike?"). Show live percentage bars once voted.

### 3. Lightweight Mess Noticeboard & Group Chat (Free-Tier Safe)
- Create a `mess_messages` table (`id`, `mess_id`, `user_id`, `content`, `is_announcement` boolean, `created_at`).
- **Crucial Database Optimization:** Write a PostgreSQL trigger that automatically deletes messages older than the latest **100 messages per mess** so storage never bloats.
- Pin `is_announcement = true` messages to the top of the Dashboard as an official Admin Noticeboard.