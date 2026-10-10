# Hue on Render

The frontend now uses the server's remote Hue endpoints when hosted and keeps the existing local Bridge connector for localhost development. The hosted connection uses Hue OAuth v2, verifies the signed-in Supabase account, stores credentials encrypted on disk, and refreshes access tokens when needed. Live OAuth approval still needs to be verified after deployment.

## Render Web Service

Create a Node Web Service from this repository, or deploy its `render.yaml` Blueprint. A Static Site cannot execute `server.mjs`. A new service normally gets a new URL; use that actual URL everywhere below and update Hue's registered callback accordingly. The existing Static Site stays online until you choose to remove it.

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check: `/health`
- Node version: 22
- Persistent disk: mount at `/var/data` (requires a paid Render service).

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
| `HUE_STORE_PATH` | `/var/data/hue-connections.json` |

Generate the encryption key in a local terminal with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep this key stable across deploys; changing it makes existing encrypted tokens unreadable. The persistent disk preserves the token store across restarts. This file-backed implementation supports a single server instance.

Register the exact callback URL in Hue:

```text
https://YOUR-WEB-SERVICE.onrender.com/api/hue/callback
```

Add the new website URL to your Supabase Authentication site/redirect settings. Deploy, sign into Daylight, open Settings → Room light, and click **Connect Hue account**. Approve access in Hue. Daylight automatically selects the light when there is exactly one; otherwise choose it in Settings.

If Hue rejects authorization, check that the app has been approved, the callback matches exactly, and the App ID and credentials match the registered application. Do not post client secrets or tokens in logs or chat.
