# Mess Mates — Project Handbook

> The single source of truth for engineers taking over this project: what it is, how it is built, how the pieces fit, how to run and deploy it, and what is still missing.
>
> Last audited: **24 November 2026** · App version **1.0.0** · Status: **live on Vercel + Supabase, pre-revenue**

---

## 1. What the product is

**Mess Mates** is a mobile-first PWA for shared bachelor messes and hostels in Bangladesh. A mess is a group of people who pool money, buy groceries ("bazar"), cook and share monthly costs. Mess Mates replaces the notebook + WhatsApp + calculator workflow with:

- **Meal accounting** — breakfast / lunch / dinner / guest meals per member, per day.
- **Bazar ledger** — grocery expenses with buyer, amount, items and manager approval.
- **Fixed utilities** — cook salary, electricity, gas, Wi-Fi, split per active member.
- **Deposits** — money each member pays into the mess, with payment method, transaction reference and optional receipt image.
- **Automatic settlement** — meal rate, per-member payable, deposits, carried dues/credit and final balances.
- **Social layer** — announcement/chat board, bazar duty roster with WhatsApp nudges, polls.
- **Gamification** — guild points, chess rooms, pass-and-play dice duels, global guild leaderboard, avatar frames.
- **Monetization hooks** — free tier with ad slots and a demo "Pro mess" upgrade (billing provider not wired).
- **Bangla + English** UI, offline-tolerant writes, installable PWA, print/PDF/CSV/JSON exports.

Default currency is **৳ (BDT)**; ₹, $ and Rs are selectable per mess.

---

## 2. Quick start

```bash
# from the repository root (this folder)
bun install            # or: npm install
cp .env.example .env   # then fill the two values below (optional; see demo mode)

npm run dev            # Vite dev server on http://127.0.0.1:5273
npm run typecheck      # tsc --noEmit
bun test               # unit tests (bun:test runner)
npm run build          # typecheck + production build into dist/
npm run preview        # serve the production build
```

Node 18+ is required. Bun is only needed for the test runner; the app itself is built by Vite.

### Two runtime modes

| Mode | Trigger | Storage / auth |
|---|---|---|
| **Demo** | `VITE_SUPABASE_URL` **or** `VITE_SUPABASE_PUBLISHABLE_KEY` missing/blank | Everything in `localStorage`, seeded demo mess, one-click demo sign-in, no network |
| **Live** | Both variables present | Supabase Postgres + Auth + Storage, Google OAuth or email magic link |

Mode selection is a single branch in `src/lib/backend.ts → getBackend()`. There is no build-time flag; Vercel's environment variables decide.

### Environment variables

| Name | Where | Purpose | Secret? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env` locally; Vercel → Settings → Environment Variables | Supabase project URL | No (public) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | same | Supabase anon / publishable key | No (public by design; RLS enforces access) |

The names are `VITE_`-prefixed because Vite inlines them into the client bundle. **Never put the Supabase `service_role` key, the Google OAuth client secret, a PAT or a payment key in a `VITE_` variable.** `.env`, `.env.demo`, `.env.*` and `client_secret_*.json` are git-ignored; `git ls-files` contains only `.env.example`.

`.env.demo` is a local convenience file for switching to demo mode; it is ignored by git.

---

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| UI | React 18 + TypeScript 5.6 | Function components, hooks, no state library |
| Build | Vite 5 | `@vitejs/plugin-react`, output `dist/` |
| Styling | Tailwind CSS 3.4 + custom design tokens | `tailwind.config.js`: `brand` (teal), `ink` (slate), `flame` (orange), card shadows, `bg-guild-hero` |
| Icons | `lucide-react` | |
| Routing | `react-router-dom` v6, **HashRouter** | URLs like `/#/meals`; no server rewrite rules needed |
| Backend | Supabase (`@supabase/supabase-js` 2.45) | Postgres, Row Level Security, Auth, Storage |
| PDF | `jspdf` (lazy-imported) | A4 landscape-free portrait layout, multi-page tables |
| Chess | `chess.js` 1.0 | Rules/validation only; board is custom React |
| Tests | `bun:test` | 5 files, 31 tests |
| Hosting | Vercel (static) | Auto-deploy from `main` |
| Fonts | Google Fonts: Plus Jakarta Sans, Hind Siliguri | loaded in `index.html` |

No CSS framework beyond Tailwind, no component library, no i18n library, no global state library, no ORM, no server code.

---

## 4. Repository layout

```
Mess Mates App/
├─ index.html                     App shell, fonts, PWA manifest link, theme colour
├─ PROJECT.md                     This handbook
├─ package.json / bun.lock        Scripts and pinned deps
├─ vite.config.ts                 Dev server 127.0.0.1:5273
├─ tailwind.config.js             Design tokens
├─ tsconfig.json                  Strict TS config
├─ public/
│  ├─ logo.png                    500×500 icon (also maskable)
│  ├─ manifest.webmanifest        PWA name, colours, standalone, portrait
│  └─ sw.js                       Service worker (app-shell cache, network-first)
├─ src/
│  ├─ main.tsx                    React root + HashRouter + SW registration on load
│  ├─ App.tsx                     Providers, auth/onboarding gate, lazy routes
│  ├─ index.css                   Tailwind layers, component classes, print rules
│  ├─ context/AppContext.tsx      Session, workspace, settlement, outbox sync state
│  ├─ components/
│  │  ├─ Layout.tsx               Desktop sidebar, mobile header, bottom nav, banners
│  │  ├─ ui.tsx                   Button, IconButton, Modal, Tabs, Avatar, ProgressBar,
│  │  │                           Stepper, CopyButton, EmptyState, Pill, SectionHeading
│  │  ├─ LanguageToggle.tsx       EN/বাংলা switch
│  │  ├─ ReminderCenter.tsx       In-app reminders + device notification + WhatsApp
│  │  ├─ Monetization.tsx         Ad/reward preview, Pro upgrade modal, BannerAdSlot
│  │  ├─ ChessGame.tsx            Hot-seat chess with Supabase-synced room state
│  │  ├─ DiceDuel.tsx             Pass-and-play dice, 2–4 players, 3 rounds
│  │  └─ ErrorBoundary.tsx        Recoverable crash screen
│  ├─ pages/
│  │  ├─ Auth.tsx                 Splash, sign-in, create/join mess onboarding
│  │  ├─ Dashboard.tsx            Month overview, personal balance, member table
│  │  ├─ MealsBazar.tsx           Meals / Bazar / Utilities / Deposits tabs
│  │  ├─ Arena.tsx                Polls / Games / Guild tabs
│  │  ├─ Hub.tsx                  Board / Roster / Settings tabs
│  │  └─ Settlement.tsx           Printable month-end statement + PDF
│  └─ lib/
│     ├─ types.ts                 Domain types (Profile, Mess, Workspace, …)
│     ├─ backend.ts               Backend interface, demo/live selection, offline wrapper
│     ├─ supabaseBackend.ts       Live implementation (queries, RPCs, storage)
│     ├─ demo.ts                  localStorage implementation with seeded month
│     ├─ calc.ts                  Settlement engine + meal lock rule
│     ├─ outbox.ts                Offline write queue + workspace cache
│     ├─ reminders.ts             Pure reminder derivation
│     ├─ export.ts                JSON backup + settlement CSV
│     ├─ pdf.ts                   jsPDF settlement statement
│     ├─ format.ts                Money, dates, month labels, initials
│     ├─ i18n.ts                  EN/BN dictionaries, `t()`, `useI18n`
│     └─ pwa.ts                   SW registration + update-ready event
├─ supabase/migrations/           001 → 004, run in order in the SQL editor
└─ tests/                         calc, outbox, export, i18n, reminders
```

---

## 5. Architecture and data flow

```
                 ┌───────────────────────────────┐
                 │  React pages / components     │
                 │  (read via useApp())          │
                 └───────────────┬───────────────┘
                                 │ useApp()
                 ┌───────────────▼───────────────┐
                 │ AppContext                    │
                 │  user, ws, cycle, settlement  │
                 │  run(action) = action+refresh │
                 └───────────────┬───────────────┘
                                 │ Backend interface
              ┌──────────────────▼───────────────────┐
              │ getBackend()                         │
              │  demo → localStorage                 │
              │  live → createOfflineBackend(        │
              │            createSupabaseBackend())  │
              └───────────────┬──────────────────────┘
                              │
        ┌─────────────────────┴──────────────────────┐
        │ Supabase Postgres + RLS + Storage          │
        │ tables, RPCs, views, triggers              │
        └────────────────────────────────────────────┘
```

Key rules:

1. **Pages never call Supabase directly.** They call `backend.*` through `useApp()`.
2. **Every mutation goes through `run(...)`**, which sets `busy`, awaits the write, reloads the whole workspace, and shows a toast/error. There are no optimistic updates except the offline outbox.
3. **`loadWorkspace()` returns one `Workspace` object** containing profile, mess, members, cycles, meals, bazar, utilities, deposits, duty, polls, votes, messages, games and leaderboard. Pages derive everything from it.
4. **Settlement is computed on the client** (`computeSettlement`) from the workspace snapshot. The SQL view `cycle_member_summary` mirrors the formulas for reporting but the UI does not read it.
5. **The live backend maps Postgres JSON column names to client fields** (`options_json → options`, `shopping_list_json → shopping_list`, `state_json → state`). Keep this mapping when adding JSON columns.

### AppContext surface

| Field | Meaning |
|---|---|
| `backend` | The selected `Backend` implementation |
| `user` | Signed-in `Profile` or `null` |
| `ws` | `Workspace` or `null` (null + user ⇒ onboarding) |
| `cycle` / `cycleId` | Selected month; defaults to the open cycle |
| `settlement` | `computeSettlement(ws, cycle.id)` |
| `ready` | Initial session/workspace load finished |
| `busy` | A mutation or sync is in flight |
| `online`, `pending` | Connectivity and queued-write count |
| `error`, `notice` | Transient toast strings (English, auto-dismiss) |
| `run`, `refresh`, `syncNow` | Mutation helper, reload, flush outbox |
| `signIn*`, `signOut`, `createMess`, `joinMess` | Auth/onboarding actions |

---

## 6. Data model (Supabase)

All tables live in `public`. RLS is enabled on every table. IDs are UUIDs except demo fixtures.

### Core tables

| Table | Key columns | Relationships |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `full_name`, `email`, `avatar_url`, `is_pro`, `xp_points`, `avatar_frame`, `frame_unlocked_until` | 1–1 with auth user; created by trigger `handle_new_user` and repaired client-side by `ensureProfile()` |
| `messes` | `id`, `name`, `invite_code` (6 chars, unique), `currency_symbol`, `guild_banner`, `guild_emblem`, `guild_points`, `is_pro_mess`, `meal_lock_hour`, `created_by` | the tenant/root aggregate |
| `mess_members` | `id`, `mess_id`, `user_id`, `role` (`admin`/`manager`/`member`), `status` (`active`/`left`), `joined_at`, unique (`mess_id`,`user_id`) | membership + role; soft leave preserves history |
| `monthly_cycles` | `id`, `mess_id`, `month_label` (`YYYY-MM`), `status` (`open`/`closed`), unique (`mess_id`,`month_label`) | accounting period |
| `daily_meals` | `cycle_id`, `user_id`, `date`, `breakfast`, `lunch`, `dinner`, `guest_meals`, unique (`cycle_id`,`user_id`,`date`) | decimals in 0.5 steps; all meals stored even 0 |
| `bazar_expenses` | `cycle_id`, `buyer_id`, `amount`, `items_summary`, `expense_date`, `status` (`pending`/`approved`) | only approved rows count in the rate |
| `fixed_utilities` | `cycle_id`, `title`, `total_amount`, `split_type` (`equal`/`custom`) | always split equally by active member count today |
| `member_deposits` | `cycle_id`, `user_id`, `amount`, `paid_date`, `note`, `method` (`cash`/`bkash`/`nagad`/`bank`/`other`), `reference`, `proof_path` | proof stored in private bucket |
| `bazar_schedule` | `mess_id`, `assigned_user_id`, `scheduled_date`, `market_route_notes`, `shopping_list_json`, `status` (`upcoming`/`completed`/`missed`) | bazar duty roster |
| `polls` | `mess_id`, `question`, `options_json`, `closes_at`, `created_by` | options are a JSON array of strings |
| `poll_votes` | `poll_id`, `user_id`, `option_index`, unique (`poll_id`,`user_id`) | one vote per member, updatable |
| `mess_messages` | `mess_id`, `user_id`, `content` (≤800 chars), `is_announcement` | trigger trims to latest 100 per mess |
| `game_rooms` | `mess_id`, `game_type` (`chess`/`dice`/`challenge`), `code`, `state_json`, `status`, `winner_user_id`, `points_awarded` | chess state = `{fen, history, lastMove}` |
| `signup_errors` | `user_id`, `email`, `sqlstate`, `message` | diagnostics only; service-role readable, no policies |
| Storage `deposit-proofs` | path `<mess_id>/<uuid>.<ext>` | private bucket, 5 MB, png/jpeg/webp/pdf |

### Views

- `guild_leaderboard` — `security_invoker = false`, exposes `id, name, guild_points, guild_emblem, guild_banner` to any authenticated user, used for the global Arena ranking (no invite codes).
- `cycle_member_summary` — `security_invoker = true`, SQL mirror of the settlement formulas. Not consumed by the app currently; useful for SQL/BI.

### RPCs (SECURITY DEFINER)

| Function | Caller | Purpose |
|---|---|---|
| `create_mess(p_name, p_currency)` | authenticated | Creates mess, admin membership, first cycle, unique invite code |
| `join_mess(p_code)` | authenticated | Joins by code; re-activates a left membership |
| `award_game_win(p_room)` | member | +25 guild points to the mess, +10 XP to caller, exactly once (`points_awarded`) |
| `set_member_role(p_member, p_role)` | admin only | Role change; protects the last admin |
| `remove_mess_member(p_member)` | admin/manager | Soft-removes; managers can't remove admins; last admin protected |
| `leave_mess()` | authenticated | Soft-leaves own membership; sole admin must hand over first |
| `handle_new_user()` | trigger | Profile bootstrap that never blocks sign-up (003) |
| `enforce_meal_lock()` | trigger | Closed cycle blocks all meal writes; members locked out of past days and after `meal_lock_hour` |
| `enforce_open_cycle()` | trigger | Closed cycle blocks bazar/utility/deposit writes |
| `trim_mess_messages()` | trigger | Keeps the newest 100 messages per mess |
| `is_mess_member`, `can_manage_mess`, `mess_of_cycle`, `can_manage_cycle`, `role_in_mess`, `cycle_status_of` | internal | RLS helpers (avoid recursive policies) |

### Role matrix

| Action | Member | Manager | Admin |
|---|---|---|---|
| View mess data | ✅ | ✅ | ✅ |
| Edit own meals (today, before lock) | ✅ | ✅ | ✅ |
| Edit any meal / past day | ❌ | ✅ | ✅ |
| Add bazar (auto-approved?) | pending | approved | approved |
| Approve/delete any bazar | own only (delete) | ✅ | ✅ |
| Add/delete utilities | ❌ | ✅ | ✅ |
| Add deposit (self) | ✅ | ✅ | ✅ |
| Add deposit for others | ❌ | ✅ | ✅ |
| Bazar duty create/delete | ❌ | ✅ | ✅ |
| Complete own duty | ✅ | ✅ | ✅ |
| Polls create/delete | create; delete own | ✅ | ✅ |
| Post announcements | ❌ | ✅ | ✅ |
| Mess settings, cycles, close month | ❌ | ✅ | ✅ |
| Roles / remove members | ❌ | remove non-admins | ✅ |
| Leave mess | ✅ | ✅ | ✅ (if another admin) |
| Guild banner/emblem | any member | any member | any member |

> The client hides what a role cannot do, but **RLS/RPCs are the enforcement layer**; never rely on the UI for authorization.

---

## 7. The financial engine (single source of truth)

Implemented twice, intentionally: `src/lib/calc.ts` (UI/tests) and `cycle_member_summary` (SQL reporting). Keep them in sync.

For a cycle:

```
totalMeals   = Σ (breakfast + lunch + dinner + guest_meals) for all logs in the cycle
totalBazar   = Σ amount of bazar rows with status = 'approved'      (pending excluded)
totalUtilities = Σ total_amount of fixed utilities
activeMembers  = members with status = 'active'
mealRate     = totalMeals > 0 ? round(totalBazar / totalMeals, 2) : 0
utilityShare = round(totalUtilities / activeMembers, 2)

memberMeals  = Σ that member's four meal fields
mealCost     = round(memberMeals × mealRate, 2)
payable      = round(mealCost + utilityShare, 2)
deposits     = Σ that member's deposits in this cycle
carried      = net balance from every cycle with an earlier month_label
balance      = round(deposits + carried − payable, 2)
```

- `balance < 0` ⇒ member owes the mess (shows red).
- `balance > 0` ⇒ member is refundable / in credit.
- `refundable` = Σ positive balances, `due` = Σ |negative balances|.
- Carry-forward is recursive over earlier months (`carriedBalances`), so unpaid dues compound; `carryForward: false` is used internally to compute each month in isolation.
- Bazar paid by a member is **not** added to their balance directly; it funds the pool through the meal rate, and the dashboard shows `bazarPaid` separately.
- All money is rounded to 2 decimals with `round2`; meal quantities are rounded to 0.5 in the client and stored as `numeric(6,2)`.
- A member leaving mid-month stops being included in `activeMembers`/utility split, but their meals and deposits remain in the cycle history.

### Meal lock

- Closed cycle ⇒ nothing can be written to meals/bazar/utilities/deposits (DB trigger).
- Open cycle, role `member`, date before today ⇒ locked.
- Open cycle, role `member`, today at/after `meal_lock_hour` (default 22:00 Asia/Dhaka) ⇒ locked.
- Admins/managers bypass date/hour locks (but not the closed-cycle lock).
- The client shows the same rule early via `isMealLocked`, but Postgres is authoritative.

---

## 8. Features and how they interact

### 8.1 Auth and onboarding (`pages/Auth.tsx`)

```
Splash (AppContext.ready=false)
   │
   ├─ no user ──► AuthScreen
   │                ├─ Live: Google OAuth OR email magic link
   │                └─ Demo: "Enter demo mess"
   │
   ├─ user + no workspace ──► OnboardingScreen
   │                           ├─ Create mess (name + currency) → RPC create_mess
   │                           └─ Join mess (6-char code)        → RPC join_mess
   │
   └─ user + workspace ──► AppLayout + routes
```

- Google OAuth redirects back to `window.location.origin + window.location.pathname`; because of HashRouter the path is `/`, so `https://mess-mates.vercel.app/`.
- Email uses `signInWithOtp` (magic link), same redirect.
- `supabaseBackend.currentUser()` calls `auth.initialize()` first so a failed OAuth redirect surfaces a real error instead of silently returning to login.
- Profile creation is belt-and-braces: DB trigger + `ensureProfile()` client fallback with three insert attempts (full row, id+name, id only).

### 8.2 Dashboard (`/`)

Reads the selected cycle's settlement and shows:

- meal rate, total meals, approved bazar, pending bazar, deposits-vs-bazar progress
- personal net balance, deposits, meal cost, utility share, carried balance, total payable
- member breakdown table (meals, bazar paid, deposits, payable, balance)
- manager-only WhatsApp "Send" reminder per member with a negative balance
- bazar duty card for today/tomorrow with WhatsApp nudge
- two latest announcements
- `ReminderCenter`, guild rank link, ad slot / Pro badge
- cycle selector; free tier locks archives older than the two most recent cycles (UI gate → opens Pro modal)

### 8.3 Meals & Bazar (`/meals`)

Four tabs share the selected cycle:

1. **Meals** — date picker (±1 day, Today), per-active-member steppers for breakfast (0.5 step, max 3), lunch/dinner (max 4), guests (max 10). Saves each change immediately. Shows day total and its money value. Lock banner when the day/cycle is locked.
2. **Bazar** — expense form (amount, item summary, date). Members submit `pending`; managers get `approved` directly. List with status pills, manager approve button, delete (manager or the buyer). Approved/pending totals.
3. **Utilities** — managers add title + amount (always equal split); everyone sees total and per-member share; managers delete.
4. **Deposits** — managers can record for any member; members only for themselves. Fields: amount, date, method (cash/bKash/Nagad/bank/other), transaction reference, optional receipt (≤2 MB client-side; bucket allows 5 MB), note. Receipts open through a 1-hour signed URL. Closed cycle disables the form.

**Interaction with settlement:** meals drive `mealRate`, bazar approval drives `totalBazar`, utilities drive `utilityShare`, and deposits drive each balance. Pending bazar is visible but excluded.

### 8.4 Hub (`/hub`)

1. **Board** — group chat + announcements. Any member posts; managers/admins can pin a message as an announcement. Newest 100 kept by DB trigger. Enter sends, Shift+Enter newline.
2. **Roster** — bazar duty cards (assignee, date, route notes, shopping list), WhatsApp nudge, mark completed/missed (manager or assignee), delete (manager), plus history.
3. **Settings**
   - mess profile: name, currency, meal lock hour (managers)
   - invite code with copy
   - own display name
   - member list: admin can change roles and remove members; manager sees read-only roles here
   - cycles: view/close any cycle, start a new month (closes older ones)
   - Pro card (demo upgrade)
   - **Data & privacy**: download full workspace JSON, download settlement CSV for the selected cycle, leave mess, account-deletion support note
   - account: sign out; in demo mode, reset demo data

### 8.5 Arena (`/arena`)

1. **Polls** — create (question, 2–4 options, closes in 1/2/3/7 days). Vote once, change vote allowed until close. Results bars appear after you vote or when closed. Delete own poll; managers can delete any.
2. **Games**
   - **Chess** — creates a `game_rooms` row with initial FEN; board is hot-seat, every move writes `{fen, history, lastMove}`; checkmate sets winner and calls `award_game_win` (+25 guild points, +10 XP, once). Other players must press Sync/refresh to see moves (no realtime subscription).
   - **Dice Duel** — local pass-and-play, 2–4 active members, 3 rounds each; on completion the client creates a finished `dice` room and awards the win.
   - **Challenge room** — rewarded-ad gate, then a chess room with a custom title.
3. **Guild** — guild banner/emblem pickers (any member can change the mess guild identity), avatar frame picker (premium frames gated by Pro or a rewarded ad), global leaderboard from `guild_leaderboard`, own rank.

### 8.6 Settlement (`/settlement`)

Printable statement with header, five summary tiles, full per-member table (B/F/L/D/guest/meals/meal cost/utility/payable/deposits/carried/balance), totals, dues vs refundable cards, formula explanation and signature lines.

- **Print** uses `window.print()` and dedicated `@page` A4 CSS (10 mm margins, hidden nav/buttons, unclipped table, repeated header, page-break-safe rows).
- **Branded PDF** uses lazy-loaded jsPDF; free users must "watch" a 5-second rewarded-ad preview first. Non-Latin currency symbols print as `BDT`.

### 8.7 Reminders (`components/ReminderCenter.tsx` + `lib/reminders.ts`)

Pure rules over the current workspace/cycle/user:

| Kind | Condition | Link |
|---|---|---|
| `dues` | my balance < −0.5 | `/meals` |
| `duty` | my upcoming duty today/tomorrow | `/hub` |
| `meals` | open cycle, no meal logged today | `/meals` |
| `poll` | unvoted poll closing today/tomorrow | `/arena` |
| `approvals` | manager/admin + pending bazar this cycle | `/meals` |

Managers also get "Remind all" which composes a WhatsApp message listing every defaulter and the meal rate. Device notifications are requested manually and fire **at most once per day** while the app is open (`mm_reminders_notified_v1`). There is no push server.

### 8.8 Exports

| Format | Code | Contents |
|---|---|---|
| JSON backup | `lib/export.ts → downloadWorkspace` | Entire workspace, `app: "mess-mates"`, `schema: 1`, `exportedAt` |
| CSV | `lib/export.ts → downloadSettlementCsv` | Selected cycle settlement, UTF-8 BOM for Excel/Bangla, RFC 4180 quoting |
| PDF | `lib/pdf.ts` | A4 settlement statement, multi-page, BDT fallback |
| Print | `Settlement.tsx` + print CSS | Browser print dialog |

### 8.9 PWA, offline and updates

- `public/manifest.webmanifest`: standalone, portrait, theme `#0d6963`, 500×500 icons.
- `public/sw.js` (`mess-mates-v2`): caches the shell on install, `skipWaiting` + `clients.claim`, network-first for same-origin GETs, caches only real same-origin 200s, skips `/auth/` and `/rest/`, offline fallback to cached request then `index.html`. It does **not** cache Supabase API responses.
- `lib/pwa.ts`: registers only in production builds; detects a waiting/installed worker and emits `mm-pwa-update`; checks for updates when the tab becomes visible and hourly. `Layout` shows a "New version ready — Reload / Later" banner.
- **Offline writes** (`lib/outbox.ts` + `createOfflineBackend`): when offline or a network error occurs, replayable writes are queued in `localStorage` (`mm_outbox_v1`, max 250), optimistically applied to the cached workspace (`mm_workspace_cache_v1`), and replayed in order on `online`/manual sync. Max 3 attempts for non-network failures; a still-offline failure does not consume an attempt. Queued operations: meals, bazar add/status/delete, utilities add/delete, deposits add/delete, duty add/update/delete, polls create/delete/vote, messages, profile patch, mess patch. **Not queued:** auth, create/join mess, role changes, member removal, cycles, games, storage uploads.
- Offline banner in `Layout` shows connection state and queue length, with a Sync now button.

### 8.10 Internationalisation

- `src/lib/i18n.ts` holds a single typed English object (`as const`) → `MessageKey`, and `bn: Record<MessageKey, string>`. A missing Bangla key is a TypeScript error.
- `useI18n()` returns `{ lang, setLang, toggle, t }`; language persists in `mm_lang_v1`; `<html lang>` and the Hind Siliguri font class are updated.
- Dates use `toLocaleDateString('en-US')` helpers in `format.ts`, so month names stay English in both languages.
- Known untranslated UI: PDF body/labels, transient `run(...)` success/error toasts and offline-sync messages, Monetization modals/banner, ChessGame/DiceDuel instructions, ErrorBoundary, WhatsApp message templates, `relativeDay` ("Today"/"Tomorrow"), `roleLabel` enum values in a few pills.

---

## 9. Security model

- **RLS on every table.** Membership is checked through `SECURITY DEFINER` helpers to avoid recursive policies.
- Members can only see their own mess; `profiles_select` also allows co-members.
- Money writes are further constrained by cycle status and meal-lock triggers, so a modified client cannot rewrite a closed month.
- Private storage bucket `deposit-proofs`, path-scoped by `mess_id`, owner-checked insert, member-checked read, owner/manager delete, 1-hour signed URLs.
- Role changes and removals use RPCs with explicit checks, not table writes, because the 001 `members_update` policy was too broad.
- The Supabase anon/publishable key is public by design; **all** protection must be RLS, not key secrecy.
- `guild_leaderboard` deliberately exposes all mess names/points to authenticated users. If that becomes a privacy concern, restrict the view.
- Members are soft-removed (`status='left'`); their history stays, and they can rejoin with the invite code. Removal is **not** a ban. A real ban list would need a new column/table and a `join_mess` check.
- No CSRF concern (token-based Supabase client), no server routes, no cookies set by this app.
- Secrets hygiene: `.env*`, `.vercel`, `client_secret_*.json` are ignored. Audit of git history found only `.env.example` (placeholders). If a real PAT or OAuth secret was ever pasted into a chat/issue, rotate it.

---

## 10. Supabase setup (fresh environment)

You need a Supabase account and project. The existing project ref is `eyzjjtyujyexxxuudlmz`.

1. **Create the project** (region close to Bangladesh, e.g. Singapore/Mumbai).
2. **Run migrations** in the SQL Editor, in order. Every file is idempotent:
   1. `supabase/migrations/001_mess_mates.sql` — tables, helpers, RLS, views, RPCs, triggers.
   2. `supabase/migrations/002_hardening.sql` — deposit payment columns, cycle/meal lock triggers, `deposit-proofs` bucket + policies.
   3. `supabase/migrations/003_fix_signup.sql` — signup error log, profile schema repair, non-blocking profile trigger.
   4. `supabase/migrations/004_roles_and_members.sql` — `set_member_role`, `remove_mess_member`, `leave_mess`.
   > **Current live project:** 004 must still be run once in the SQL Editor. Until then live role changes, member removal and "Leave this mess" fail with a missing-function error.
3. **Auth → Providers → Google**: enable, add the Google client ID/secret from Google Cloud Console. Authorised redirect URI in Google Cloud: `https://<project-ref>.supabase.co/auth/v1/callback`.
4. **Auth → URL Configuration**:
   - Site URL: `https://mess-mates.vercel.app`
   - Redirect URLs: `https://mess-mates.vercel.app/**`, `http://127.0.0.1:5273/**` (and `http://localhost:5273/**` if you use it).
5. **Auth → Email**: magic links use the default Supabase mailer; configure custom SMTP before relying on it for real users (default limits are low).
6. **Storage**: bucket `deposit-proofs` is created by 002; keep it **private**.
7. Copy **Project URL** and **anon/publishable key** from Project Settings → API into `.env` / Vercel.

Useful verification SQL:

```sql
select table_name from information_schema.tables
 where table_schema = 'public' order by 1;

select proname from pg_proc
 where proname in ('set_member_role','remove_mess_member','leave_mess');

select * from public.signup_errors order by created_at desc limit 20;
```

---

## 11. Local development

```bash
bun install
cp .env.example .env      # optional; leave blank for demo mode
npm run dev
```

- Dev server is pinned to `127.0.0.1:5273` in `vite.config.ts` (override with `npm run dev -- --port 5199`).
- Demo sign-in needs no credentials; the seeded mess is "Chittagong Boys Mess", invite code `MM7K2Q`, two cycles, 5 members, meals/bazar/utilities/deposits/polls/duty/games.
- Demo state lives in `localStorage` under `messmates.demo.v1`; reset from Hub → Settings → Reset demo data.
- Service worker is **not** registered in dev (`import.meta.env.PROD`), so PWA update behaviour must be tested against a production build (`npm run build && npm run preview`) or Vercel.
- Tests are fast and pure; they do not touch Supabase or the DOM.

### Quality gates currently in the repo

```bash
npm run typecheck   # must exit 0
bun test            # 31 tests / 5 files, all pass
npm run build       # tsc --noEmit + vite build (a >500 kB chunk warning is expected)
```

There is **no ESLint/Prettier config, no CI workflow, no E2E/browser test suite, and no coverage threshold.** Adding CI that runs the three commands above is the highest-value engineering follow-up.

---

## 12. Deployment (Vercel)

- Repo: `github.com/abir2022/mess-mates` (branch `main`).
- Vercel project: `abir2022s-projects/mess-mates` → `https://mess-mates.vercel.app`.
- Framework preset: **Vite**. Build command `npm run build`, output `dist`, install `npm install` (lockfile `bun.lock` also present).
- No `vercel.json` is needed: the app is a static SPA with HashRouter, so deep links never hit the server.
- Environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are configured in Vercel for Production (and Preview if desired). Changing them requires a redeploy.
- Pushing `main` triggers a production deploy. Preview deployments get their own `*.vercel.app` URL; add that URL to Supabase redirect URLs if you sign in from a preview.
- `.vercel/` is git-ignored and local-only.

**Release checklist**

1. `npm run typecheck && bun test && npm run build`
2. Confirm migrations on the target Supabase project (especially any new one).
3. Commit + push `main`; wait for Vercel "Ready".
4. Open the deployed URL, sign in, hard-reload once to pick up the new service worker.
5. For PWA, check the update banner appears after a second deploy (production only).

---

## 13. Operations / troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Database error saving new user" / OAuth bounces to login | profile trigger raised | Run 003; inspect `public.signup_errors`; confirm `profiles` schema matches |
| Live role change / remove / leave errors | migration 004 not applied | Run `004_roles_and_members.sql` |
| Polls, roster or chess room crashes in live mode | Postgres JSON columns not mapped to client fields | Already fixed in `supabaseBackend.loadWorkspace`/`createGame`; keep mapping for new JSON columns |
| Deposit save fails | 002 not applied (no `method`/`reference`/`proof_path`) | The client falls back to a legacy insert; run 002 for full features |
| Receipt upload fails | bucket/policies missing or file >5 MB | Run 002; keep files ≤2 MB in the client |
| "This monthly cycle is closed…" | expected DB guard | Re-open the cycle or use managers' override for meals? No: closed blocks everyone; reopen in Hub |
| "Meals for past days are locked" | expected member lock | Manager/admin edit, or change `meal_lock_hour` |
| Stale UI after another member's change | no realtime subscription | Reload/press Sync in the relevant screen; add Supabase Realtime later |
| PWA serves an old build | service worker lifecycle/browser cache | Reload when banner appears; verify `mess-mates-v<N>` cache name; hard reload |
| Queued offline changes not syncing | still offline or RLS rejection | Open the banner's Sync now; check console; rejected ops retry 3× then drop with an error toast |
| Excel shows garbled Bangla | CSV opened without UTF-8 | Files include a BOM; use Excel's import or Google Sheets |
| PDF shows `BDT` instead of ৳ | jsPDF WinAnsi fonts | Expected; embed a Unicode font if this matters |

### Rotating credentials

1. Supabase → Settings → API → rotate anon key if abused; update Vercel env; redeploy.
2. Google Cloud → Credentials → rotate the OAuth client secret; update Supabase provider settings (never the repo).
3. GitHub → Developer settings → revoke old PATs; use a fine-grained token or SSH.
4. If the repo is public, make it private unless the project is intentionally open source; the anon key is still safe by RLS, but business plans/customer data should not be public.

---

## 14. Testing map

| File | Covers |
|---|---|
| `tests/calc.test.ts` | meal rate, utility share, payable/balance, pending exclusion, guest meals, zero meals, rounding, inactive members, carry-forward (dues, advance, multiple months, isolation), `carryForward:false` |
| `tests/outbox.test.ts` | optimistic apply per op, queue persistence, ordering, retry/attempts, offline detection, cache, flush, max queue |
| `tests/export.test.ts` | JSON backup envelope, CSV quoting/BOM/rows, filename slugs |
| `tests/i18n.test.ts` | interpolation, missing placeholders, every key present in Bangla, sample translations differ |
| `tests/reminders.test.ts` | dues/duty/meals/poll/approval rules, tones/links, outstanding dues ordering, WhatsApp text |

Not covered: React components, Supabase RLS/RPCs, auth flows, PWA/service worker, PDF layout, print CSS. Those are verified manually (or not at all — see §16).

---

## 15. Product / business context

The repo also contains early planning documents (not used at runtime):

- `mess_mates_business_plan.md`, `Mess_Mates_Business_Plan_and_Analytics.docx`
- `Stage 1 The Master Foundation & Accounting Engine Prompt.md`
- `Stage 2 Social Collaboration, Bazar Roster & Voting Prompt.md`
- `Stage 3 Mini-Games, Guild Challenges & AdPro Monetization Hooks.md`

Business model in the code:

- **Free tier**: all accounting, social features, two recent cycle archives, ad slots, rewarded-ad gates for premium frames/challenge rooms/branded PDF.
- **Pro mess** (`৳199/month` shown in UI): ad-free, unlimited archives, premium frames, challenge rooms. There is still no payment provider, so **Pro is granted manually by support** (SQL in the dashboard) and the app cannot change the flag at all — see §22.
- Ads are placeholders (`BannerAdSlot`, 5-second rewarded preview); no AdSense/AdMob SDK is installed.
- Guild points (25/win) and XP (10/win) are the retention loop; leaderboard is global across messes.

---

## 16. Audit findings (24 Nov 2026)

### Fixed during this audit

1. **Live JSON-shape bug (high).** `loadWorkspace()` cast Postgres rows directly to `Poll`, `BazarDuty` and `GameRoom`, but the DB stores `options_json`, `shopping_list_json` and `state_json`. In Supabase mode, opening Arena → Polls crashed on `poll.options.map`, Hub → Roster crashed on `duty.shopping_list.length`, and a chess room crashed reading `room.state.fen` (caught by ErrorBoundary). Added explicit mapping in `supabaseBackend.loadWorkspace()` and for `createGame()`'s returned room.

### Open issues, ranked

1. **Migration 004 not applied to the live database (blocker for the newest features).** Role changes, member removal and self-leave will error until the SQL is run. User action required.
2. ~~**No CI.**~~ **Fixed** — `.github/workflows/ci.yml` runs install → typecheck → tests → build on every push to `main` and every pull request (see §20).
3. ~~**Monetization is not production-safe.**~~ **Client hole closed** — the free `upgradePro()` path is gone and migration `006_pro_entitlement.sql` blocks client writes to both Pro flags (§22). Still open: there is no billing provider and no subscription state, so activation stays manual.
4. **Free archive limit is cosmetic.** The two-cycle cap is a Dashboard dropdown gate; Supabase still returns every cycle, so a modified client can read all history. **Do not "fix" this by trimming the fetch:** `carriedBalances()` in `src/lib/calc.ts` walks every earlier cycle to build the carry-forward chain, so dropping old cycles from the payload silently zeroes real money in the current month's settlement. A real cap has to keep the chain readable (an RLS rule on the cycle tables plus a server-side aggregate for the carry) and needs a product decision about what a downgraded mess keeps.
5. **Removal is not a ban.** A removed member can rejoin with the invite code (`join_mess` re-activates).
6. ~~**No realtime.**~~ **Fixed in code** — the app subscribes to Postgres changes for every workspace table and reloads on a debounce (see §21). Needs migration `005_realtime.sql` run once on the live project; until then it falls back to manual refresh.
7. **Device reminders are foreground-only.** No Web Push/service-worker push, no scheduled server job; WhatsApp nudges open a prefilled chat and depend on the user pressing send.
8. **i18n is incomplete** in PDF, toasts, Monetization, game instructions, ErrorBoundary, WhatsApp templates and date-relative labels (see §8.10).
9. ~~**Dice Duel records the caller as winner.**~~ **Fixed** — `DiceDuel` now reports the real highest scorer (`null` on a draw) and `finishDice` stores that id. `award_game_win` credits the *caller's* XP, so it now only runs when the device owner actually won; a mate's win is recorded under their name and earns the caller nothing. Remaining limitation: in that case the mess itself gains no guild points for the duel.
10. **No server-side rate limits/abuse controls** on poll/message/game creation beyond RLS and character limits.
11. **`guild_leaderboard` is global** and reveals every mess name/points to any authenticated user.
12. **No account deletion flow.** Hub only shows a support note; GDPR/data-deletion needs an admin RPC or dashboard process.
13. **Accessibility not audited**: icon-only buttons have some `title`/`aria-label`, but focus traps, contrast and keyboard navigation in modals/chess have not been verified.
14. **No error reporting** (Sentry/etc.) and no analytics; crashes only reach `console`.
15. **No staging environment**; Vercel previews share the production Supabase project unless configured otherwise.

### Verified in this audit

- `npm run typecheck` — pass.
- `bun test` — 31 pass / 0 fail (5 files).
- `npm run build` — pass (known >500 kB chunk warning from jsPDF/chess).
- Git history contains no `.env` or `client_secret_*.json`; only `.env.example` is tracked.
- Working tree contained the uncommitted backlog work (#9 i18n, #11 print, #13 roles, #14 exports/leave, #16 PWA update); it is committed with this handbook.

### Not verified

- No browser click-through of the new features (roles, export buttons, print dialog, PWA update banner, chess/polls against live Supabase).
- No live Supabase session was available, so RLS/RPC behaviour was reviewed statically; migration 004's functions have not been exercised on the live project.
- No device install/PWA offline test, no Lighthouse/accessibility audit.

---

## 17. Glossary

| Term | Meaning |
|---|---|
| **Mess** | The tenant/group; one household sharing costs |
| **Cycle** | One accounting month (`YYYY-MM`), open or closed |
| **Bazar** | Grocery/market shopping; an expense row with a buyer |
| **Meal rate** | Approved bazar ÷ total meals; the price of one meal |
| **Utility share** | Fixed utilities ÷ active members |
| **Deposit** | Money a member puts into the mess |
| **Payable** | What a member owes for meals + utilities |
| **Carried balance** | Net over/under-payment rolled from earlier months |
| **Settlement** | The full month-end statement |
| **Guild** | The gamified identity of a mess (banner, emblem, points) |
| **Pro** | Demo subscription state that removes ads and unlocks extras |

---

## 18. Handover checklist

- [ ] Get access to the GitHub repo, Vercel project and Supabase project.
- [ ] Run migration `004_roles_and_members.sql` on the live Supabase project.
- [ ] Put `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`; never commit them.
- [ ] Decide repo visibility and rotate any credential that may have been shared in chat.
- [ ] Read `src/lib/backend.ts`, `src/lib/calc.ts`, `src/context/AppContext.tsx` first; then the four tabs of `MealsBazar` and `Hub`.
- [x] CI runs install → typecheck → tests → build on every push and PR (`.github/workflows/ci.yml`, §20).
- [ ] Run `supabase/migrations/005_realtime.sql` so live updates work (§21).
- [ ] Before charging money: integrate a real billing provider and move Pro entitlement server-side.
- [ ] Before growing: add Realtime and push notifications, then address the open issues in §16.

---

## 19. UI system, responsive rules and design skills (24 Nov 2026)

### 19.1 Design tokens

Defined in `tailwind.config.js`; never use raw hex in components.

| Token | Value | Role |
|---|---|---|
| `brand` 50–900 | teal, `500 = #16a394`, `600 = #0c8279` | primary actions, active nav, links |
| `ink` 50–900 | slate, `50 = #f4f7f9`, `900 = #0f2b3d` | page ground, text, sidebar |
| `flame` 50–900 | orange, `500 = #fb5d12` | warnings, duty nudges, gold CTAs |
| `bg-guild-hero` | radial teal→ink | the one bold surface (dashboard rate card, auth hero) |
| `shadow-card` / `shadow-lift` | flat 4px ambient / deep modal | cards sit quiet, modals lift |
| screens | `xs 420`, `sm 640`, `md 768`, `lg 1024`, `xl 1280` | mobile-first |

Semantic classes in `src/index.css`: `.card`, `.field`, `.label`, `.chip`, `.nav-link`,
`.table-head`, `.app-main` (bottom bar clearance), `.app-nav` (safe area), `.sheet-safe`.

Typography: **Plus Jakarta Sans** for UI, **Hind Siliguri** for Bengali (`html[lang='bn']`),
`tabular-nums` for every amount, sentence-case labels (all-caps is reserved for the 10 px guild
badge). Type floor: 14 px body, 12 px metadata, 16 px inputs on phones so iOS never zooms.
The Bangla UI sets `letter-spacing: normal` on every element — the wide tracking used for Latin
caps labels is unreadable in Bengali. Touch-target floor is 44 px at phone widths, enforced in the
`Button`/`IconButton`/`Stepper`/`Tabs` primitives.

### 19.2 The application shell

| | Phone (< 768 px) | Desktop (≥ 768 px) |
|---|---|---|
| Navigation | fixed bottom bar, 5 items (Dashboard, Meals, Arena, Hub, Settlement), safe-area padded | 288 px left sidebar, scrollable, guild card + nav + cycle + profile + Pro note |
| Context | compact header: mess name, emblem + points, language toggle, avatar | sidebar guild card + cycle/member summary |
| Content | `px-3.5 → sm:px-5`, bottom padding `--nav-h + --safe-b + 24px` | `max-w-6xl`, `md:px-8 lg:px-10`, `pb-10` |
| Height | `min-h-dvh` (not `100vh`) so mobile browser chrome cannot clip the nav | `h-dvh` sticky sidebar |

Toast/banner stack floats above the bottom bar via `bottom-[calc(var(--nav-h)+var(--safe-b)+.75rem)]`.
Modals are bottom sheets on phones (drag handle, sticky header/footer, body scroll lock,
`max-h-[92dvh]`) and centred dialogs from `sm` up.

### 19.3 Responsive patterns used

1. **Tables become cards.** `Dashboard` member breakdown and the `Settlement` statement render a
   `hidden xl:block print:block` table plus an `xl:hidden print:hidden` card list. The switch is at
   `xl` (1280 px) because the 7- and 11-column tables need ~720 px; below that the table would
   scroll sideways inside its card. Printing always uses the table.
2. **Steppers stack.** Meal steppers go `grid-cols-1 → xs:2 → xl:4`; form field pairs go
   `grid-cols-1 → sm:2`.
3. **Forms first on phones.** The auth screen puts the sign-in card above the marketing hero
   (`order-1 md:order-2`).
4. **Chat sizes in dvh.** `Hub → Board` is `h-[calc(100dvh-15rem)] lg:h-[70vh]`, so the composer is
   always reachable.
5. **Tap feedback everywhere.** Buttons and tabs use `active:scale-[0.985]`; hover styles are
   additive, never the only affordance.
6. **Reduced motion** is honoured globally (`prefers-reduced-motion` disables animation).

### 19.4 Design skills installed in-repo

Installed under `.agents/skills/` (agent-agnostic convention, read by `AGENTS.md`):

| Skill | Source | Notes |
|---|---|---|
| `ui-ux-pro-max` | github.com/nextlevelbuilder/ui-ux-pro-max-skill | Rules + CSV datasets + Python search script (`scripts/search.py ... --design-system`) |
| `frontend-design` | github.com/anthropics/skills (`skills/frontend-design`) | Aesthetic direction, typography, copy voice |
| `design-taste-frontend` | github.com/Leonxlnx/taste-skill (`skills/taste-skill`) | Anti-slop composition; its 37 MB `assets/` library is gitignored |

`AGENTS.md` is the short version: mobile-first, 44 px targets, type floor, token discipline,
EN+BN for every string.

### 19.5 Verified for this pass

- `npm run typecheck` — pass.
- `bun test` — 31 pass / 0 fail.
- `npm run build` — pass (same >500 kB vendor chunk warning from jsPDF).

**Checked in a real browser** (Chromium, demo backend so no sign-in is needed: run
`VITE_SUPABASE_URL= VITE_SUPABASE_PUBLISHABLE_KEY= npx vite --port 5274`): every route at 360 px
and 1280 px, plus 768 px for the shell. Measured in the page, not by eye:

- `document.scrollWidth <= innerWidth` on all five routes at 360 px — no sideways scrolling.
- Every `button`/`a` in `main` and the header is at least 44 px tall at 360 px (the audit found and
  fixed: `Button size="sm"` and `Tabs` were 36 px, `Stepper` ±36 px, meal-grid day arrows 38 px,
  poll option buttons 38 px, the Settlement back link 32 px and its print/PDF buttons 38 px).
- The `Tabs` strip fits without clipping at 360 px (icons are hidden below `sm` so long labels such
  as "Settlement" and "Settings" fit); it still scrolls if a future tab is added.
- Bangla at 360 px: same checks pass. Labels no longer carry Latin letter-spacing (see §19.1).

Fixed from the review: duplicated "Live draft" status on the Settlement header (the pill already
shows it), clipped 10 px stat labels on the dashboard stat cards (now wrap to two lines), clipped
`৳17,500.00` in the hero's three-up figures (12 px below `sm`), and the table/card switch moved from
`md` to `xl` so tablets stop scrolling a wide table inside a narrow card.

**Still not verified:** no Lighthouse or axe run, no screen-reader pass, and no check with a real
Supabase session (only the seeded demo workspace). Hover/focus states were not exercised with a
keyboard.

To review the UI without an account, start a second dev server with the Supabase variables emptied —
`getBackend()` in `src/lib/backend.ts` then falls back to the seeded demo workspace:

```bash
VITE_SUPABASE_URL= VITE_SUPABASE_PUBLISHABLE_KEY= npx vite --port 5274
```

---

## 20. Continuous integration (24 Nov 2026)

`.github/workflows/ci.yml` is the only workflow. It runs on every push to `main` and every pull
request, with a 10-minute timeout and `cancel-in-progress` per ref.

| Step | Command |
|---|---|
| Install | `bun install --frozen-lockfile` |
| Typecheck | `bun run typecheck` (`tsc --noEmit`) |
| Test | `bun test` |
| Build | `bun run build` (`tsc --noEmit && vite build`) |

Why Bun and not npm: the repo is locked with `bun.lock` and there is no `package-lock.json`, and the
test suite is Bun's runner. `oven-sh/setup-bun` is pinned to **1.4.0**, the version every command was
verified against locally. The job needs no secrets — the app builds into demo mode without
`VITE_SUPABASE_URL`, so CI never touches Supabase or Vercel.

Local dry run of the exact sequence (all four steps exit 0): install reported "no changes" from the
frozen lockfile, typecheck clean, 31 tests pass, build succeeds with the known jsPDF chunk warning.

**Verified on GitHub:** the first run (id `45336650549`, commit `d4207f9`, push to `main`) finished
**success in 19 s** — checkout, Bun install from the frozen lockfile, typecheck, 31 tests and the
build all passed on `ubuntu-latest`.

---

## 21. Live updates (24 Nov 2026)

Before this, two mates on two phones only saw each other's meals, votes, chat and chess moves after
a manual refresh. Now the workspace reloads itself.

**How it works**

1. `Backend.subscribe(onChange)` is part of the backend interface (`src/lib/backend.ts`). Demo mode
   returns a no-op because the seeded workspace lives in one browser with no server to broadcast
   from.
2. `createSupabaseBackend` opens one Realtime channel (`mess-mates-workspace`) and attaches
   `postgres_changes` with `event: '*'` for every table the workspace renders: `daily_meals`,
   `bazar_expenses`, `bazar_schedule`, `fixed_utilities`, `member_deposits`, `mess_members`,
   `mess_messages`, `polls`, `poll_votes`, `game_rooms`, `monthly_cycles`, `messes`, `profiles`.
   RLS still applies, so a member only hears about rows they may read. Calling `subscribe` again
   drops the previous channel first; the returned function removes it.
3. `AppProvider` subscribes once per signed-in user id and reloads through the existing `refresh()`
   after a **600 ms debounce**, so a burst of writes costs one fetch. The effect unsubscribes on
   sign-out and on unmount.

**Setup: run `supabase/migrations/005_realtime.sql`.** It adds those tables to the
`supabase_realtime` publication and sets `replica identity full`. The second part matters: a DELETE
whose old record only has the primary key cannot be RLS-checked, so Realtime silently drops it —
without it, collapsing a bazar entry or deleting a poll never reaches other phones. The script is
idempotent (it swallows `duplicate_object`), so it is safe to re-run.

**Known trade-offs**

- One reload per change burst, not a delta merge: simple and always consistent, but every change
  re-reads the whole workspace snapshot.
- `replica identity full` writes more WAL per update on the listed tables. Fine at mess scale.
- The offline outbox replays straight to the backend; the resulting row changes come back through
  the channel like any other write.

**Not verified:** no live two-account test was run (there is no Supabase session available to the
assistant), and `005_realtime.sql` has not been applied to the live project. To check it: apply the
migration, sign in on two devices, log a meal on one and watch the other's meal rate update within a
second or two without touching refresh.

---

## 22. Pro entitlement (24 Nov 2026)

The Pro tier used to be self-service: `upgradePro()` wrote `messes.is_pro_mess` and
`profiles.is_pro` straight from the browser, and any mess manager could call it. Even after deleting
that method the hole stayed open at the database level, because the row policies are column-blind:

- `messes_update` — `can_manage_mess(id)`: an admin could update every column of their mess,
  `is_pro_mess` included.
- `profiles_update` — `id = auth.uid()`: any user could set their own `is_pro`.

**What changed**

1. `upgradePro()` is removed from `Backend`, `createSupabaseBackend` and the demo backend. No code
   path in the app writes either flag.
2. `supabase/migrations/006_pro_entitlement.sql` adds a `before update` trigger on `messes` and
   `profiles` (`protect_pro_flag()`). It raises `42501` when the request's JWT role is
   `authenticated` or `anon` and either flag changes. The service role and the SQL editor are not
   client roles, so support can still grant it.
3. The upgrade modal no longer activates anything. It explains that activation is manual and opens a
   prefilled WhatsApp request (`pro.contact`, `pro.contactHint`, `pro.waMessage` in `src/lib/i18n.ts`).

**Granting Pro today** (Supabase → SQL editor):

```sql
update public.messes set is_pro_mess = true where id = '<mess uuid>';
update public.profiles set is_pro = true where id = '<user uuid>';  -- personal grant only
```

**Still missing:** a real billing provider (Stripe/bKash), a webhook that calls the grant, receipt
storage and subscription state with an expiry. Until then Pro is a manual switch and the price
shown in the modal is a placeholder, not a checkout.

**Not verified:** the trigger has not been run against the live database (it needs the migration
applied), and no attempt was made to call the API from outside the app to confirm the 42501. The
modal itself was opened in the demo build and renders in both languages.

---

## 23. What is deliberately still open (24 Nov 2026)

These came up in the audit and were left alone on purpose, with the reason. They need a decision or
a credential, not a code edit:

| # | Item | Why it is not a quick fix |
|---|---|---|
| 4 | Free 2-cycle archive cap | Trimming the fetched cycles breaks the carry-forward chain and changes settlements (§16.4). Needs an RLS rule plus a server-side carry aggregate, and a decision on what a downgraded mess keeps. |
| 5 | Removal is not a ban | Needs a `removed` membership state and a `join_mess` check — a schema change with a data-migration question (what happens to a removed mate who is still owed money). |
| 12 | No account deletion | Deleting a profile would orphan settled history that other members' balances depend on. Needs an agreed anonymise-vs-delete policy before any RPC. |
| 14 | No error reporting / analytics | Needs a provider account and a DSN (or an equivalent self-hosted collector) — a decision plus a secret, not code. |
| 8 | Remaining i18n gaps | PDF labels, toasts, ErrorBoundary copy, chess/dice instructions and WhatsApp templates are still hardcoded English. The Pro dialog was localised in this pass; the rest is a mechanical sweep best done in one commit. |

The Pro tier also still has no billing provider: activation is manual (§22).
