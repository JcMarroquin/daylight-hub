# Hue on Render

The frontend uses the server's remote Hue endpoints when hosted and keeps the existing local Bridge connector for localhost development. The hosted connection uses Hue OAuth v2, verifies the signed-in Supabase account, stores credentials encrypted in Supabase, and refreshes access tokens when needed.

## Render Web Service

Create a Node Web Service from this repository, or deploy its `render.yaml` Blueprint. A Static Site cannot execute `server.mjs`. A new service normally gets a new URL; use that actual URL everywhere below and update Hue's registered callback accordingly. The existing Static Site stays online until you choose to remove it.

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check: `/health`
- Node version: 22
- Render Free plan is supported; no persistent disk is needed.

## Supabase storage setup

Open Supabase → SQL Editor, paste `supabase/migrations/202610090002_hue_connections.sql`, and run it. This creates a credentials table with row level security and no browser access. Only the backend's secret key can read and update the encrypted rows.

In Supabase project settings → API Keys, get a server-only secret key (a legacy service-role key also works). Add it to Render as `SUPABASE_SECRET_KEY`. Never prefix this variable with `VITE_`, put it in Git, or paste it into chat. This key has privileged database access and belongs only in the backend environment.

## Environment variables

Set these in Render, never in browser code or Git:

| Name | Value |
| --- | --- |
| `APP_URL` | The actual HTTPS Web Service URL, without a trailing slash |
| `VITE_SUPABASE_URL` | Your existing Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your existing browser-safe publishable key |
| `HUE_CLIENT_ID` | Client ID from Hue registration |
| `HUE_CLIENT_SECRET` | A replacement secret generated after the original was shared |
| `HUE_APP_ID` | `DayLight Hub`, exactly as registered |
| `HUE_OWNER_EMAIL` | The email you use to sign into Daylight |
| `HUE_ENCRYPTION_KEY` | A fresh random 64-character hexadecimal key |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret key or legacy service-role key |

Generate the encryption key in a local terminal with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep the encryption key stable across deploys; changing it makes existing encrypted tokens unreadable. Supabase preserves tokens across Render restarts and redeploys. Remove the old `HUE_STORE_PATH` variable; it is no longer used. If replacing the encryption key deliberately, delete the owner's row from `hue_connections` in the Supabase dashboard and connect Hue again.

Register the exact callback URL in Hue:

```text
https://YOUR-WEB-SERVICE.onrender.com/api/hue/callback
```

Add the new website URL to your Supabase Authentication site/redirect settings. Deploy, sign into Daylight, open Settings → Room light, and click **Connect Hue account**. Approve access in Hue. Daylight automatically selects the light when there is exactly one; otherwise choose it in Settings.

If Hue rejects authorization, check that the app has been approved, the callback matches exactly, and the App ID and credentials match the registered application. Do not post client secrets or tokens in logs or chat.
