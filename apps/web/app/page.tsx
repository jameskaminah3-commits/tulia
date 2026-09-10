import Link from "next/link";
import { TuliaBookingCard } from "../components/tulia-booking-card";
import { getCatalog } from "../lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await getCatalog();
  return <main className="tulia-site">
    <header className="tulia-header"><Link href="/" className="tulia-brand"><span className="brand-mark">≈</span><span><b>Tulia</b><small>Mombasa wellness</small></span></Link><div><span className="open-daily">Mombasa · open daily</span><a href="tel:+254700000000">Call Tulia</a><a className="dispatch-link" href="/ops">Dispatch login</a></div></header>
    <section className="tulia-hero">
      <div className="hero-copy"><p className="coastal-label"><i /> Coastal care, carefully arranged</p><h1>Make room<br />for <em>feeling</em><br />better.</h1><p>Thoughtful massage and bodywork, brought to the pace of the coast. Choose your treatment, your place, and a time that stays yours.</p><div className="trust-row"><span>⌁ Trusted local therapists</span><span>☀ Studio or doorstep</span></div><div className="hero-tiles"><div><b>07</b><small>years of care across the coast</small></div><div className="coast-tile"><i /><i /><small>Tulia / 001</small></div></div></div>
      <TuliaBookingCard {...catalog} />
    </section>
    <section className="promise-row"><article><i>✦</i><div><b>The right kind of quiet</b><p>Skilled hands, unrushed sessions, and space to come back to yourself.</p></div></article><article><i>⌖</i><div><b>Where you feel at ease</b><p>Nyali studio, your home, or a hotel room along the coast.</p></div></article><article><i>✓</i><div><b>A reliable rhythm</b><p>We confirm every booking so your time stays protected.</p></div></article></section>
    <section className="tulia-story"><div><p className="coastal-label">A softer kind of local</p><h2>Good care should fit into real life.</h2></div><p>Whether you have just stepped off a flight, finished a long week, or simply want your shoulders to drop, Tulia meets you with an excellent therapist and a plan that makes sense.</p><div className="care-steps"><article><small>01 / Choose</small><b>A treatment made for today.</b></article><article><small>02 / Place</small><b>Your space or ours.</b></article><article><small>03 / Arrive</small><b>A little more like yourself.</b></article></div></section>
    <footer className="tulia-footer"><Link href="/" className="tulia-brand"><span className="brand-mark">≈</span><b>Tulia</b></Link><span>Made for slower moments in Mombasa.</span><span>© Tulia wellness</span></footer>
  </main>;
}
