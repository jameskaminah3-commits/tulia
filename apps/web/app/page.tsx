import Link from "next/link";
import { createClient, hasSupabaseConfig } from "../lib/supabase/server";

export const dynamic = "force-dynamic";

type Treatment = { id: string; slug: string; name: string; description: string; duration_min: number };
const previewTreatments: Treatment[] = [
  { id: "preview-relax", slug: "relaxation-massage", name: "Relaxation massage", description: "A restorative full-body session for a slower pace.", duration_min: 60 },
  { id: "preview-deep", slug: "deep-tissue", name: "Deep tissue", description: "Focused work for persistent tension and recovery.", duration_min: 75 },
  { id: "preview-couple", slug: "couples-session", name: "Couples session", description: "A shared studio experience, scheduled together.", duration_min: 60 },
];

export default async function HomePage() {
  const configured = hasSupabaseConfig();
  let treatments = previewTreatments;
  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("treatments")
      .select("id, slug, name, description, duration_min")
      .eq("is_active", true)
      .order("sort_order");
    treatments = (data ?? []) as Treatment[];
  }

  return <main>
    <header className="header"><Link href="/" className="brand">Tulia<span>Wellness</span></Link><Link href="/book" className="button secondary">Book a session</Link></header>
    <section className="hero"><p className="eyebrow">Mombasa · studio, home & hotel</p><h1>Massage that fits the coast.</h1><p className="lead">Thoughtful bodywork with vetted therapists, a genuine schedule, and a booking system that protects your time.</p><Link href="/book" className="button">Find an available time</Link></section>
    <section className="section"><p className="eyebrow">Treatments</p><h2>Care with a clear plan.</h2>{!configured && <p className="notice">Preview mode: connect Supabase to enable live availability and bookings.</p>}<div className="cards">{treatments.map((treatment) => <article className="card" key={treatment.id}><p className="duration">{treatment.duration_min} minutes</p><h3>{treatment.name}</h3><p>{treatment.description}</p><Link href={`/book?treatment=${treatment.slug}`}>Choose this treatment →</Link></article>)}</div></section>
  </main>;
}
