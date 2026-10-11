import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicTherapist } from "../../../lib/catalog";

export const dynamic = "force-dynamic";

export default async function TherapistProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const therapist = await getPublicTherapist(id);
  if (!therapist) notFound();
  const settings = [therapist.servesStudio && "Nyali studio", therapist.servesHome && "Your home", therapist.servesHotel && "Hotel visits"].filter(Boolean);
  const picture = therapist.photoPath?.startsWith("https://") ? therapist.photoPath : null;
  return <main className="profile-page">
    <header className="access-header"><Link href="/" className="tulia-brand"><span className="brand-mark">≈</span><span><b>Tulia</b><small>Mombasa wellness</small></span></Link><Link href="/therapists">Back to collective</Link></header>
    <section className="profile-hero">
      <div className={`profile-portrait portrait-${therapist.displayName.length % 3}`}>
        {picture ? <img src={picture} alt={`${therapist.displayName}, Tulia therapist`} /> : <span>{therapist.displayName.split(" ").map((part: string) => part[0]).slice(0, 2).join("")}</span>}
        <b>Verified Tulia therapist</b>
      </div>
      <div className="profile-copy"><p className="coastal-label">The Tulia collective · {therapist.homeZone ? `Based in ${therapist.homeZone}` : "Mombasa"}</p><h1>{therapist.displayName}</h1><p>{therapist.bio ?? "A vetted Tulia practitioner, ready to create a more restorative day."}</p><div className="profile-settings">{settings.map((setting) => <span key={setting}>{setting}</span>)}</div><Link className="primary-link" href={`/book?therapist=${encodeURIComponent(therapist.id)}`}>Find a time with {therapist.displayName.split(" ")[0]} <span>→</span></Link></div>
    </section>
    <section className="profile-note"><p className="coastal-label">A considered way to book</p><h2>Choose the ritual, then make it yours.</h2><p>Tulia keeps the details simple: transparent pricing, a setting that suits your day, and a time rechecked before it is held.</p><Link href={`/book?therapist=${encodeURIComponent(therapist.id)}`} className="text-link">Explore this therapist&apos;s availability <span>→</span></Link></section>
  </main>;
}
