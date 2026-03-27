import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import DriverRegisterScreen from "../DriverRegisterScreen";
import { T, btn, inp } from "../theme";

// ── Kente strip ───────────────────────────────────────────
function KenteStrip({ height = 4 }) {
  const cols = [T.kenteGold, T.kenteRed, T.kenteGreen, T.kenteGold,
                T.kenteDark, T.kenteGold, T.kenteGreen, T.kenteRed, T.kenteGold];
  return (
    <div style={{ display:"flex", height, width:"100%" }}>
      {cols.map((c,i) => <div key={i} style={{ flex:1, background:c }} />)}
    </div>
  );
}

// ── Custom checkmark list item ────────────────────────────
function ListItem({ text }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:12,
      marginBottom:14 }}>
      <div style={{ width:22, height:22, borderRadius:"50%",
        background:T.emeraldLt, border:`1.5px solid ${T.emerald}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        flexShrink:0, marginTop:1 }}>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M2 5.5L4.5 8L9 3" stroke={T.emerald} strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span style={{ color:T.slate, fontSize:14, lineHeight:1.6,
        fontFamily:T.fontSans, fontWeight:500 }}>{text}</span>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────
function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{ display:"flex", gap:16, alignItems:"flex-start",
      background:T.white, borderRadius:T.rLg, padding:"18px 20px",
      border:`1px solid ${T.surfaceMd}`,
      boxShadow:T.shadow, marginBottom:12 }}>
      <div style={{ width:44, height:44, borderRadius:T.rMd,
        background:T.emeraldLt, display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:22, flexShrink:0 }}>
        {icon}
      </div>
      <div>
        <div style={{ color:T.charcoal, fontWeight:700, fontSize:15,
          fontFamily:T.fontHead, marginBottom:4 }}>{title}</div>
        <div style={{ color:T.muted, fontSize:13, lineHeight:1.7,
          fontFamily:T.fontSans }}>{desc}</div>
      </div>
    </div>
  );
}

// ── City pill ─────────────────────────────────────────────
function CityPill({ name, isMore }) {
  return (
    <div style={{ background: isMore ? T.emeraldLt : T.surface,
      borderRadius:T.rFull, padding:"5px 14px",
      border:`1px solid ${isMore ? T.emerald+"44" : T.surfaceMd}`,
      color: isMore ? T.emerald : T.slate,
      fontSize:12, fontWeight:600, fontFamily:T.fontSans }}>
      {name}
    </div>
  );
}

// ── Stat badge ────────────────────────────────────────────
function StatBadge({ value, label }) {
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ color:T.forest, fontWeight:800, fontSize:22,
        fontFamily:T.fontHead }}>{value}</div>
      <div style={{ color:T.muted, fontSize:11, fontWeight:500,
        fontFamily:T.fontSans, marginTop:2 }}>{label}</div>
    </div>
  );
}

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [screen,  setScreen]  = useState("landing");
  const [mode,    setMode]    = useState("login");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState({
    phone:"", name:"", password:"", role:"commuter"
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  if (screen === "driverRegister") {
    return (
      <DriverRegisterScreen
        onBack={()   => { setScreen("landing"); setError(""); }}
        onSuccess={() => { setScreen("auth"); setMode("login"); setError(""); }}
      />
    );
  }

  const submit = async e => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        await login(form.phone, form.password);
      } else {
        if (!form.name) { setError("Name is required"); setLoading(false); return; }
        await register(form);
      }
    } catch(err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  // ── LANDING PAGE ────────────────────────────────────────
  if (screen === "landing") {
    return (
      <div style={{ minHeight:"100vh", background:T.offWhite,
        fontFamily:T.fontSans, overflowY:"auto" }}>

        {/* Top nav bar */}
        <div style={{ background:T.white, borderBottom:`1px solid ${T.surfaceMd}`,
          padding:"0 20px", position:"sticky", top:0, zIndex:60,
          boxShadow:T.shadow }}>
          <KenteStrip height={3} />
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", paddingTop:12, paddingBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:T.rMd,
                background:`linear-gradient(135deg,${T.emerald},${T.forest})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:18, boxShadow:`0 2px 8px ${T.emerald}44` }}>🚌</div>
              <div>
                <div style={{ fontFamily:T.fontHead, fontWeight:900, fontSize:18,
                  color:T.charcoal, letterSpacing:"-0.5px" }}>
                  Glo<span style={{ color:T.emerald }}>go</span>
                </div>
                <div style={{ color:T.muted, fontSize:10, fontWeight:500 }}>
                  🇬🇭 Ghana Transit
                </div>
              </div>
            </div>
            <button onClick={() => { setScreen("auth"); setMode("login"); }}
              style={{ ...btn.secondary, width:"auto", padding:"8px 18px",
                fontSize:13 }}>
              Sign In
            </button>
          </div>
        </div>

        {/* Hero section — off-white, no solid green block */}
        <div style={{ padding:"40px 20px 32px", textAlign:"center",
          background:T.offWhite }}>

          {/* Badge */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:8,
            background:T.emeraldLt, border:`1px solid ${T.emerald}33`,
            borderRadius:T.rFull, padding:"6px 16px", marginBottom:20 }}>
            <div style={{ width:6, height:6, borderRadius:"50%",
              background:T.emerald }} />
            <span style={{ color:T.emerald, fontSize:12, fontWeight:600 }}>
              Live across Ghana · 40+ cities
            </span>
          </div>

          {/* Main headline — Montserrat Extra Bold */}
          <h1 style={{ fontFamily:T.fontHead, fontWeight:900,
            fontSize:"clamp(28px, 8vw, 36px)", color:T.charcoal,
            lineHeight:1.15, letterSpacing:"-0.5px", marginBottom:16,
            maxWidth:340, margin:"0 auto 16px" }}>
            Never Stand in a{" "}
            <span style={{ color:T.emerald }}>Long Queue</span>{" "}
            Again.
          </h1>

          {/* Subtext — Inter Medium */}
          <p style={{ fontFamily:T.fontSans, fontWeight:500, fontSize:15,
            color:T.slate, lineHeight:1.7, maxWidth:320,
            margin:"0 auto 28px" }}>
            Join your trotro or taxi queue from home.
            We track it live and tell you when to leave.
            Pay by MoMo when you board.
          </p>

          {/* CTA buttons — emerald green pops on white */}
          <button onClick={() => { setScreen("auth"); setMode("register"); }}
            style={{ ...btn.primary, maxWidth:340, margin:"0 auto 12px",
              display:"block", fontSize:16, padding:"15px",
              boxShadow:`0 4px 14px ${T.emerald}44` }}>
            🚀 Get Started Free
          </button>
          <button onClick={() => { setScreen("auth"); setMode("login"); }}
            style={{ ...btn.secondary, maxWidth:340, margin:"0 auto 16px",
              display:"block" }}>
            Already have an account? Sign In →
          </button>
          <button onClick={() => setScreen("driverRegister")}
            style={{ ...btn.ghost, maxWidth:340, margin:"0 auto",
              display:"block" }}>
            🚕 I am a Driver — Register my Vehicle
          </button>

          {/* Stats row */}
          <div style={{ display:"flex", justifyContent:"center", gap:32,
            marginTop:32, padding:"20px 0",
            borderTop:`1px solid ${T.surfaceMd}`,
            borderBottom:`1px solid ${T.surfaceMd}` }}>
            <StatBadge value="40+" label="Cities" />
            <StatBadge value="88"  label="Stops" />
            <StatBadge value="Free" label="To join" />
          </div>
        </div>

        {/* Features section */}
        <div style={{ padding:"24px 20px" }}>
          <p style={{ fontFamily:T.fontSans, fontWeight:600, fontSize:11,
            color:T.muted, letterSpacing:"0.08em", textTransform:"uppercase",
            marginBottom:16 }}>How it works</p>

          <FeatureCard icon="🎫" title="Join from anywhere"
            desc="See a bus or taxi you need? Join the virtual queue from your home or office. Your spot is saved instantly — no need to rush to the stop." />
          <FeatureCard icon="📍" title="Real-time tracking"
            desc="Watch your vehicle on the live map. We calculate your exact wait time and send you a notification when it's time to start walking." />
          <FeatureCard icon="💳" title="Pay by Mobile Money"
            desc="No cash needed. Pay your fare with MTN MoMo or AirtelTigo when you board. Fast, secure, and fully digital." />
          <FeatureCard icon="🔔" title="Smart notifications"
            desc="Get alerted when your bus is 5 minutes away, when your queue number is boarding, and when payment is confirmed." />

          {/* What's included list */}
          <div style={{ background:T.white, borderRadius:T.rXl,
            padding:"24px 20px", border:`1px solid ${T.surfaceMd}`,
            boxShadow:T.shadowMd, marginTop:8, marginBottom:16 }}>
            <p style={{ fontFamily:T.fontHead, fontWeight:800, fontSize:17,
              color:T.charcoal, marginBottom:16 }}>Everything included, free</p>
            <ListItem text="Virtual queue for trotros, taxis, shared taxis and buses" />
            <ListItem text="Live GPS tracking on all active vehicles" />
            <ListItem text="MTN Mobile Money and AirtelTigo payments" />
            <ListItem text="Push notifications for queue updates" />
            <ListItem text="Available in 40+ cities across all 16 regions" />
            <ListItem text="Driver registration with automatic vehicle setup" />
          </div>

          {/* Cities */}
          <div style={{ background:T.white, borderRadius:T.rLg,
            padding:"20px", border:`1px solid ${T.surfaceMd}`,
            boxShadow:T.shadow, marginBottom:16 }}>
            <p style={{ fontFamily:T.fontSans, fontWeight:600, fontSize:11,
              color:T.muted, letterSpacing:"0.08em", textTransform:"uppercase",
              marginBottom:14 }}>Available across Ghana</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {["Accra","Kumasi","Takoradi","Cape Coast","Tamale",
                "Ho","Koforidua","Bolgatanga","Wa","Sunyani",
                "Techiman","Hohoe","Tema","Obuasi"].map(c => (
                <CityPill key={c} name={c} />
              ))}
              <CityPill name="+ 30 more" isMore />
            </div>
          </div>

          {/* Driver CTA */}
          <div style={{ background:`linear-gradient(135deg,${T.forest},${T.emerald}dd)`,
            borderRadius:T.rXl, padding:"24px 20px", marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <div style={{ fontSize:28 }}>🚌</div>
              <div style={{ fontFamily:T.fontHead, fontWeight:800, fontSize:18,
                color:T.white }}>Are you a Driver?</div>
            </div>
            <p style={{ color:"rgba(255,255,255,0.8)", fontSize:13,
              lineHeight:1.7, marginBottom:18, fontWeight:500 }}>
              Register your trotro, taxi, shared taxi, mini bus or metro bus.
              Commuters across Ghana will find you, join your queue, and
              pay you digitally — no cash needed.
            </p>
            <button onClick={() => setScreen("driverRegister")}
              style={{ ...btn.primary,
                background:"rgba(255,255,255,0.95)",
                color:T.forest, boxShadow:"none",
                fontWeight:700 }}>
              🚕 Register My Vehicle →
            </button>
          </div>

          {/* Footer */}
          <KenteStrip height={4} />
          <div style={{ textAlign:"center", paddingTop:16, paddingBottom:8 }}>
            <div style={{ color:T.muted, fontSize:12, fontWeight:500 }}>
              Free to use · Glogo Ghana Transit Platform · glogogh.com
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── AUTH SCREEN ─────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:T.offWhite,
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, fontFamily:T.fontSans }}>
      <div style={{ width:"100%", maxWidth:400 }}>

        <button onClick={() => { setScreen("landing"); setError(""); }}
          style={{ background:"none", border:"none", color:T.muted,
            cursor:"pointer", fontSize:13, fontWeight:600, marginBottom:20,
            display:"flex", alignItems:"center", gap:6,
            fontFamily:T.fontSans }}>
          ← Back
        </button>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:56, height:56, borderRadius:T.rLg,
            background:`linear-gradient(135deg,${T.emerald},${T.forest})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:26, margin:"0 auto 12px",
            boxShadow:`0 4px 14px ${T.emerald}44` }}>🚌</div>
          <h1 style={{ fontFamily:T.fontHead, fontWeight:900, fontSize:28,
            color:T.charcoal, letterSpacing:"-0.5px", marginBottom:4 }}>
            Glo<span style={{ color:T.emerald }}>go</span>
          </h1>
          <p style={{ color:T.muted, fontSize:13, fontWeight:500 }}>
            🇬🇭 Ghana Transit Platform
          </p>
        </div>

        <KenteStrip height={3} />

        {/* Auth card */}
        <div style={{ background:T.white, borderRadius:T.rXl, padding:"28px 24px",
          marginTop:0, border:`1px solid ${T.surfaceMd}`,
          boxShadow:T.shadowLg }}>

          {/* Tabs */}
          <div style={{ display:"flex", background:T.surface, borderRadius:T.rMd,
            padding:4, marginBottom:22, gap:4 }}>
            {[["login","Sign In"],["register","Register"]].map(([m,label]) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ flex:1, padding:"9px", borderRadius:"8px",
                  border:"none", cursor:"pointer",
                  background: mode===m ? T.white : "transparent",
                  color: mode===m ? T.charcoal : T.muted,
                  fontWeight: mode===m ? 700 : 500,
                  fontSize:14, fontFamily:T.fontSans,
                  boxShadow: mode===m ? T.shadow : "none",
                  transition:"all 0.2s" }}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                <label style={{ display:"block", color:T.slate, fontSize:12,
                  fontWeight:600, marginBottom:6, letterSpacing:"0.02em" }}>
                  Full name
                </label>
                <input style={inp.base} placeholder="e.g. Kwame Asante"
                  value={form.name} onChange={set("name")} autoComplete="name" />
              </>
            )}

            <label style={{ display:"block", color:T.slate, fontSize:12,
              fontWeight:600, marginBottom:6, letterSpacing:"0.02em" }}>
              Phone number
            </label>
            <input style={inp.base} placeholder="e.g. 0244 000 000"
              value={form.phone} onChange={set("phone")} type="tel" />

            <label style={{ display:"block", color:T.slate, fontSize:12,
              fontWeight:600, marginBottom:6, letterSpacing:"0.02em" }}>
              Password
            </label>
            <input style={{ ...inp.base, marginBottom: mode==="register" ? 14 : 20 }}
              placeholder="Enter your password"
              value={form.password} onChange={set("password")} type="password" />

            {mode === "register" && (
              <>
                <label style={{ display:"block", color:T.slate, fontSize:12,
                  fontWeight:600, marginBottom:8, letterSpacing:"0.02em" }}>
                  I am a
                </label>
                <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                  {[["commuter","👤 Commuter"],["driver","🚌 Driver"]].map(([r,label]) => (
                    <button key={r} type="button"
                      onClick={() => setForm(f => ({ ...f, role:r }))}
                      style={{ flex:1, padding:"12px", borderRadius:T.rMd,
                        cursor:"pointer", fontWeight:600, fontSize:14,
                        fontFamily:T.fontSans, transition:"all 0.2s",
                        background: form.role===r
                          ? (r==="driver" ? T.forest : T.emerald)
                          : T.surface,
                        border:`1.5px solid ${form.role===r
                          ? (r==="driver" ? T.forest : T.emerald)
                          : T.surfaceMd}`,
                        color: form.role===r ? T.white : T.slate,
                        boxShadow: form.role===r ? T.shadowMd : "none" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {error && (
              <div style={{ background:T.redLt, border:`1px solid ${T.red}33`,
                borderRadius:T.rMd, padding:"12px 16px", color:T.red,
                fontSize:13, marginBottom:16, fontWeight:500,
                display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:15 }}>⚠️</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              ...btn.primary,
              background: loading
                ? T.surfaceMd
                : `linear-gradient(135deg,${T.emerald},${T.emeraldMd})`,
              color: loading ? T.muted : T.white,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : `0 4px 14px ${T.emerald}44`,
              fontSize:15, padding:"14px" }}>
              {loading ? "Please wait..." : mode==="login" ? "Sign In →" : "Create Account →"}
            </button>
          </form>

          <div style={{ marginTop:16, paddingTop:16,
            borderTop:`1px solid ${T.surfaceMd}` }}>
            <button onClick={() => setScreen("driverRegister")}
              style={{ ...btn.ghost, fontSize:13, padding:"10px" }}>
              🚕 Are you a Driver? Register here →
            </button>
          </div>

          <div style={{ textAlign:"center", marginTop:12, color:T.ghost,
            fontSize:11, fontWeight:500 }}>
            Test: 0244200001 / test123 &nbsp;·&nbsp; Admin: 0244000001 / admin123
          </div>
        </div>
      </div>
    </div>
  );
}
