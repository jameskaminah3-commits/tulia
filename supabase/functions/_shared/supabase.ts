import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const url = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.");
}

export const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export function clientFromRequest(request: Request) {
  const auth = request.headers.get("Authorization");
  return createClient(url!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: auth ? { Authorization: auth } : {} },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
