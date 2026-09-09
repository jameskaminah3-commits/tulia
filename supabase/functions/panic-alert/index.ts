import { corsHeaders, optionsResponse } from "../_shared/cors.ts";
import { clientFromRequest } from "../_shared/supabase.ts";

type PanicInput = { bookingId: string; latitude?: number; longitude?: number; note?: string };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const client = clientFromRequest(request);
    const { data: { user } } = await client.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Authentication required." }), { status: 401, headers: corsHeaders });
    const input = await request.json() as PanicInput;
    if (!input.bookingId) return new Response(JSON.stringify({ error: "bookingId is required." }), { status: 400, headers: corsHeaders });

    const { error } = await client.from("incidents").insert({
      booking_id: input.bookingId,
      raised_by: user.id,
      kind: "panic",
      severity: "critical",
      description: input.note ?? "Panic alert triggered from therapist app.",
    });
    if (error) throw error;

    // SMS delivery is intentionally delegated to the notification dispatcher.
    // It avoids embedding provider credentials in the therapist client.
    return new Response(JSON.stringify({ accepted: true }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("panic-alert failed", error);
    return new Response(JSON.stringify({ error: "Panic alert could not be recorded." }), { status: 400, headers: corsHeaders });
  }
});
