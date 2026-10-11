"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type SetupCounts = { treatments: number; therapists: number; zones: number };

function optionalPrice(value: string) {
  const parsed = Number(value);
  return value.trim() ? parsed : null;
}

export function AdminMarketplaceSetup() {
  const supabase = useMemo(createClient, []);
  const [counts, setCounts] = useState<SetupCounts>({ treatments: 0, therapists: 0, zones: 0 });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<"treatment" | "therapist" | "zone" | null>(null);
  const [treatment, setTreatment] = useState({ name: "", description: "", duration: "60", studio: "", home: "", hotel: "" });
  const [therapist, setTherapist] = useState({ profileId: "", displayName: "", homeZone: "", studio: true, home: false, hotel: false });
  const [zone, setZone] = useState({ id: "", name: "" });

  async function refreshCounts() {
    const [{ count: treatments }, { count: therapists }, { count: zones }] = await Promise.all([
      supabase.from("treatments").select("id", { count: "exact", head: true }),
      supabase.from("therapists").select("id", { count: "exact", head: true }),
      supabase.from("zones").select("id", { count: "exact", head: true }),
    ]);
    setCounts({ treatments: treatments ?? 0, therapists: therapists ?? 0, zones: zones ?? 0 });
  }

  useEffect(() => { void refreshCounts(); }, []);

  async function createTreatment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice("");
    const studioPrice = Number(treatment.studio);
    if (!Number.isInteger(studioPrice) || studioPrice <= 0) { setNotice("Add a whole-number studio price in KES before publishing a treatment."); return; }
    setBusy("treatment");
    const { error } = await supabase.rpc("admin_create_treatment", {
      p_name: treatment.name,
      p_description: treatment.description,
      p_duration_min: Number(treatment.duration),
      p_studio_price: studioPrice,
      p_home_price: optionalPrice(treatment.home),
      p_hotel_price: optionalPrice(treatment.hotel),
    });
    setBusy(null);
    if (error) { setNotice(error.message); return; }
    setTreatment({ name: "", description: "", duration: "60", studio: "", home: "", hotel: "" });
    setNotice("Treatment published to the live catalogue.");
    await refreshCounts();
  }

  async function onboardTherapist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice("");
    setBusy("therapist");
    const { error } = await supabase.rpc("admin_onboard_therapist", {
      p_profile_id: therapist.profileId.trim(),
      p_display_name: therapist.displayName,
      p_home_zone: therapist.homeZone.trim() || null,
      p_serves_studio: therapist.studio,
      p_serves_home: therapist.home,
      p_serves_hotel: therapist.hotel,
    });
    setBusy(null);
    if (error) { setNotice(error.message); return; }
    setTherapist({ profileId: "", displayName: "", homeZone: "", studio: true, home: false, hotel: false });
    setNotice("Therapist workspace created. Verify credentials and activate the public profile when ready.");
    await refreshCounts();
  }

  async function createZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(""); setBusy("zone");
    const { error } = await supabase.rpc("admin_create_zone", { p_id: zone.id.trim().toLowerCase(), p_name: zone.name });
    setBusy(null);
    if (error) { setNotice(error.message); return; }
    setZone({ id: "", name: "" }); setNotice("Service zone is ready for marketplace coverage."); await refreshCounts();
  }

  return <section className="admin-studio" aria-labelledby="admin-studio-title">
    <div className="admin-studio-heading"><div><p className="coastal-label">Admin studio</p><h2 id="admin-studio-title">Build the marketplace with real care.</h2><p>These controls create real database records. New therapists remain private until their credentials are reviewed and their profile is activated.</p></div><button type="button" onClick={() => void refreshCounts()}>Refresh overview</button></div>
    <div className="admin-stats"><article><b>{counts.treatments}</b><span>Live treatments</span></article><article><b>{counts.therapists}</b><span>Therapist records</span></article><article><b>{counts.zones}</b><span>Service zones</span></article></div>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <div className="admin-forms"><form onSubmit={createTreatment}><div className="admin-form-title"><p className="coastal-label">Catalogue</p><h3>Add a treatment</h3><span>Pricing is stored in KES. Studio pricing is required; mobile settings are optional.</span></div><label>Treatment name<input required maxLength={120} value={treatment.name} onChange={(event) => setTreatment({ ...treatment, name: event.target.value })} placeholder="e.g. Coastal Reset" /></label><label>Description<textarea required minLength={12} maxLength={600} value={treatment.description} onChange={(event) => setTreatment({ ...treatment, description: event.target.value })} placeholder="What this ritual is designed to help with." /></label><div className="admin-two"><label>Duration (minutes)<input required type="number" min="30" max="240" step="15" value={treatment.duration} onChange={(event) => setTreatment({ ...treatment, duration: event.target.value })} /></label><label>Studio price (KES)<input required inputMode="numeric" value={treatment.studio} onChange={(event) => setTreatment({ ...treatment, studio: event.target.value })} placeholder="5000" /></label></div><div className="admin-two"><label>Home price (optional)<input inputMode="numeric" value={treatment.home} onChange={(event) => setTreatment({ ...treatment, home: event.target.value })} placeholder="6500" /></label><label>Hotel price (optional)<input inputMode="numeric" value={treatment.hotel} onChange={(event) => setTreatment({ ...treatment, hotel: event.target.value })} placeholder="7000" /></label></div><button className="primary-action" disabled={busy !== null}>{busy === "treatment" ? "Publishing…" : "Publish treatment"} <span>→</span></button></form>
      <form onSubmit={onboardTherapist}><div className="admin-form-title"><p className="coastal-label">Collective</p><h3>Onboard a therapist</h3><span>Have the therapist sign in first, then copy their User UID from Supabase Authentication → Users.</span></div><label>Authenticated user ID<input required value={therapist.profileId} onChange={(event) => setTherapist({ ...therapist, profileId: event.target.value })} placeholder="UUID from Supabase Auth" /></label><label>Public display name<input required maxLength={120} value={therapist.displayName} onChange={(event) => setTherapist({ ...therapist, displayName: event.target.value })} placeholder="Name clients will see" /></label><label>Home zone (optional)<input value={therapist.homeZone} onChange={(event) => setTherapist({ ...therapist, homeZone: event.target.value })} placeholder="e.g. nyali" /></label><fieldset><legend>Where can they provide care?</legend><label><input type="checkbox" checked={therapist.studio} onChange={(event) => setTherapist({ ...therapist, studio: event.target.checked })} /> Studio</label><label><input type="checkbox" checked={therapist.home} onChange={(event) => setTherapist({ ...therapist, home: event.target.checked })} /> Home</label><label><input type="checkbox" checked={therapist.hotel} onChange={(event) => setTherapist({ ...therapist, hotel: event.target.checked })} /> Hotel</label></fieldset><button className="primary-action" disabled={busy !== null}>{busy === "therapist" ? "Creating workspace…" : "Create therapist workspace"} <span>→</span></button></form>
      <form className="admin-zone-form" onSubmit={createZone}><div className="admin-form-title"><p className="coastal-label">Coverage</p><h3>Add a service zone</h3><span>Set up your coverage before assigning mobile therapists.</span></div><div className="admin-two"><label>Zone ID<input required pattern="[a-z0-9_-]+" value={zone.id} onChange={(event) => setZone({ ...zone, id: event.target.value.toLowerCase() })} placeholder="e.g. nyali" /></label><label>Public zone name<input required value={zone.name} onChange={(event) => setZone({ ...zone, name: event.target.value })} placeholder="e.g. Nyali" /></label></div><button className="primary-action" disabled={busy !== null}>{busy === "zone" ? "Saving coverage…" : "Add service zone"} <span>→</span></button></form></div>
  </section>;
}
