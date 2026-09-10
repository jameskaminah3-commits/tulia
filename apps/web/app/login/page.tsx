import Link from "next/link";
import { LoginPanel } from "../../components/login-panel";

export const metadata = { title: "Sign in to Tulia", robots: { index: false, follow: false } };

export default function LoginPage() {
  return <main className="access-page"><header className="access-header"><Link href="/" className="tulia-brand"><span className="brand-mark">≈</span><span><b>Tulia</b><small>Mombasa wellness</small></span></Link><Link href="/">Back to home</Link></header><section className="access-content"><div className="access-story"><p className="coastal-label">One door, three spaces</p><h1>Made for every side of care.</h1><p>Clients book with confidence. Therapists build a practice clients can see. Admins keep the entire experience moving beautifully.</p><div><span>Client</span><span>Therapist</span><span>Admin</span></div></div><LoginPanel /></section></main>;
}
