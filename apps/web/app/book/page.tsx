import type { Metadata } from "next";
import { BookingForm } from "../../components/booking-form";
import { createClient } from "../../lib/supabase/server";

export const metadata: Metadata = { title: "Book a massage", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const supabase = await createClient();
  const [{ data: treatments }, { data: zones }] = await Promise.all([
    supabase.from("treatments").select("id, slug, name, duration_min").eq("is_active", true).order("sort_order"),
    supabase.from("zones").select("id, name").eq("is_serviceable", true).order("name"),
  ]);
  return <main className="booking-page"><div className="booking-intro"><p className="eyebrow">Secure booking</p><h1>Find a time that works.</h1><p>Availability considers therapist skills, travel, working time and studio rooms before offering a session.</p></div><BookingForm treatments={treatments ?? []} zones={zones ?? []} /></main>;
}
