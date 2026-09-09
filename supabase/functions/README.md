# Edge Functions

Deploy with `supabase functions deploy <name> --no-verify-jwt` only for third-party webhooks. `panic-alert` requires the caller's JWT.

Set secrets outside the repository:

```text
APP_ORIGIN=https://app.your-domain.com
PAYMENT_WEBHOOK_SECRET=<long-random-value>
SUPABASE_URL=<provided-by-supabase>
SUPABASE_ANON_KEY=<provided-by-supabase>
SUPABASE_SERVICE_ROLE_KEY=<provided-by-supabase>
```

`payment-callback` deliberately accepts a normalized, authenticated provider payload. Add the chosen provider's exact signature verifier before pointing Pesapal, IntaSend, DPO, or Daraja at this endpoint; do not substitute a browser call for the provider callback.
