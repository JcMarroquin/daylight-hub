# Deploy Daylight

Import this GitHub repository into Vercel or Netlify. Choose the Vite preset, use `npm run build` as the build command, and `dist` as the output directory.

Set these environment variables in the hosting project before building:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Use only the Supabase publishable key in browser configuration. Never use a service-role or secret key. Configure the production site URL and allowed authentication redirect URLs in Supabase Authentication settings. Browser environment variables are embedded during the build, so changing them requires a new deployment.

Supabase provides authenticated storage for the cloud-backed features. Browser-local features remain specific to each device; deploying the frontend does not automatically synchronize every local setting.

## Local development

Use Node.js 22 or newer. Run `npm ci`, then `npm run dev`. Open the address printed by Vite. Copy `.env.example` to `.env.local` and supply your Supabase URL and publishable key. Database migrations live in `supabase/migrations`.

Run `npm test` and `npm run build` to validate the app.

## Hue and alarms

The Hue gateway in `vite.config.ts` runs only with the local development server on your home network. Pairing credentials are stored in `.hue.local.json`, which is excluded from Git. Static hosting does not include this gateway and cannot directly reach your home Bridge. Remote Hue controls require a separate local gateway or a remote integration; this is not implemented yet.

In-app alarms need an awake browser and operating system to ring reliably.
