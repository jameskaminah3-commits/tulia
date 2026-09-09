# Mombasa Wellness Booking

Tulia is a booking and operations workspace for a premium massage service serving homes, hotels, and a Nyali studio in Mombasa.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/wellness-booking/src/` — client booking flow, operations console, and therapist roster.
- `artifacts/api-server/src/routes/wellness.ts` — availability, booking, therapist, and operations endpoints.
- `lib/api-spec/openapi.yaml` — source of truth for the typed API contract.
- `lib/db/src/schema/wellness.ts` — source of truth for the booking domain schema.
- `artifacts/wellness-booking/src/index.css` — shared visual tokens and responsive theme.

## Architecture decisions

- Availability is computed on the server from therapist windows, active bookings, delivery-mode eligibility, gender preference, and a fixed Mombasa zone travel matrix.
- Booking creation rechecks the selected slot server-side so a stale client cannot create a double booking.
- Payment and messaging providers stay behind the booking contract for now; booking state starts at `pending_payment` and can be advanced from the operations console.
- Client, operations, and therapist surfaces share one responsive React artifact so the first release can be deployed and iterated as one product.

## Product

- Public booking flow for treatment, delivery mode, date, availability-aware time, and client details.
- Operations console with today's booking summary, status mix, live queue, therapist pulse, and status controls.
- Therapist roster with readiness status, ratings, specialties, and service zones.
- Seeded Mombasa treatments, therapists, availability windows, travel times, and example bookings for a useful first preview.

## User preferences

_No cross-project preferences saved._

## Gotchas

- Regenerate API hooks after changing `lib/api-spec/openapi.yaml` with `pnpm --filter @workspace/api-spec run codegen`.
- Run the API and web managed workflows for preview; application code uses the routed `/api` path, not service ports.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
