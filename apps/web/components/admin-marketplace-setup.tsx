"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type SetupCounts = { treatments: number; therapists: number; zones: number };
type BusyAction = "treatment" | "zone" | "profile" | "credential" | "publish" | "availability" | null;

function optionalPrice(value: string) {
  const parsed = Number(value);
  return value.trim() ? parsed : null;
}

export function AdminMarketplaceSetup() {
  const supabase = useMemo(createClient, []);
  const [counts, setCounts] = useState<SetupCounts>({ treatments: 0, therapists: 0, zones: 0 });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [treatment, setTreatment] = useState({ name: "", description: "", duration: "60", studio: "", home: "", hotel: "" });
  const [zone, setZone] = useState({ id: "", name: "" });
  const [profile, setProfile] = useState({ profileId: "", displayName: "", bio: "", photoPath: "", gender: "prefer_not_to_say", homeZone: "", studio: true, home: false, hotel: false });
  const [credential, setCredential] = useState({ therapistId: "", kind: "tvet_cdacc", referenceNo: "", issuer: "", expiresOn: "" });
  const [availability, setAvailability] = useState({ therapistId: "", date: "", start: "09:00", end: "17:00", note: "" });

  async function refreshCounts() {
    const [{ count: treatments }, { count: therapists }, { count: zones }] = await Promise.all([
      supabase.from("treatments").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("therapists").select("id", { count: "exact", head: true }),
      supabase.from("zones").select("id", { count: "exact", head: true }).eq("is_serviceable", true),
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
      p_name: treatment.name, p_description: treatment.description, p_duration_min: Number(treatment.duration),
      p_studio_price: studioPrice, p_home_price: optionalPrice(treatment.home), p_hotel_price: optionalPrice(treatment.hotel),
    });
    setBusy(null);
    if (error) { setNotice(error.message); return; }
    setTreatment({ name: "", description: "", duration: "60", studio: "", home: "", hotel: "" });
    setNotice("Treatment published to the live catalogue."); await refreshCounts();
  }

  async function createZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(""); setBusy("zone");
    const { error } = await supabase.rpc("admin_create_zone", { p_id: zone.id.trim().toLowerCase(), p_name: zone.name });
    setBusy(null);
    if (error) { setNotice(error.message); return; }
    setZone({ id: "", name: "" }); setNotice("Service zone is ready for marketplace coverage."); await refreshCounts();
  }

  async function saveTherapistProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(""); setBusy("profile");
    const { error } = await supabase.rpc("admin_update_therapist_profile", {
      p_profile_id: profile.profileId.trim(), p_display_name: profile.displayName, p_bio: profile.bio,
      p_photo_path: profile.photoPath, p_gender: profile.gender, p_home_zone: profile.homeZone.trim() || null,
      p_serves_studio: profile.studio, p_serves_home: profile.home, p_serves_hotel: profile.hotel,
    });
    setBusy(null);
    if (error) { setNotice(error.message); return; }
    setNotice("Therapist profile saved privately. Verify credentials before publishing it."); await refreshCounts();
  }

  async function verifyCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(""); setBusy("credential");
    const { error } = await supabase.rpc("admin_verify_therapist_credential", {
      p_therapist_id: credential.therapistId.trim(), p_kind: credential.kind,
      p_reference_no: credential.referenceNo.trim(), p_issuer: credential.issuer.trim() || null,
      p_expires_on: credential.expiresOn || null,
    });
    setBusy(null);
    if (error) { setNotice(error.message); return; }
    setCredential({ therapistId: "", kind: "tvet_cdacc", referenceNo: "", issuer: "", expiresOn: "" });
    setNotice("Credential verified. Add all required credentials before publishing the profile.");
  }

  async function publishTherapist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(""); setBusy("publish");
    const { error } = await supabase.rpc("admin_publish_therapist", { p_therapist_id: profile.profileId.trim() });
    setBusy(null);
    if (error) { setNotice(error.message); return; }
    setNotice("Therapist is now live in the public collective and eligible for booking."); await refreshCounts();
  }

  async function addAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(""); setBusy("availability");
    const { error } = await supabase.rpc("admin_add_availability", {
      p_therapist_id: availability.therapistId.trim(), p_date: availability.date,
      p_start_time: availability.start, p_end_time: availability.end, p_note: availability.note.trim() || null,
    });
    setBusy(null);
    if (error) { setNotice(error.message); return; }
    setAvailability({ therapistId: "", date: "", start: "09:00", end: "17:00", note: "" });
    setNotice("Availability added in Africa/Nairobi time. Clients can now discover matching slots.");
  }

  return <section className="admin-studio" aria-labelledby="admin-studio-title">
    <div className="admin-studio-heading"><div><p className="coastal-label">Admin studio</p><h2 id="admin-studio-title">Build the marketplace with real care.</h2><p>These controls create real database records. A therapist stays private until their profile, credentials, and availability are ready.</p></div><button type="button" onClick={() => void refreshCounts()}>Refresh overview</button></div>
    <div className="admin-stats"><article><b>{counts.treatments}</b><span>Live treatments</span></article><article><b>{counts.therapists}</b><span>Therapist records</span></article><article><b>{counts.zones}</b><span>Service zones</span></article></div>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <div className="admin-forms">
      <form onSubmit={createTreatment}><div className="admin-form-title"><p className="coastal-label">Catalogue</p><h3>Add a treatment</h3><span>Pricing is stored in KES. Studio pricing is required; mobile settings are optional.</span></div><label>Treatment name<input required maxLength={120} value={treatment.name} onChange={(event) => setTreatment({ ...treatment, name: event.target.value })} placeholder="e.g. Coastal Reset" /></label><label>Description<textarea required minLength={12} maxLength={600} value={treatment.description} onChange={(event) => setTreatment({ ...treatment, description: event.target.value })} placeholder="What this ritual is designed to help with." /></label><div className="admin-two"><label>Duration (minutes)<input required type="number" min="30" max="240" step="15" value={treatment.duration} onChange={(event) => setTreatment({ ...treatment, duration: event.target.value })} /></label><label>Studio price (KES)<input required inputMode="numeric" value={treatment.studio} onChange={(event) => setTreatment({ ...treatment, studio: event.target.value })} placeholder="5000" /></label></div><div className="admin-two"><label>Home price (optional)<input inputMode="numeric" value={treatment.home} onChange={(event) => setTreatment({ ...treatment, home: event.target.value })} placeholder="6500" /></label><label>Hotel price (optional)<input inputMode="numeric" value={treatment.hotel} onChange={(event) => setTreatment({ ...treatment, hotel: event.target.value })} placeholder="7000" /></label></div><button className="primary-action" disabled={busy !== null}>{busy === "treatment" ? "Publishing…" : "Publish treatment"} <span>→</span></button></form>

      <form onSubmit={createZone}><div className="admin-form-title"><p className="coastal-label">Coverage</p><h3>Add a service zone</h3><span>Set up coverage before assigning mobile therapists.</span></div><div className="admin-two"><label>Zone ID<input required pattern="[a-z0-9_-]+" value={zone.id} onChange={(event) => setZone({ ...zone, id: event.target.value.toLowerCase() })} placeholder="e.g. nyali" /></label><label>Public zone name<input required value={zone.name} onChange={(event) => setZone({ ...zone, name: event.target.value })} placeholder="e.g. Nyali" /></label></div><button className="primary-action" disabled={busy !== null}>{busy === "zone" ? "Saving coverage…" : "Add service zone"} <span>→</span></button></form>

      <form onSubmit={saveTherapistProfile}><div className="admin-form-title"><p className="coastal-label">Profile</p><h3>Shape a therapist profile</h3><span>Save the public story, settings, and identity details privately before publishing.</span></div><label>Authenticated user ID<input required value={profile.profileId} onChange={(event) => setProfile({ ...profile, profileId: event.target.value })} placeholder="UUID from Supabase Auth" /></label><label>Public display name<input required maxLength={120} value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} placeholder="Name clients will see" /></label><label>Bio<textarea maxLength={600} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} placeholder="A short, client-ready introduction." /></label><div className="admin-two"><label>Gender<select value={profile.gender} onChange={(event) => setProfile({ ...profile, gender: event.target.value })}><option value="female">Female</option><option value="male">Male</option><option value="non_binary">Non-binary</option><option value="prefer_not_to_say">Prefer not to say</option></select></label><label>Home zone<input value={profile.homeZone} onChange={(event) => setProfile({ ...profile, homeZone: event.target.value })} placeholder="e.g. nyali" /></label></div><label>Photo URL (optional)<input type="url" value={profile.photoPath} onChange={(event) => setProfile({ ...profile, photoPath: event.target.value })} placeholder="https://…" /></label><fieldset><legend>Where can they provide care?</legend><label><input type="checkbox" checked={profile.studio} onChange={(event) => setProfile({ ...profile, studio: event.target.checked })} /> Studio</label><label><input type="checkbox" checked={profile.home} onChange={(event) => setProfile({ ...profile, home: event.target.checked })} /> Home</label><label><input type="checkbox" checked={profile.hotel} onChange={(event) => setProfile({ ...profile, hotel: event.target.checked })} /> Hotel</label></fieldset><button className="primary-action" disabled={busy !== null}>{busy === "profile" ? "Saving profile…" : "Save private profile"} <span>→</span></button></form>

      <form onSubmit={verifyCredential}><div className="admin-form-title"><p className="coastal-label">Safety</p><h3>Verify credentials</h3><span>Every published therapist needs TVETA, good conduct, and insurance records.</span></div><label>Therapist ID<input required value={credential.therapistId} onChange={(event) => setCredential({ ...credential, therapistId: event.target.value })} placeholder="Therapist UUID" /></label><div className="admin-two"><label>Credential<select value={credential.kind} onChange={(event) => setCredential({ ...credential, kind: event.target.value })}><option value="tvet_cdacc">TVETA / CDACC</option><option value="good_conduct">Good conduct</option><option value="insurance">Insurance</option><option value="knec">KNEC</option><option value="health">Health certificate</option></select></label><label>Reference number<input required value={credential.referenceNo} onChange={(event) => setCredential({ ...credential, referenceNo: event.target.value })} placeholder="Certificate reference" /></label></div><div className="admin-two"><label>Issuer<input value={credential.issuer} onChange={(event) => setCredential({ ...credential, issuer: event.target.value })} placeholder="Issuing body" /></label><label>Expires on<input type="date" value={credential.expiresOn} onChange={(event) => setCredential({ ...credential, expiresOn: event.target.value })} /></label></div><button className="primary-action" disabled={busy !== null}>{busy === "credential" ? "Verifying…" : "Verify credential"} <span>→</span></button></form>

      <form onSubmit={publishTherapist}><div className="admin-form-title"><p className="coastal-label">Publish</p><h3>Activate a verified profile</h3><span>Publishing is blocked until all required safety records are current.</span></div><label>Therapist ID<input required value={profile.profileId} onChange={(event) => setProfile({ ...profile, profileId: event.target.value })} placeholder="Therapist UUID" /></label><button className="primary-action" disabled={busy !== null}>{busy === "publish" ? "Publishing…" : "Publish to collective"} <span>→</span></button></form>

      <form onSubmit={addAvailability}><div className="admin-form-title"><p className="coastal-label">Operations</p><h3>Add availability</h3><span>Availability is stored in Africa/Nairobi time and immediately powers real booking slots.</span></div><label>Therapist ID<input required value={availability.therapistId} onChange={(event) => setAvailability({ ...availability, therapistId: event.target.value })} placeholder="Therapist UUID" /></label><label>Date<input required type="date" value={availability.date} onChange={(event) => setAvailability({ ...availability, date: event.target.value })} /></label><div className="admin-two"><label>Starts<input required type="time" value={availability.start} onChange={(event) => setAvailability({ ...availability, start: event.target.value })} /></label><label>Ends<input required type="time" value={availability.end} onChange={(event) => setAvailability({ ...availability, end: event.target.value })} /></label></div><label>Note (optional)<input value={availability.note} onChange={(event) => setAvailability({ ...availability, note: event.target.value })} placeholder="e.g. Studio shift" /></label><button className="primary-action" disabled={busy !== null}>{busy === "availability" ? "Adding…" : "Add availability"} <span>→</span></button></form>
    </div>
  </section>;
}
