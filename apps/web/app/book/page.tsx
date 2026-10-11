import type { Metadata } from "next";
import Link from "next/link";
import { TuliaBookingCard } from "../../components/tulia-booking-card";
import { getCatalog } from "../../lib/catalog";

export const metadata: Metadata = { title: "Book a massage", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ treatment?: string; therapist?: string }> }) {
  const catalog = await getCatalog();
  const { treatment, therapist } = await searchParams;
  const selectedTherapist = catalog.therapists.find((item) => item.id === therapist);
  return <main className="tulia-site booking-only"><header className="tulia-header"><Link href="/" className="tulia-brand"><span className="brand-mark">≈</span><span><b>Tulia</b><small>Mombasa wellness</small></span></Link><Link className="dispatch-link" href="/">Back to home</Link></header><section className="booking-focus"><div><p className="coastal-label"><i /> Coastal care, carefully arranged</p><h1>{selectedTherapist ? `A session with ${selectedTherapist.displayName.split(" ")[0]}.` : "Make room for feeling better."}</h1><p>{selectedTherapist ? "Choose a ritual, a setting, and a time held especially for you." : "Choose a treatment, a place, and a time that stays yours."}</p></div><TuliaBookingCard {...catalog} initialTreatmentSlug={treatment} initialTherapistId={therapist} /></section></main>;
}
