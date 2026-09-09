# Mombasa Wellness Booking Platform

Production foundation for a Mombasa studio, home, and hotel massage service. The source of truth is Supabase Postgres/Auth/Storage; booking availability and conflicts are enforced in the database.

## What is production-ready here

- Versioned Supabase schema, RLS policies, private credential references, audit log, and client/therapist/ops roles.
- Database-level therapist and room exclusion constraints - confirmed bookings cannot double-book.
- Availability RPC that checks working windows, skills, credentials, delivery eligibility, room capacity, and both travel legs.
- Atomic booking RPC that calculates the server-side price, serializes same-day booking attempts, holds a slot for ten minutes, and returns controlled errors.
- Idempotent payment settlement RPC plus Edge Function entry points for payment callbacks and therapist panic alerts.
- Seed data, CI, dependency updates, and local production setup documentation.

## Deliberate boundary

`artifacts/wellness-booking` and `artifacts/api-server` are the original Vite/Express prototype. They remain useful for UX reference but are **not the production deployment path**. Do not connect them to live payment or client data. The next web sprint should replace their data layer with the Supabase RPCs and Auth, then deploy the client to Vercel.

## Local setup

1. Install [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) and Docker Desktop.
2. Copy `.env.example` to `.env`; never commit `.env`.
3. Run `supabase start`.
4. Run `supabase db reset` to apply migrations and fixtures.
5. Inspect schema quality with `supabase db lint --local`.
6. Start the legacy UI only if needed: `pnpm install`, then run the API and web scripts described below.

## Deploy to staging, then production

1. Create separate Supabase projects named `wellness-staging` and `wellness-prod` (Mumbai or Frankfurt only after latency testing from Mombasa).
2. Link **staging**: `supabase link --project-ref <staging-ref>`.
3. Review and apply migrations: `supabase db push`.
4. Set Edge Function secrets with `supabase secrets set --env-file .env.production` (never commit that file).
5. Deploy functions: `supabase functions deploy payment-callback --no-verify-jwt` and `supabase functions deploy panic-alert`.
6. Run real-JWT RLS, duplicate callback, concurrent booking, return-travel, and payment reconciliation tests in staging before repeating against production.

## Operational prerequisites before launch

- Choose and onboard Pesapal or IntaSend for M-Pesa, and DPO for cards. Add the provider's exact webhook signature verifier before enabling live callbacks.
- Configure WhatsApp Business templates, Africa's Talking fallback/number masking, on-call SMS, and a notification dispatcher.
- Enable Point-in-Time Recovery, configure backups, Sentry, provider alerts, consent/privacy notices, ODPC/DPIA work, and scheduled reconciliation/reminder jobs.
- Do not put a service-role key, payment secret, or client PII in the browser, logs, or repository.

## Legacy prototype preview

```powershell
pnpm install
pnpm --filter @workspace/api-server dev
pnpm --filter @workspace/wellness-booking dev
```

It serves only local prototype data. Production integrations belong under `supabase/`.
