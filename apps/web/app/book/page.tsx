import type { Metadata } from "next";
import Link from "next/link";
import { TuliaBookingCard } from "../../components/tulia-booking-card";
import { getCatalog } from "../../lib/catalog";

export const metadata: Metadata = { title: "Book a massage", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ treatment?: string }> }) {
  const catalog = await getCatalog();
  const { treatment } = await searchParams;
  return <main className="tulia-site booking-only"><header className="tulia-header"><Link href="/" className="tulia-brand"><span className="brand-mark">≈</span><span><b>Tulia</b><small>Mombasa wellness</small></span></Link><Link className="dispatch-link" href="/">Back to home</Link></header><section className="booking-focus"><div><p className="coastal-label"><i /> Coastal care, carefully arranged</p><h1>Make room for feeling better.</h1><p>Choose a treatment, a place, and a time that stays yours.</p></div><TuliaBookingCard {...catalog} initialTreatmentSlug={treatment} /></section></main>;
}
