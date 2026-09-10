"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type Role = "client" | "therapist" | "ops" | "admin";
type Profile = { full_name: string; role: Role };
type Item = { title: string; detail: string; status: string };

const roleCopy: Record<Role, { label: string; title: string; body: string }> = {
  client: { label: "Client space", title: "Your time, all in one place.", body: "Review your bookings and come back to the care that fits your week." },
  therapist: { label: "Practitioner studio", title: "Today’s care, clearly held.", body: "Your confirmed sessions appear here with only the details you need to deliver excellent care." },
  ops: { label: "Operations desk", title: "The coast, in good hands.", body: "See bookings and team activity from one secure operations view." },
  admin: { label: "Admin studio", title: "Build a calmer operation.", body: "Manage the marketplace, people, booking flow, and service standards from one secure workspace." },
};

export function RoleDashboard() {
  const supabase = useMemo(createClient, []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState("Loading your secure space…");

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { window.location.assign("/login"); return; }
      const { data: profileData, error } = await supabase.from("profiles").select("full_name, role").eq("id", auth.user.id).single();
      if (error || !profileData) { setMessage("Your account exists, but its Tulia profile is not ready yet. Ask an administrator to finish setup."); return; }
      const nextProfile = profileData as Profile;
      setProfile(nextProfile);
      if (nextProfile.role === "therapist") {
        const { data } = await supabase.from("therapist_booking_view").select("reference, status, service_start, treatment_name").order("service_start");
        setItems((data ?? []).map((row: { reference: string; status: string; service_start: string; treatment_name: string }) => ({ title: row.treatment_name, detail: `${new Intl.DateTimeFormat("en-KE", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Nairobi" }).format(new Date(row.service_start))} · ${row.reference}`, status: row.status.replaceAll("_", " ") })));
      } else if (nextProfile.role === "client") {
        const { data } = await supabase.from("bookings").select("reference, status, service_range, treatments(name)").order("created_at", { ascending: false }).limit(6);
        setItems((data ?? []).map((row: { reference: string; status: string; service_range: string; treatments: { name: string }[] | null }) => ({ title: row.treatments?.[0]?.name ?? "Tulia session", detail: row.reference, status: row.status.replaceAll("_", " ") })));
      } else {
        const [{ count: bookingCount }, { count: therapistCount }, { count: clientCount }] = await Promise.all([
          supabase.from("bookings").select("id", { count: "exact", head: true }),
          supabase.from("therapists").select("id", { count: "exact", head: true }),
          supabase.from("clients").select("id", { count: "exact", head: true }),
        ]);
        setItems([{ title: "Bookings", detail: `${bookingCount ?? 0} in the system`, status: "live" }, { title: "Therapists", detail: `${therapistCount ?? 0} on the platform`, status: "collective" }, { title: "Clients", detail: `${clientCount ?? 0} client records`, status: "community" }]);
      }
      setMessage("");
    }
    void load();
  }, [supabase]);

  async function signOut() { await supabase.auth.signOut(); window.location.assign("/"); }
  if (!profile) return <section className="dashboard-shell"><p className="dashboard-message">{message}</p></section>;
  const copy = roleCopy[profile.role];
  return <main className="dashboard-shell"><header className="dashboard-header"><Link href="/" className="tulia-brand"><span className="brand-mark">≈</span><span><b>Tulia</b><small>Mombasa wellness</small></span></Link><button type="button" onClick={signOut}>Sign out</button></header><section className="dashboard-hero"><p className="coastal-label">{copy.label}</p><h1>{copy.title}</h1><p>Welcome back, {profile.full_name.split(" ")[0]}. {copy.body}</p></section><section className="dashboard-content"><div className="dashboard-summary"><span>{profile.role === "client" ? "01" : profile.role === "therapist" ? "02" : "03"}</span><div><p>Signed in as</p><b>{copy.label}</b></div></div><div className="dashboard-list"><div className="dashboard-list-header"><div><p className="coastal-label">Your overview</p><h2>{items.length ? "What needs your attention" : "Your space is ready"}</h2></div>{profile.role === "client" && <Link href="/book" className="primary-link">Book a session →</Link>}</div>{items.length ? items.map((item) => <article key={`${item.title}-${item.detail}`}><div><b>{item.title}</b><p>{item.detail}</p></div><span>{item.status}</span></article>) : <div className="dashboard-empty"><b>Nothing urgent here.</b><p>{profile.role === "therapist" ? "Confirmed sessions for the next 24 hours will appear here." : "Your next Tulia booking will appear here."}</p></div>}</div></section></main>;
}
