# Deploy Daylight

For hosted Hue controls, use the Render Web Service setup in [HUE-DEPLOYMENT.md](HUE-DEPLOYMENT.md). The static-site option below serves the dashboard without the remote Hue backend.

Import this GitHub repository into Vercel or Netlify. Choose the Vite preset, use `npm run build` as the build command, and `dist` as the output directory.

Set these environment variables in the hosting project before building:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Use only the Supabase publishable key in browser configuration. Never use a service-role or secret key. Configure the production site URL and allowed authentication redirect URLs in Supabase Authentication settings. Browser environment variables are embedded during the build, so changing them requires a new deployment.

Supabase provides authenticated storage for the cloud-backed features. Browser-local features remain specific to each device; deploying the frontend does not automatically synchronize every local setting.

## Local development

Use Node.js 22 or newer. Run `npm ci`, then `npm run dev`. Open the address printed by Vite. Copy `.env.example` to `.env.local` and supply your Supabase URL and publishable key. Database migrations live in `supabase/migrations`.

Run `npm test` and `npm run build` to validate the app.

## Work schedule sync

Run [`supabase/migrations/202610100001_work_schedule.sql`](supabase/migrations/202610100001_work_schedule.sql) once in the Supabase SQL Editor, then reload Daylight on each device. The first signed-in device imports its saved local shifts if the cloud schedule is empty. Later edits and removals save to the account and refresh on other signed-in devices. The Work page shows the current sync status.

## Hue and alarms

The Hue gateway in `vite.config.ts` runs only with the local development server on your home network. Pairing credentials are stored in `.hue.local.json`, which is excluded from Git. Static hosting does not include this gateway and cannot directly reach your home Bridge. Remote Hue controls require a separate local gateway or a remote integration; this is not implemented yet.

In-app alarms need an awake browser and operating system to ring reliably.

## Habit and daily-check sync

Run [supabase/migrations/202610180001_habit_sync.sql](supabase/migrations/202610180001_habit_sync.sql) in the Supabase SQL Editor after the initial hub migration. This adds account-private `habits` and `habit_checks` tables, update timestamps, and Realtime publication entries. The migration can be rerun safely.

Deploy the frontend containing the habit-sync code, then reload the browser where you created your habits first. Sign in to the same account on the other device. Existing per-account local habits and old daily checkmarks are imported automatically when absent from the cloud; existing cloud versions win over unedited browser caches. Explicit local edits stay queued offline and retry after reconnect or reload. Pause, archive, restore, schedule edits, and checked/unchecked values sync per record, without replacing the entire collection. Changes refresh through Realtime, on focus/reconnect, and every 30 seconds while the page is visible.

The Habits page displays the sync state and names the migration if its tables are missing. Full daily-card snapshots and manually placed Planner sessions remain browser-local; habit definitions, automatic scheduling rules, and daily check states are cloud-backed. Existing habits saved under the local-preview workspace remain local; only the signed-in account's cache is uploaded.
