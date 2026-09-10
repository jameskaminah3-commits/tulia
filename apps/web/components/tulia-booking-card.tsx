"use client";

import { useMemo, useState } from "react";
import type { TreatmentOption, ZoneOption } from "../lib/catalog";
import { createClient } from "../lib/supabase/client";

type Mode = "studio" | "home" | "hotel";
type Slot = { start_at: string; end_at: string; therapist_id: string; room_id: string | null };
type Step = 1 | 2 | 3 | 4;

const modeDetails: Record<Mode, { title: string; caption: string; mark: string }> = {
  studio: { title: "Studio", caption: "Our quiet Nyali room", mark: "≈" },
  home: { title: "Your home", caption: "We come to your door", mark: "⌂" },
  hotel: { title: "Hotel", caption: "A calm pause, wherever you are", mark: "✦" },
};

const kenyaToday = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
const money = (value: number | undefined) => value ? new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value) : "Unavailable";
const time = (value: string) => new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Nairobi" }).format(new Date(value));
const longDate = (value: string) => new Intl.DateTimeFormat("en-KE", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Nairobi" }).format(new Date(`${value}T12:00:00+03:00`));

export function TuliaBookingCard({ treatments, zones, configured, liveCatalog }: { treatments: TreatmentOption[]; zones: ZoneOption[]; configured: boolean; liveCatalog: boolean }) {
  const [step, setStep] = useState<Step>(1);
  const [treatmentId, setTreatmentId] = useState(treatments[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("studio");
  const [date, setDate] = useState(kenyaToday);
  const [zone, setZone] = useState(zones.find((item) => item.id === "nyali")?.id ?? zones[0]?.id ?? "");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [address, setAddress] = useState("");
  const [hotel, setHotel] = useState("");
  const [room, setRoom] = useState("");
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = useMemo(() => configured ? createClient() : null, [configured]);
  const treatment = treatments.find((item) => item.id === treatmentId) ?? treatments[0];
  const price = treatment?.prices[mode];
  const canContinue = Boolean(treatment && price && date && (mode === "studio" || zone));

  async function sendCode() {
    if (!supabase) return;
    setBusy(true); setStatus("");
    const { error } = await supabase.auth.signInWithOtp({ phone, options: { data: { full_name: fullName.trim() } } });
    setBusy(false); setStatus(error ? error.message : "We sent a one-time code to your phone.");
  }
  async function verifyPhone() {
    if (!supabase) return;
    setBusy(true); setStatus("");
    const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    if (error || !data.user) setStatus(error?.message ?? "We could not verify that code.");
    else {
      const { error: profileError } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", data.user.id);
      if (profileError) setStatus(profileError.message);
      else { setVerified(true); setStatus("Number verified. Now find a time that works."); }
    }
    setBusy(false);
  }
  async function findSlots() {
    if (!supabase || !treatment || !verified) return;
    setBusy(true); setStatus(""); setSlot(null);
    const { data, error } = await supabase.rpc("available_slots", { p_treatment_id: treatment.id, p_date: date, p_mode: mode, p_zone: mode === "studio" ? null : zone, p_gender: null });
    setBusy(false);
    if (error) setStatus(error.message);
    else { setSlots((data ?? []) as Slot[]); setStatus(data?.length ? "Choose a time. It is rechecked before it is held." : "No openings match those details yet. Please try another day or location."); }
  }
  async function holdTime() {
    if (!supabase || !treatment || !slot) return;
    if (mode === "home" && !address.trim()) { setStatus("Add an address or landmark for a home visit."); return; }
    if (mode === "hotel" && !hotel.trim()) { setStatus("Add the hotel name."); return; }
    setBusy(true); setStatus("");
    const { data, error } = await supabase.rpc("create_booking", { p_treatment_id: treatment.id, p_therapist_id: slot.therapist_id, p_start: slot.start_at, p_mode: mode, p_zone: mode === "studio" ? null : zone, p_room_id: slot.room_id, p_address: mode === "home" ? address.trim() : null, p_address_notes: null, p_hotel: mode === "hotel" ? hotel.trim() : null, p_hotel_room_no: mode === "hotel" ? room.trim() || null : null });
    setBusy(false);
    if (error) setStatus(error.message.includes("SLOT_TAKEN") ? "That time was just taken. Please choose another." : error.message);
    else { setReference((data as { reference?: string } | null)?.reference ?? ""); setStep(4); }
  }
  if (reference) return <aside className="tulia-booking-card tulia-success"><div className="success-mark">✓</div><p className="card-kicker">Booking held</p><h2>Your pause is held.</h2><div className="confirmation"><span>Reference</span><strong>{reference}</strong><p>{longDate(date)} · {slot && time(slot.start_at)}</p><p>{treatment?.name} · {money(price)}</p></div><p className="card-note">Your time is held for ten minutes while secure payment is prepared. Never pay using a link or number sent outside the official checkout.</p><button type="button" className="outline-action" onClick={() => { setReference(""); setStep(1); setSlot(null); }}>Make another booking →</button></aside>;
  return <aside className="tulia-booking-card"><div className="card-heading"><div><p className="card-kicker">Book your pause</p><h2>A few calm details.</h2></div><span>{step === 4 ? "" : `0${step} / 03`}</span></div><div className="progress" aria-label={`Booking step ${step} of 3`}>{[1, 2, 3].map((number) => <i key={number} className={number <= step ? "active" : ""} />)}</div>{!configured && <p className="booking-alert">Connect Supabase to enable real bookings. This preview preserves the final booking design.</p>}{configured && !liveCatalog && <p className="booking-alert">Your database is connected but has no active services yet. Add your catalog, pricing, team and availability before taking bookings.</p>}
    {step === 1 && <div className="booking-step"><div><div className="form-label-row"><label>Choose a treatment</label><span>Prices in KES</span></div><div className="treatment-list">{treatments.map((item) => <button type="button" onClick={() => { setTreatmentId(item.id); setSlot(null); }} className={treatment?.id === item.id ? "treatment selected" : "treatment"} key={item.id}><span><b>{item.name}</b><small>{item.description}</small><em>{item.durationMin} min · {Object.keys(item.prices).length} ways to receive</em></span><strong>{money(item.prices[mode] ?? item.prices.studio)}</strong></button>)}</div></div><div><label>Where should we meet?</label><div className="mode-options">{(Object.keys(modeDetails) as Mode[]).map((item) => <button type="button" key={item} className={mode === item ? "mode-option selected" : "mode-option"} onClick={() => { setMode(item); setSlot(null); }}><i>{modeDetails[item].mark}</i><b>{modeDetails[item].title}</b><small>{modeDetails[item].caption}</small></button>)}</div></div>{mode !== "studio" && <div><label htmlFor="zone">Which part of Mombasa?</label><select id="zone" value={zone} onChange={(event) => setZone(event.target.value)}>{zones.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}<div><label htmlFor="date">Pick a day</label><input id="date" type="date" min={kenyaToday} value={date} onChange={(event) => { setDate(event.target.value); setSlot(null); }} /></div><button type="button" className="primary-action" disabled={!canContinue || !configured} onClick={() => setStep(2)}>See available times <span>→</span></button></div>}
    {step === 2 && <div className="booking-step"><button type="button" className="back" onClick={() => setStep(1)}>← Change details</button><div className="selection-summary"><b>{treatment?.name}</b><span>{longDate(date)}</span><small>{modeDetails[mode].title} · {mode === "studio" ? "Nyali" : zones.find((item) => item.id === zone)?.name}</small></div>{!verified ? <div className="verification"><p className="card-kicker">Verify your phone</p><h3>Keep your time protected.</h3><label htmlFor="full-name">Your name</label><input id="full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Amina Hassan" autoComplete="name" /><label htmlFor="phone">Mobile number</label><input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+254 7..." autoComplete="tel" />{status && <p className="status-message">{status}</p>}<button type="button" className="primary-action" disabled={busy || !fullName.trim() || !phone.trim()} onClick={sendCode}>{busy ? "Sending…" : "Send verification code"} <span>→</span></button><label htmlFor="otp">One-time code</label><input id="otp" value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" /><button type="button" className="outline-action full" disabled={busy || !otp.trim()} onClick={verifyPhone}>Verify phone</button></div> : <div className="slot-area"><div className="slot-heading"><b>Open times</b><button type="button" className="text-action" disabled={busy} onClick={findSlots}>{busy ? "Checking…" : "Find real availability"}</button></div>{slots.length > 0 && <div className="slot-list">{slots.map((item) => <button type="button" className={slot?.start_at === item.start_at && slot.therapist_id === item.therapist_id ? "slot selected" : "slot"} key={`${item.therapist_id}-${item.start_at}`} onClick={() => setSlot(item)}><b>{time(item.start_at)}</b><small>{money(price)}</small></button>)}</div>}{status && <p className="status-message">{status}</p>}<button type="button" className="primary-action" disabled={!slot} onClick={() => setStep(3)}>Continue with this time <span>→</span></button></div>}</div>}
    {step === 3 && <div className="booking-step"><button type="button" className="back" onClick={() => setStep(2)}>← Choose another time</button><div className="selection-summary"><b>{longDate(date)} · {slot && time(slot.start_at)}</b><small>{treatment?.name} · {modeDetails[mode].title}</small></div>{mode === "home" && <div><label htmlFor="address">Address or landmark</label><input id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Building, street or nearby landmark" /></div>}{mode === "hotel" && <><div><label htmlFor="hotel">Hotel</label><input id="hotel" value={hotel} onChange={(event) => setHotel(event.target.value)} placeholder="Hotel name" /></div><div><label htmlFor="room">Room (optional)</label><input id="room" value={room} onChange={(event) => setRoom(event.target.value)} placeholder="Room no." /></div></>}{status && <p className="status-message">{status}</p>}<button type="button" className="primary-action" disabled={busy} onClick={holdTime}>{busy ? "Holding your time…" : "Hold this time"} <span>→</span></button><p className="card-note">No payment is taken here until your selected payment provider is configured and verified.</p></div>}
  </aside>;
}
