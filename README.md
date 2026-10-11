# Tulia Wellness Marketplace

Tulia is a premium marketplace for vetted massage and bodywork in Mombasa. Clients can discover real practitioners and book studio, home, or hotel care; therapists have a private workspace; admins operate the catalogue and collective.

The production application is `apps/web`: a Next.js 15 application backed by Supabase Auth and Postgres. The `artifacts/` folders are retained only as historical prototype references—do not deploy them or connect them to client data.

## What is implemented

- Premium public marketplace, treatment discovery, public therapist directory, and deep links into a selected treatment booking flow.
- Passwordless email and phone authentication with client, therapist, ops, and admin roles.
- Database-enforced booking availability, travel buffers, room capacity, price calculation, and double-booking protection.
- Row-level security, private credential records, audit support, payment-callback settlement controls, and panic-alert function entry point.
- Admin Studio controls for adding service zones, publishing treatments and prices, and creating therapist workspaces after a therapist has authenticated.

## Hosted Supabase setup

From the repository root:

```powershell
pnpm dlx supabase@latest login
pnpm dlx supabase@latest link --project-ref YOUR_PROJECT_REF
pnpm dlx supabase@latest db push
```

Create the local app environment file:

```powershell
Copy-Item apps\web\.env.example apps\web\.env.local
notepad apps\web\.env.local
```

Add only the public project values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Never place a database password, Supabase secret key, service-role key, payment secret, or private credential in this file.

## Run locally

```powershell
pnpm --filter @mombasa-wellness/web run dev
```

Open the Local URL that Next prints, normally `http://localhost:3000`.

For email magic links, add that same local URL under **Supabase Dashboard → Authentication → URL Configuration**. Phone sign-in also needs an SMS provider configured in Supabase.

## First marketplace setup

The local seed creates a working demo marketplace with three vetted therapists, verified safety credentials, future availability windows, service zones, rooms, and the three signature treatments. Run `supabase db reset` locally to load it. The demo identities are `admin@tulia.example`, `amina.kimani@tulia.example`, `zawadi.mwangi@tulia.example`, `neema.otieno@tulia.example`, and `client@tulia.example`; the app still uses passwordless email/phone sign-in, so use Supabase local email capture or replace these identities with real authenticated users before production.

1. Create and sign in with an admin account using `/login`.
2. In Supabase SQL Editor, promote that authenticated user to admin once:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = 'AUTH_USER_UUID';
   ```

   Copy `AUTH_USER_UUID` from **Authentication → Users**.
3. Sign out and in again. Open `/dashboard` to access **Admin Studio**.
4. Add service zones, then treatments and real prices.
5. Ask each therapist to sign in once. In Admin Studio, save their private profile using their Supabase Auth User UID.
6. Verify TVETA/CDACC, good-conduct, and insurance records in Admin Studio.
7. Add availability in Africa/Nairobi time, then publish the profile. Public directory entries are intentionally limited to active, vetted therapists.

## Verification

```powershell
pnpm run typecheck
pnpm --filter @mombasa-wellness/web run build
```

Before applying a migration to production, preview it first:

```powershell
pnpm dlx supabase@latest db push --dry-run
```

## Required before taking live payments

The booking system securely holds a slot, but payment checkout must not be switched on until a real provider is chosen and configured. Before launch, complete the provider-specific checkout and webhook signature verification for M-Pesa/cards, deploy the payment callback function, configure production email/SMS or WhatsApp templates, enable monitoring and backups, and complete Kenyan privacy/consent obligations.
