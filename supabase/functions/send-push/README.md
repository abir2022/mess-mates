# send-push

Web Push for Mess Mates. The browser subscribes with the VAPID public key; this
function sends with the private key. Reminders are de-duplicated per person,
per kind, per Dhaka day in `public.push_deliveries` (migration 010).

## One-time setup

1. Generate a VAPID pair:

   ```bash
   bunx web-push generate-vapid-keys
   ```

2. In Supabase → Edge Functions → Secrets, set:

   | Secret | Value |
   |---|---|
   | `VAPID_PUBLIC_KEY` | the public key |
   | `VAPID_PRIVATE_KEY` | the private key |
   | `VAPID_SUBJECT` | `mailto:your-address` |
   | `PUSH_TRIGGER_SECRET` | a long random string; the caller's bearer token |

   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied by Supabase.

3. Put the **public** key in the web app as `VITE_VAPID_PUBLIC_KEY` (Vercel →
   Environment Variables, and `.env` locally). Never put the private key in the
   web app.

4. Deploy:

   ```bash
   supabase functions deploy send-push
   ```

5. Add the same values as GitHub repository secrets so the schedule can call it:

   - `SUPABASE_URL` — e.g. `https://<project-ref>.supabase.co`
   - `PUSH_TRIGGER_SECRET` — the same random string

   `.github/workflows/push-reminders.yml` runs at 07:30 and 21:00 Dhaka. It
   exits cleanly when the secrets are absent, so a fork without push configured
   does not fail every day.

## Calling it

```bash
curl -X POST "$SUPABASE_URL/functions/v1/send-push" \
  -H "Authorization: Bearer $PUSH_TRIGGER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"mode":"reminders"}'
```

Custom notification:

```json
{
  "mode": "message",
  "title": "Dinner is ready",
  "body": "Khichuri at 9:30",
  "messId": "<uuid>",
  "userIds": ["<uuid>"]
}
```

`messId` and `userIds` are optional filters. Without them, every stored
subscription is targeted — use that only for a platform-wide announcement.

## What the reminder run sends

- **Meals** — active members of an open cycle who have no meal logged for today.
- **Approvals** — admins and managers when pending bazar exists for the cycle.
- **Duty** — the assigned member of an upcoming bazar duty scheduled tomorrow.

The function never sends a second reminder of the same kind to the same person
on the same Dhaka day, even if the workflow is retried.
