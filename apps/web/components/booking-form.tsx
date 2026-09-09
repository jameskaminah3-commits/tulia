"use client";

import { useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type Treatment = { id: string; slug: string; name: string; duration_min: number };
type Zone = { id: string; name: string };
type Slot = { start_at: string; end_at: string; therapist_id: string; room_id: string | null };
type Mode = "studio" | "home" | "hotel";

const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });

function message(error: unknown) {
  return error instanceof Error ? error.message : "We could not complete that request.";
}

export function BookingForm({ treatments, zones }: { treatments: Treatment[]; zones: Zone[] }) {
  const supabase = useMemo(createClient, []);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [treatmentId, setTreatmentId] = useState(treatments[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("studio");
  const [zone, setZone] = useState(zones.find((item) => item.id === "nyali")?.id ?? zones[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [address, setAddress] = useState("");
  const [hotel, setHotel] = useState("");
  const [hotelRoom, setHotelRoom] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");

  async function sendOtp() {
    setBusy(true); setStatus("");
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    setStatus(error ? message(error) : "A one-time code was sent to your phone.");
  }

  async function verifyOtp() {
    setBusy(true); setStatus("");
    const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    if (!error && data.user) {
      const { error: profileError } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", data.user.id);
      setAuthenticated(!profileError);
      setStatus(profileError ? message(profileError) : "Phone verified. You can now see bookable times.");
    } else setStatus(message(error));
    setBusy(false);
  }

  async function findSlots() {
    if (!treatmentId || (mode !== "studio" && !zone)) return;
    setBusy(true); setStatus(""); setSelectedSlot(null);
    const { data, error } = await supabase.rpc("available_slots", {
      p_treatment_id: treatmentId, p_date: date, p_mode: mode,
      p_zone: mode === "studio" ? null : zone, p_gender: null,
    });
    setBusy(false);
    if (error) { setStatus(message(error)); return; }
    setSlots((data ?? []) as Slot[]);
    setStatus(data?.length ? "Select a time. Availability is rechecked when you book." : "No genuine openings for those details. Try another date or location.");
  }

  async function createBooking() {
    if (!selectedSlot) return;
    if (mode === "home" && !address.trim()) { setStatus("Enter an address or landmark for a home visit."); return; }
    if (mode === "hotel" && !hotel.trim()) { setStatus("Enter the hotel name."); return; }
    setBusy(true); setStatus("");
    const { data, error } = await supabase.rpc("create_booking", {
      p_treatment_id: treatmentId, p_therapist_id: selectedSlot.therapist_id, p_start: selectedSlot.start_at,
      p_mode: mode, p_zone: mode === "studio" ? null : zone, p_room_id: selectedSlot.room_id,
      p_address: mode === "home" ? address.trim() : null, p_address_notes: null,
      p_hotel: mode === "hotel" ? hotel.trim() : null, p_hotel_room_no: mode === "hotel" ? hotelRoom.trim() || null : null,
    });
    setBusy(false);
    if (error) { setStatus(error.message.includes("SLOT_TAKEN") ? "That time was just taken. Please select another." : message(error)); return; }
    setReference((data as { reference?: string } | null)?.reference ?? "");
    setStatus("Your session is held for 10 minutes while payment is started.");
  }

  if (reference) return <section className="booking-form"><p className="eyebrow">Time held</p><h2>Booking {reference}</h2><p className="lead">Your session is held for ten minutes. Payment launch is enabled only after the selected provider is configured and verified in staging.</p><p className="notice">Never send payment by a link or number outside the official checkout.</p></section>;

  return <form className="booking-form" onSubmit={(event) => event.preventDefault()}>
    <p className="eyebrow">1. Verify your phone</p>
    <div className="field"><label htmlFor="name">Full name</label><input id="name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" minLength={2} required disabled={authenticated} /></div>
    <div className="field-row"><div className="field"><label htmlFor="phone">Mobile number</label><input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+2547..." autoComplete="tel" required disabled={authenticated} /></div><div className="field"><label>&nbsp;</label><button className="button" type="button" disabled={busy || authenticated || !fullName.trim() || !phone.trim()} onClick={sendOtp}>Send code</button></div></div>
    {!authenticated && <div className="field-row"><div className="field"><label htmlFor="otp">One-time code</label><input id="otp" inputMode="numeric" value={otp} onChange={(event) => setOtp(event.target.value)} /></div><div className="field"><label>&nbsp;</label><button className="button secondary" type="button" disabled={busy || !otp.trim()} onClick={verifyOtp}>Verify phone</button></div></div>}
    {authenticated && <><p className="eyebrow">2. Choose a session</p><div className="field"><label htmlFor="treatment">Treatment</label><select id="treatment" value={treatmentId} onChange={(event) => setTreatmentId(event.target.value)}>{treatments.map((treatment) => <option key={treatment.id} value={treatment.id}>{treatment.name} · {treatment.duration_min} min</option>)}</select></div><div className="mode-group">{(["studio", "home", "hotel"] as Mode[]).map((value) => <button className={`mode ${mode === value ? "selected" : ""}`} type="button" key={value} onClick={() => setMode(value)}>{value}</button>)}</div>{mode !== "studio" && <div className="field"><label htmlFor="zone">Area</label><select id="zone" value={zone} onChange={(event) => setZone(event.target.value)}>{zones.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}<div className="field"><label htmlFor="date">Date</label><input id="date" type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} /></div>{mode === "home" && <div className="field"><label htmlFor="address">Address or landmark</label><input id="address" value={address} onChange={(event) => setAddress(event.target.value)} /></div>}{mode === "hotel" && <div className="field-row"><div className="field"><label htmlFor="hotel">Hotel</label><input id="hotel" value={hotel} onChange={(event) => setHotel(event.target.value)} /></div><div className="field"><label htmlFor="room">Room (optional)</label><input id="room" value={hotelRoom} onChange={(event) => setHotelRoom(event.target.value)} /></div></div>}<button className="button" type="button" disabled={busy} onClick={findSlots}>Find real availability</button>{slots.length > 0 && <><p className="eyebrow">3. Select a time</p><div className="slots">{slots.map((slot) => <button className={`slot ${selectedSlot?.start_at === slot.start_at && selectedSlot?.therapist_id === slot.therapist_id ? "selected" : ""}`} type="button" key={`${slot.therapist_id}-${slot.start_at}`} onClick={() => setSelectedSlot(slot)}>{new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Nairobi" }).format(new Date(slot.start_at))}</button>)}</div><button className="button" type="button" disabled={busy || !selectedSlot} onClick={createBooking}>Hold this time</button></>}</>}
    {status && <p className="notice" role="status">{status}</p>}
  </form>;
}
