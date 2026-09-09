import type { Metadata } from "next";
import Link from "next/link";
import { BookingForm } from "../../components/booking-form";
import { createClient, hasSupabaseConfig } from "../../lib/supabase/server";

export const metadata: Metadata = { title: "Book a massage", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  if (!hasSupabaseConfig()) {
    return <main className="booking-page"><div className="booking-intro"><p className="eyebrow">Booking setup</p><h1>Connect the live schedule.</h1><p>This local preview is ready for Supabase. Add the Project URL and publishable key to <code>apps/web/.env.local</code>, then restart the dev server.</p><Link href="/" className="button secondary">Back to treatments</Link></div><section className="booking-form"><p className="eyebrow">Required before bookings</p><h2>Supabase is not connected</h2><p>Live availability, phone verification, payment holds, and database-backed booking are intentionally unavailable until the project credentials are configured.</p></section></main>;
  }
  const supabase = await createClient();
  const [{ data: treatments }, { data: zones }] = await Promise.all([
    supabase.from("treatments").select("id, slug, name, duration_min").eq("is_active", true).order("sort_order"),
    supabase.from("zones").select("id, name").eq("is_serviceable", true).order("name"),
  ]);
  return <main className="booking-page"><div className="booking-intro"><p className="eyebrow">Secure booking</p><h1>Find a time that works.</h1><p>Availability considers therapist skills, travel, working time and studio rooms before offering a session.</p></div><BookingForm treatments={treatments ?? []} zones={zones ?? []} /></main>;
}
