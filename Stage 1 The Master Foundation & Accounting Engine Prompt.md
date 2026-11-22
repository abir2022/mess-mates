Act as a Senior Full-Stack Software Architect and Product Engineer. Build a mobile-first Progressive Web App (PWA) named **"Mess Calculator"** designed for shared student hostels, bachelor messes, and shared apartments.

### 1. Tech Stack & Constraints
- **Frontend:** React (Vite or Next.js App Router), TypeScript, Tailwind CSS, Lucide Icons. Configure `manifest.json` and a Service Worker so desktop and mobile users can install it directly as a PWA from the browser.
- **Backend & Auth:** Supabase (PostgreSQL, Google OAuth Sign-In, Row-Level Security). Optimize all queries and subscriptions to stay well within Supabase's Free Tier limits (500MB DB, 200 concurrent connections).
- **UI/UX Style:** Clean, modern fintech + social gaming aesthetic. Bottom navigation bar on mobile (`Dashboard`, `Meals & Bazar`, `Arena & Polls`, `Mess Hub`), responsive sidebar on desktop. Support both English and Bengali-friendly currency formatting (`৳` BDT default, configurable).

### 2. Core Database Schema (Generate SQL Migration + RLS Policies)
Create tables with strict Row-Level Security (RLS) so users only access data for their own Mess:
1. `profiles`: `id` (uuid, PK), `full_name`, `email`, `avatar_url`, `is_pro` (boolean, default false), `xp_points` (int, default 0).
2. `messes`: `id` (uuid, PK), `name`, `invite_code` (unique 6-char string), `currency_symbol` (default '৳'), `guild_banner_url`, `guild_points` (int, default 0), `is_pro_mess` (boolean, default false), `created_by` (uuid).
3. `mess_members`: `id` (uuid, PK), `mess_id` (FK), `user_id` (FK), `role` ('admin' | 'manager' | 'member'), `joined_at`, `status` ('active' | 'left').
4. `monthly_cycles`: `id` (uuid, PK), `mess_id` (FK), `month_label` (e.g., '2026-11'), `status` ('open' | 'closed').
5. `daily_meals`: `id` (uuid, PK), `cycle_id` (FK), `user_id` (FK), `date` (date), `breakfast` (numeric, default 0.5 or 1), `lunch` (numeric, default 1), `dinner` (numeric, default 1), `guest_meals` (numeric, default 0).
6. `bazar_expenses`: `id` (uuid, PK), `cycle_id` (FK), `buyer_id` (FK), `amount` (numeric), `items_summary` (text), `expense_date` (date), `status` ('pending' | 'approved').
7. `fixed_utilities`: `id` (uuid, PK), `cycle_id` (FK), `title` (e.g., 'Wi-Fi', 'Cook/Maid', 'Gas', 'Electricity'), `total_amount` (numeric), `split_type` ('equal' | 'custom').
8. `member_deposits`: `id` (uuid, PK), `cycle_id` (FK), `user_id` (FK), `amount` (numeric), `paid_date` (date), `note` (text).

### 3. Exact Financial Calculation Engine (Client-Side + SQL View)
Implement real-time, deterministic financial calculations for the active `monthly_cycle`:
- **Total Variable Bazar** = $\sum \text{amount}$ where `status = 'approved'`
- **Total Mess Meals** = $\sum (\text{breakfast} + \text{lunch} + \text{dinner} + \text{guest\_meals})$
- **Current Meal Rate** = $\frac{\text{Total Variable Bazar}}{\text{Total Mess Meals}}$ (handle divide-by-zero safely as `0.00`)
- **Fixed Utility Share per Member** = $\frac{\sum \text{fixed\_utilities.total\_amount}}{\text{Active Member Count}}$
- **Individual Member Payable** = $(\text{Member Total Meals} \times \text{Current Meal Rate}) + \text{Fixed Utility Share}$
- **Individual Net Balance** = $\text{Member Total Deposits} - \text{Individual Member Payable}$
  - Positive balance = **Refundable (Green)**
  - Negative balance = **Due / Payable (Red)** with a "Send Payment Reminder" button for Admins/Managers.

### 4. Phase 1 Screens to Build Now
1. **Auth & Onboarding:** Google Sign-In button -> "Create a New Mess" or "Join Mess via 6-Digit Invite Code".
2. **Dashboard:** Live Meal Rate card, Total Bazar vs. Total Deposit progress bar, Personal Net Balance card, and a breakdown table of all members' meals, deposits, and dues.
3. **Meal & Bazar Logger:** Fast grid toggle for daily meals (with Admin lock cutoff time) + form to submit Bazar expenses (Manager/Admin approval toggle) + Fixed Utility manager + Deposit tracker.
4. **Export:** Clean print/PDF month-end settlement summary view.

Start by generating the complete Supabase SQL schema and setting up the authentication flow and Dashboard UI.