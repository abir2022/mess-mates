Now implement Phase 3: **Social Mini-Games, Mess-vs-Mess Guild Challenges, and Monetization Architecture** for **Mess Calculator**.

### 1. Lightweight Turn-Based Mini-Games (Zero Heavy WebSocket Load)
Build two fast, addictive, client-side + turn-based database games inside the `Arena & Polls` tab so roommates or rival messes can play without hitting Supabase's 200-connection limit:
- **Game 1: Mess Chess** (using `chess.js` logic for legal moves, storing FEN board state in a `game_rooms` table).
- **Game 2: Quick Ludo / Dice Duel** (2–4 players, asynchronous or pass-and-play mode).
- Winning a game awards `+25 Guild Points` to the player's Mess and `+10 XP` to the player.

### 2. Mess-vs-Mess Guild Leaderboard & Customization
- Create a public **Top Mess Leaderboard** ranking messes by `guild_points` (earned via on-time bazar completion, zero payment delays, and mini-game wins).
- Allow messes to customize their **Mess Guild Banner**, emblem, and animated avatar frames (stored as lightweight JSON/SVG presets).

### 3. Policy-Compliant Ad & Subscription Hooks
Create a centralized `MonetizationProvider` wrapper component:
- **Ad Slot Placeholders:**
  - `<BannerAdSlot />` at the bottom of the Dashboard and Arena screens (designed to hold Google AdSense on Web/PWA and Google AdMob Banner when wrapped for Android).
  - `<RewardedAdModal actionLabel="..." onRewardEarned={...} />`: Triggered ONLY when a free user *voluntarily chooses* to unlock:
    1. Creating a custom Mess-vs-Mess Challenge Room
    2. Unlocking a premium Animated Avatar frame for 24 hours
    3. Generating a high-res branded Month-End PDF Report
    *(Simulate a 5-second countdown preview on Web/PWA so it is ready to wire into AdMob Rewarded Video SDK later without violating Google Play's forced-interstitial policies).*
- **Mess Pro Subscription Gate (`is_pro_mess`):**
  - Build a clean **"Upgrade Mess to Pro"** modal showing the benefits: Ad-Free experience for ALL members of the mess, Custom Guild Banner upload, Unlimited historical monthly archives, and Automated Payment Delay Reminders.