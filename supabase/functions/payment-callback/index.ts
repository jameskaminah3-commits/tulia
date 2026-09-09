import { corsHeaders, optionsResponse } from "../_shared/cors.ts";
import { admin } from "../_shared/supabase.ts";

type Callback = {
  provider: "pesapal" | "intasend" | "dpo" | "daraja";
  providerRef: string;
  bookingId: string;
  status: "pending" | "succeeded" | "failed" | "refunded" | "timed_out";
  method: "mpesa" | "card";
  amountKes: number;
  receipt?: string;
};

const webhookSecret = Deno.env.get("PAYMENT_WEBHOOK_SECRET");

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized callback." }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!webhookSecret || request.headers.get("x-payment-webhook-secret") !== webhookSecret) {
    return unauthorized();
  }

  try {
    const payload = await request.json() as Callback;
    if (!payload.provider || !payload.providerRef || !payload.bookingId || !payload.method || !Number.isInteger(payload.amountKes)) {
      return new Response(JSON.stringify({ error: "Invalid callback payload." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await admin.rpc("process_payment_callback", {
      p_provider: payload.provider,
      p_provider_ref: payload.providerRef,
      p_booking_id: payload.bookingId,
      p_status: payload.status,
      p_method: payload.method,
      p_amount_kes: payload.amountKes,
      p_receipt: payload.receipt ?? null,
      p_raw_callback: payload,
    });
    if (error) throw error;
    return new Response(JSON.stringify({ outcome: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("payment-callback failed", error);
    return new Response(JSON.stringify({ error: "Callback could not be processed." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
