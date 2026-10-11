import Link from "next/link";
import { TherapistDirectoryBrowser } from "../../components/therapist-directory-browser";
import { getCatalog } from "../../lib/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meet the Tulia collective" };

export default async function TherapistsPage() {
  const { therapists } = await getCatalog();
  return <main className="directory-page"><header className="access-header"><Link href="/" className="tulia-brand"><span className="brand-mark">≈</span><span><b>Tulia</b><small>Mombasa wellness</small></span></Link><Link href="/login">Sign in</Link></header><section className="directory-hero"><p className="coastal-label">The Tulia collective</p><h1>Find a practitioner who feels like a fit.</h1><p>Every public profile belongs to a vetted Tulia therapist, with verified service coverage and a client-ready booking path.</p><div className="directory-principles"><span>✓ Credentials checked</span><span>✦ Setting matched</span><span>◌ Client-ready profiles</span></div></section>{therapists.length ? <TherapistDirectoryBrowser therapists={therapists} /> : <section className="directory-grid"><div className="directory-empty"><p className="coastal-label">Profiles are being prepared</p><h2>The collective is opening soon.</h2><p>Only therapists with verified credentials and service coverage become public. That keeps the directory meaningful for clients and valuable for practitioners.</p><Link href="/login" className="primary-link">Therapist sign in →</Link></div></section>}</main>;
}
