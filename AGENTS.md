# Instructions for agents working in this repo

Mess Mates is a mobile-first PWA for shared-hostel mess accounting (React 18 + TypeScript +
Tailwind 3 + Supabase). Read `PROJECT.md` before changing behaviour: it is the handbook for the
product, data model, financial formulas, security model and deployment.

## Commands (run from this folder)

```bash
npm run typecheck   # tsc --noEmit
bun test            # 8 files, 67 tests
npm run build       # tsc + vite build
npm run dev         # 127.0.0.1:5273
```

Verify UI work with typecheck + build; tests only cover pure lib logic.

## Design skills installed here

Three design skills live in `.agents/skills/`. Read the relevant `SKILL.md` before any UI,
layout or styling work instead of improvising:

| Skill | Path | Use for |
|---|---|---|
| UI UX Pro Max | `.agents/skills/ui-ux-pro-max/SKILL.md` | UX rules, accessibility, touch targets, responsive patterns, palettes/type pairing. Has searchable data (`data/*.csv`) and `scripts/search.py` (needs Python). |
| Frontend Design (Anthropic) | `.agents/skills/frontend-design/SKILL.md` | Aesthetic direction, typography, anti-template judgement, copy voice. |
| Taste Skill | `.agents/skills/design-taste-frontend/SKILL.md` | Anti-slop page composition, real-browser checks, motion discipline. Its 37 MB `assets/` library is gitignored. |

## Non-negotiables for this app

- **Mobile first, then desktop.** Test the layout at 360 px wide as well as 1440 px. Nothing may
  scroll horizontally at 360 px.
- **Type floor:** body text is 14 px (`text-sm`) or larger; 12 px is the minimum for metadata.
  Bengali needs the extra leading already set in `src/index.css`.
- **Touch targets:** 44×44 px minimum on phones. The `Button`, `IconButton` and `Stepper`
  primitives already enforce this on mobile — use them instead of raw `<button>` for actions.
- **Safe areas:** the bottom bar uses `--nav-h`/`--safe-b` from `index.css`; add bottom padding
  through `.app-main`, never a hardcoded `pb-24`.
- **Wide tables:** desktop table plus a `md:hidden` card list for phones. Keep the table
  `print:block` so the settlement printout still works.
- **One system:** reuse the `brand` / `ink` / `flame` tokens and the `.card`, `.field`, `.label`,
  `.chip` classes. No new palette, no gradient washes for decoration, no icon-only control without
  an accessible label.
- **Money and i18n:** always format with `money()` from `src/lib/format.ts`; every new string needs
  an EN **and** BN entry in `src/lib/i18n.ts` (the test suite enforces parity of keys).
- Never commit `.env`, service-role keys or `client_secret_*.json`.

## Done means

`npm run typecheck` and `npm run build` pass. Update `PROJECT.md` when you add a feature, change
setup, or change the design system.
