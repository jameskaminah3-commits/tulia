# Mombasa Wellness Booking

A Vite/React client and Express/PostgreSQL booking prototype for Mombasa studio, home, and hotel treatments.

## Local run

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `OPS_API_KEY`.
2. Run `pnpm install`.
3. Start the API with `pnpm --filter @workspace/api-server dev`.
4. In a second terminal, start the web app with `pnpm --filter @workspace/wellness-booking dev`.
5. Open `http://localhost:5173`; the operations console at `/ops` asks for `OPS_API_KEY` and retains it only for the browser session.

## Release note

This repository is still a prototype. The engineering brief calls for a Supabase/Next.js production architecture with RLS, database exclusion constraints, payment webhooks, and scheduled jobs. Do not launch with real client data until those controls are implemented and reviewed.
