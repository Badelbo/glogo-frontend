import { T } from "./theme";
import React, { useState } from "react";

const BACKEND = "https://glogo-backend.onrender.com";

const VEHICLE_TYPES = [
  { id:"trotro",      label:"Trotro",       icon:"🚐", desc:"14–18 passengers" },
  { id:"shared_taxi", label:"Shared Taxi",  icon:"🚕", desc:"4 passengers, fixed route" },
  { id:"taxi",        label:"Private Taxi", icon:"🚕", desc:"4 passengers, any destination" },
  { id:"mini_bus",    label:"Mini Bus",     icon:"🚐", desc:"Up to 25 passengers" },
  { id:"metro_bus",   label:"Metro Bus",    icon:"🚌", desc:"35+ passengers" },
];

function Field({ label, value, onChange, type="text", placeholder }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", color:T.slate, fontSize:12,
        fontWeight:600, marginBottom:6, fontFamily:T.fontSans,
        letterSpacing:"0.02em" }}>{label}</label>
      <input value={value} onChange={onChange} type={type}
        placeholder={placeholder}
        style={{ background:T.white, border:`1.5px solid ${T.surfaceMd}`,
          borderRadius:T.rMd, padding:"13px 14px", color:T.charcoal,
          fontSize:14, width:"100%", fontFamily:T.fontSans,
          outline:"none", boxSizing:"border-box" }} />
    </div>
  );
}

export default function DriverRegisterScreen({ onBack, onSuccess }) {
  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState({
    name:"", phone:"", password:"",
    vehicleType:"trotro", plateNumber:"",
    routeName:"", fare:"", licenseNumber:"",
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Step 1 validation ────────────────────────────
  const goToStep2 = () => {
    if (!form.name.trim())     { setError("Please enter your full name"); return; }
    if (!form.phone.trim())    { setError("Please enter your phone number"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError(""); setStep(2);
  };

  // ── Step 2 submit ────────────────────────────────
  const submit = async () => {
    if (!form.plateNumber.trim()) { setError("Please enter your plate number"); return; }
    if (!form.routeName.trim())   { setError("Please enter your route"); return; }
    if (!form.fare)               { setError("Please enter your fare"); return; }
    if (!form.licenseNumber.trim()){ setError("Please enter your license number"); return; }

    setLoading(true); setError("");

    try {
      // Wake backend first
      await fetch(`${BACKEND}/health`).catch(() => {});

      const res = await fetch(`${BACKEND}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          name:          form.name.trim(),
          phone:         form.phone.trim(),
          password:      form.password,
          role:          "driver",
          vehicleType:   form.vehicleType,
          plateNumber:   form.plateNumber.trim().toUpperCase(),
          routeName:     form.routeName.trim(),
          fare:          parseFloat(form.fare) || 2.50,
          licenseNumber: form.licenseNumber.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed. Please try again.");
      }

      // Save tokens
      localStorage.setItem("glogo_token",   data.tokens.access);
      localStorage.setItem("glogo_refresh", data.tokens.refresh);

      setStep(3);
      if (onSuccess) onSuccess(data.user);

    } catch(e) {
      if (e.message === "Failed to fetch") {
        setError("Cannot reach the server. Please check your internet connection and try again.");
      } else {
        setError(e.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const selected = VEHICLE_TYPES.find(t => t.id === form.vehicleType);

  return (
    <div style={{ minHeight:"100vh", background:T.offWhite,
      fontFamily:T.fontSans, overflowY:"auto" }}>

      {/* Header */}
      <div style={{ background:T.white, padding:"14px 16px 12px",
        borderBottom:`1px solid ${T.surfaceMd}`,
        display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack}
          style={{ background:"none", border:"none", cursor:"pointer",
            color:T.muted, fontSize:13, fontWeight:600,
            fontFamily:T.fontSans, padding:0 }}>← Back</button>
        <div style={{ fontFamily:T.fontHead, fontWeight:800,
          fontSize:17, color:T.charcoal }}>Driver Registration</div>
      </div>

      {/* Progress */}
      <div style={{ display:"flex", gap:6, padding:"14px 16px 0" }}>
        {[1,2,3].map(s => (
          <div key={s} style={{ flex:1, height:4, borderRadius:99,
            background: s <= step ? T.emerald : T.surfaceMd,
            transition:"background 0.3s" }} />
        ))}
      </div>

      <div style={{ padding:16 }}>

        {/* ── STEP 1 — Personal Details ── */}
        {step === 1 && (
          <div>
            <div style={{ fontFamily:T.fontHead, fontWeight:800,
              fontSize:20, color:T.charcoal, marginBottom:4,
              marginTop:8 }}>Personal Details</div>
            <div style={{ color:T.muted, fontSize:13,
              marginBottom:20 }}>Your name, phone and password</div>

            <Field label="Full name" value={form.name}
              onChange={set("name")} placeholder="e.g. Kwame Asante" />
            <Field label="Phone number" value={form.phone}
              onChange={set("phone")} type="tel"
              placeholder="e.g. 0244 000 000" />
            <Field label="Password" value={form.password}
              onChange={set("password")} type="password"
              placeholder="Minimum 6 characters" />

            {error && (
              <div style={{ background:T.redLt, border:`1px solid ${T.red}33`,
                borderRadius:T.rMd, padding:"11px 14px",
                color:T.red, fontSize:13, marginBottom:14 }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={goToStep2}
              style={{ width:"100%", padding:"14px", borderRadius:T.rMd,
                border:"none", cursor:"pointer",
                background:`linear-gradient(135deg,${T.emerald},${T.forest})`,
                color:"#fff", fontSize:15, fontWeight:700,
                fontFamily:T.fontSans,
                boxShadow:`0 3px 12px ${T.emerald}44` }}>
              Next — Vehicle Details →
            </button>
          </div>
        )}

        {/* ── STEP 2 — Vehicle Details ── */}
        {step === 2 && (
          <div>
            <div style={{ fontFamily:T.fontHead, fontWeight:800,
              fontSize:20, color:T.charcoal, marginBottom:4,
              marginTop:8 }}>Vehicle Details</div>
            <div style={{ color:T.muted, fontSize:13,
              marginBottom:20 }}>Tell us about your vehicle</div>

            {/* Vehicle type grid */}
            <div style={{ color:T.slate, fontSize:12, fontWeight:600,
              marginBottom:8, letterSpacing:"0.02em" }}>Vehicle type</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
              gap:8, marginBottom:18 }}>
              {VEHICLE_TYPES.map(t => (
                <div key={t.id}
                  onClick={() => setForm(f => ({ ...f, vehicleType:t.id }))}
                  style={{ background: form.vehicleType===t.id
                    ? T.emeraldLt : T.white,
                    border:`1.5px solid ${form.vehicleType===t.id
                      ? T.emerald : T.surfaceMd}`,
                    borderRadius:T.rMd, padding:"12px 14px",
                    cursor:"pointer", transition:"all 0.2s" }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{t.icon}</div>
                  <div style={{ color: form.vehicleType===t.id
                    ? T.forest : T.charcoal,
                    fontWeight:700, fontSize:13 }}>{t.label}</div>
                  <div style={{ color:T.muted, fontSize:11,
                    marginTop:2 }}>{t.desc}</div>
                </div>
              ))}
            </div>

            <Field label="Number plate" value={form.plateNumber}
              onChange={set("plateNumber")}
              placeholder="e.g. AS-1234-24" />
            <Field label="Route" value={form.routeName}
              onChange={set("routeName")}
              placeholder="e.g. Kejetia → Tech Junction" />
            <Field label="Fare (GHS)" value={form.fare}
              onChange={set("fare")} type="number"
              placeholder="e.g. 2.50 (for reference only)" />
            <Field label="Driver license number" value={form.licenseNumber}
              onChange={set("licenseNumber")}
              placeholder="e.g. GH-DL-123456" />

            {/* Capacity info */}
            <div style={{ background:T.emeraldLt,
              border:`1px solid ${T.emerald}33`,
              borderRadius:T.rMd, padding:"10px 14px",
              marginBottom:16, color:T.forest,
              fontSize:13, fontWeight:500 }}>
              ℹ️ {selected?.label} — capacity:{" "}
              <strong>
                {{trotro:18,shared_taxi:4,taxi:4,mini_bus:25,metro_bus:45}[form.vehicleType]} passengers
              </strong>
            </div>

            {error && (
              <div style={{ background:T.redLt, border:`1px solid ${T.red}33`,
                borderRadius:T.rMd, padding:"11px 14px",
                color:T.red, fontSize:13, marginBottom:14 }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={submit} disabled={loading}
              style={{ width:"100%", padding:"14px", borderRadius:T.rMd,
                border:"none",
                cursor: loading ? "not-allowed" : "pointer",
                background: loading ? T.surfaceMd
                  : `linear-gradient(135deg,${T.emerald},${T.forest})`,
                color: loading ? T.muted : "#fff",
                fontSize:15, fontWeight:700, fontFamily:T.fontSans,
                boxShadow: loading ? "none" : `0 3px 12px ${T.emerald}44`,
                transition:"all 0.2s" }}>
              {loading ? "Registering... please wait" : "Complete Registration →"}
            </button>
          </div>
        )}

        {/* ── STEP 3 — Success ── */}
        {step === 3 && (
          <div style={{ textAlign:"center", paddingTop:32 }}>
            <div style={{ fontSize:72, marginBottom:16 }}>🎉</div>
            <div style={{ fontFamily:T.fontHead, fontWeight:900,
              fontSize:26, color:T.forest, marginBottom:10 }}>
              Welcome to Glogo!
            </div>
            <div style={{ color:T.muted, fontSize:14,
              lineHeight:1.7, marginBottom:28,
              maxWidth:300, margin:"0 auto 28px" }}>
              Your driver account and vehicle have been created successfully.
            </div>

            {/* Next steps */}
            <div style={{ background:T.white, border:`1px solid ${T.surfaceMd}`,
              borderRadius:T.rXl, padding:"20px 18px",
              marginBottom:24, textAlign:"left",
              boxShadow:T.shadowMd }}>
              <div style={{ color:T.muted, fontSize:11, fontWeight:700,
                letterSpacing:"0.08em", textTransform:"uppercase",
                marginBottom:14 }}>What to do next</div>
              {[
                ["1", "Log in with your phone number and password"],
                ["2", "Tap the 🚌 icon at top right to switch to Driver mode"],
                ["3", "Go to the Drive tab and tap Go Live Now"],
                ["4", "Your vehicle appears on the map — commuters can join your queue!"],
              ].map(([n, text]) => (
                <div key={n} style={{ display:"flex", gap:12,
                  marginBottom:12, alignItems:"flex-start" }}>
                  <div style={{ width:24, height:24, borderRadius:"50%",
                    background:T.emerald, display:"flex",
                    alignItems:"center", justifyContent:"center",
                    color:"#fff", fontWeight:800, fontSize:12,
                    flexShrink:0 }}>{n}</div>
                  <div style={{ color:T.slate, fontSize:13,
                    lineHeight:1.5 }}>{text}</div>
                </div>
              ))}
            </div>

            <button onClick={onBack}
              style={{ width:"100%", padding:"14px", borderRadius:T.rMd,
                border:"none", cursor:"pointer",
                background:`linear-gradient(135deg,${T.emerald},${T.forest})`,
                color:"#fff", fontSize:15, fontWeight:700,
                fontFamily:T.fontSans,
                boxShadow:`0 3px 12px ${T.emerald}44` }}>
              Go to Login →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
