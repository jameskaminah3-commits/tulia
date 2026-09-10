"use client";

import { useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type Method = "email" | "phone";

export function LoginPanel() {
  const supabase = useMemo(createClient, []);
  const [method, setMethod] = useState<Method>("email");
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sendCode() {
    setBusy(true); setMessage("");
    const options = { data: { full_name: fullName.trim() }, emailRedirectTo: `${window.location.origin}/dashboard` };
    const result = method === "email"
      ? await supabase.auth.signInWithOtp({ email: contact.trim(), options })
      : await supabase.auth.signInWithOtp({ phone: contact.trim(), options: { data: options.data } });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else { setSent(true); setMessage(method === "email" ? "Check your inbox for a secure sign-in link." : "We sent a one-time code to your phone."); }
  }

  async function verifyCode() {
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.verifyOtp(method === "email" ? { email: contact.trim(), token: code.trim(), type: "email" } : { phone: contact.trim(), token: code.trim(), type: "sms" });
    setBusy(false);
    if (error) setMessage(error.message);
    else window.location.assign("/dashboard");
  }

  return <section className="login-panel"><div className="login-tabs"><button type="button" className={method === "email" ? "active" : ""} onClick={() => { setMethod("email"); setSent(false); setMessage(""); }}>Email</button><button type="button" className={method === "phone" ? "active" : ""} onClick={() => { setMethod("phone"); setSent(false); setMessage(""); }}>Phone</button></div><p className="card-kicker">Secure one-time sign in</p><h2>Your Tulia space.</h2><p>One account for booking, practice management, or operations. Your dashboard is chosen by your assigned role.</p><label htmlFor="login-name">Name</label><input id="login-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" autoComplete="name" /><label htmlFor="login-contact">{method === "email" ? "Email address" : "Mobile number"}</label><input id="login-contact" value={contact} onChange={(event) => setContact(event.target.value)} placeholder={method === "email" ? "you@example.com" : "+254 7..."} autoComplete={method === "email" ? "email" : "tel"} />{message && <p className="login-message">{message}</p>}{!sent ? <button type="button" className="primary-action" disabled={busy || !fullName.trim() || !contact.trim()} onClick={sendCode}>{busy ? "Sending…" : "Continue securely"} <span>→</span></button> : method === "email" ? <button type="button" className="outline-action full" disabled={busy} onClick={sendCode}>Send a fresh link</button> : <><label htmlFor="login-code">One-time code</label><input id="login-code" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" /><button type="button" className="primary-action" disabled={busy || !code.trim()} onClick={verifyCode}>{busy ? "Verifying…" : "Open my dashboard"} <span>→</span></button></>}</section>;
}
