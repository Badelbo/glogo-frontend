import { T } from "../theme";
import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";

const C = {
  gold:T.amber, green:T.emerald, red:T.red,
  dark:T.charcoal, card:T.white, border:T.surfaceMd,
  text:T.charcoal, sub:T.muted, cream:T.offWhite,
};

function StatCard({ icon, label, value, color=T.amber, sub="" }) {
  return (
    <div style={{ background:T.white, border:`1px solid ${T.surfaceMd}`,
      borderRadius:16, padding:"16px 14px", textAlign:"center" }}>
      <div style={{ fontSize:26, marginBottom:6 }}>{icon}</div>
      <div style={{ color, fontWeight:800, fontSize:22 }}>{value ?? "—"}</div>
      <div style={{ color:T.muted, fontSize:11, marginTop:2 }}>{label}</div>
      {sub && <div style={{ color:T.amber, fontSize:10, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, count }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      marginBottom:12, marginTop:20 }}>
      <div style={{ color:T.muted, fontSize:11, fontWeight:700, letterSpacing:1 }}>{title}</div>
      {count !== undefined && (
        <div style={{ background:T.surface, borderRadius:20, padding:"2px 10px",
          color:T.amber, fontSize:11, fontWeight:700 }}>{count}</div>
      )}
    </div>
  );
}

function Row({ left, right, sub="", highlight=false }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"12px 14px", borderRadius:12, marginBottom:6,
      background: highlight ? T.emeraldLt : T.white,
      border:`1px solid ${highlight ? T.emerald+"44" : T.surfaceMd}` }}>
      <div>
        <div style={{ color:T.charcoal, fontSize:13, fontWeight:600 }}>{left}</div>
        {sub && <div style={{ color:T.muted, fontSize:11, marginTop:2 }}>{sub}</div>}
      </div>
      <div style={{ color:T.amber, fontSize:13, fontWeight:700 }}>{right}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats,    setStats]    = useState(null);
  const [users,    setUsers]    = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tab,      setTab]      = useState("overview");
  const [loading,  setLoading]  = useState(true);
  const [smsForm,  setSmsForm]  = useState({ phone:"", message:"" });
  const [smsSent,  setSmsSent]  = useState("");

  const load = useCallback(async () => {
    try {
      const [sr, ur, vr, pr] = await Promise.all([
        api.get("/admin/dashboard"),
        api.get("/admin/users"),
        api.get("/vehicles"),
        api.get("/payments/history?page=1&limit=20"),
      ]);
      setStats(sr.data);
      setUsers(ur.data.users || []);
      setVehicles(vr.data.vehicles || []);
      setPayments(pr.data.payments || []);
    } catch(e) {
      console.error("Admin load error:", e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendSMS = async () => {
    if (!smsForm.phone || !smsForm.message) return;
    try {
      await api.post("/admin/sms", smsForm);
      setSmsSent("SMS sent successfully!");
      setSmsForm({ phone:"", message:"" });
      setTimeout(() => setSmsSent(""), 3000);
    } catch(e) {
      setSmsSent("Failed: " + (e.response?.data?.error || e.message));
    }
  };

  const toggleUser = async (userId, isActive) => {
    try {
      await api.patch(`/admin/users/${userId}`, { is_active: !isActive });
      setUsers(prev => prev.map(u => u.id===userId ? { ...u, is_active:!isActive } : u));
    } catch {}
  };

  if (loading) return (
    <div style={{ padding:40, textAlign:"center" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>⚙️</div>
      <div style={{ color:T.muted }}>Loading admin data...</div>
    </div>
  );

  const TABS = [
    { id:"overview", label:"Overview" },
    { id:"users",    label:"Users"    },
    { id:"vehicles", label:"Vehicles" },
    { id:"payments", label:"Payments" },
    { id:"sms",      label:"SMS"      },
  ];

  const totalRevenue = payments
    .filter(p => p.status === "completed")
    .reduce((sum, p) => sum + parseFloat(p.amount||0), 0);

  const commuters = users.filter(u => u.role === "commuter");
  const drivers   = users.filter(u => u.role === "driver");
  const activeV   = vehicles.filter(v => !["idle","offline"].includes(v.status));

  return (
    <div style={{ padding:16 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <div style={{ fontSize:28 }}>⚙️</div>
        <div>
          <div style={{ color:T.offWhite, fontSize:20, fontWeight:800 }}>Admin Dashboard</div>
          <div style={{ color:T.muted, fontSize:12 }}>Glogo Control Panel</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:6, marginBottom:20, overflowX:"auto",
        paddingBottom:4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:"8px 14px", borderRadius:20, border:"none",
              cursor:"pointer", whiteSpace:"nowrap",
              background: tab===t.id ? T.amber : T.white,
              color: tab===t.id ? T.offWhite : T.muted,
              fontSize:12, fontWeight:700, fontFamily:T.fontSans,
              border: `1px solid ${tab===t.id ? T.amber : T.surfaceMd}` }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
            <StatCard icon="👤" label="Total Users"     value={users.length}         color={T.amber}  />
            <StatCard icon="🚌" label="Drivers"         value={drivers.length}       color={T.emerald} />
            <StatCard icon="🎫" label="Commuters"       value={commuters.length}     color="#9a7bfa" />
            <StatCard icon="🚗" label="Active Vehicles" value={activeV.length}       color={T.amber}  />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
            <StatCard icon="💳" label="Total Revenue"
              value={`GHS ${totalRevenue.toFixed(2)}`} color={T.emerald}
              sub={`${payments.filter(p=>p.status==="completed").length} transactions`} />
            <StatCard icon="📍" label="Cities"
              value={stats?.stops_count || "88+"} color={T.amber} sub="stops across Ghana" />
          </div>

          <SectionHeader title="RECENT ACTIVITY" />
          {payments.slice(0,5).map(p => (
            <Row key={p.id}
              left={p.commuter_name || "Commuter"}
              sub={`${p.method?.replace("_"," ")} · ${new Date(p.created_at).toLocaleDateString()}`}
              right={`GHS ${parseFloat(p.amount||0).toFixed(2)}`}
              highlight={p.status==="completed"} />
          ))}
          {payments.length === 0 && (
            <div style={{ color:T.muted, textAlign:"center", padding:"20px 0", fontSize:13 }}>
              No payments yet
            </div>
          )}
        </div>
      )}

      {/* ── USERS ── */}
      {tab === "users" && (
        <div>
          <SectionHeader title="ALL USERS" count={users.length} />
          {users.map(u => (
            <div key={u.id}
              style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"12px 14px", borderRadius:12, marginBottom:8,
                background:T.white, border:`1px solid ${T.surfaceMd}` }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:14 }}>
                    {u.role==="driver"?"🚌":u.role==="admin"?"⚙️":"👤"}
                  </span>
                  <span style={{ color:T.charcoal, fontSize:13, fontWeight:600 }}>{u.name}</span>
                  <span style={{ background:"#1a1808", borderRadius:6, padding:"2px 7px",
                    color:u.role==="driver"?T.emerald:u.role==="admin"?T.amber:T.muted,
                    fontSize:9, fontWeight:800, textTransform:"uppercase" }}>{u.role}</span>
                </div>
                <div style={{ color:T.muted, fontSize:11, marginTop:3 }}>{u.phone}</div>
                <div style={{ color:T.muted, fontSize:10, marginTop:1 }}>
                  Joined {new Date(u.created_at).toLocaleDateString("en-GH",
                    { day:"numeric", month:"short", year:"numeric" })}
                </div>
              </div>
              {u.role !== "admin" && (
                <button onClick={() => toggleUser(u.id, u.is_active)}
                  style={{ padding:"6px 12px", borderRadius:8, border:"none",
                    cursor:"pointer", fontSize:11, fontWeight:700,
                    fontFamily:T.fontSans,
                    background: u.is_active ? T.emeraldLt : T.redLt,
                    color: u.is_active ? T.emerald : T.red }}>
                  {u.is_active ? "Active" : "Suspended"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── VEHICLES ── */}
      {tab === "vehicles" && (
        <div>
          <SectionHeader title="ALL VEHICLES" count={vehicles.length} />
          {vehicles.map(v => {
            const statusCol = v.status==="full"?T.red:v.status==="loading"?T.amber:
                              v.status==="en_route"?T.emerald:T.muted;
            return (
              <div key={v.id}
                style={{ padding:"12px 14px", borderRadius:12, marginBottom:8,
                  background:T.white, border:`1px solid ${T.surfaceMd}`,
                  position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3,
                  background:statusCol }} />
                <div style={{ paddingLeft:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <div>
                      <span style={{ fontFamily:T.fontMono,
                        color:T.amber, fontWeight:700, fontSize:13 }}>{v.vehicle_code}</span>
                      <span style={{ color:T.muted, fontSize:11, marginLeft:8 }}>
                        {v.type?.replace("_"," ")}
                      </span>
                    </div>
                    <span style={{ color:statusCol, fontSize:11, fontWeight:700,
                      textTransform:"uppercase" }}>{v.status}</span>
                  </div>
                  <div style={{ color:T.charcoal, fontSize:13, fontWeight:600, marginTop:3 }}>
                    {v.route_name}
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                    <span style={{ color:T.muted, fontSize:11 }}>
                      Driver: {v.driver_name || "—"}
                    </span>
                    <span style={{ color:T.amber, fontSize:12, fontWeight:700 }}>
                      GHS {parseFloat(v.fare||0).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ color:T.muted, fontSize:11, marginTop:2 }}>
                    {v.passengers||0}/{v.capacity} passengers · {v.plate_number}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PAYMENTS ── */}
      {tab === "payments" && (
        <div>
          {/* Revenue summary */}
          <div style={{ background:T.emeraldLt, border:`1px solid ${T.emerald}44`,
            borderRadius:16, padding:"18px", marginBottom:16 }}>
            <div style={{ color:T.muted, fontSize:11, fontWeight:700,
              letterSpacing:1, marginBottom:8 }}>TOTAL REVENUE</div>
            <div style={{ color:T.emerald, fontSize:32, fontWeight:800 }}>
              GHS {totalRevenue.toFixed(2)}
            </div>
            <div style={{ color:T.muted, fontSize:12, marginTop:4 }}>
              {payments.filter(p=>p.status==="completed").length} completed transactions
            </div>
          </div>

          <SectionHeader title="ALL PAYMENTS" count={payments.length} />
          {payments.length === 0 ? (
            <div style={{ color:T.muted, textAlign:"center", padding:"40px 0", fontSize:13 }}>
              No payments yet. Share the app to get started!
            </div>
          ) : payments.map(p => (
            <div key={p.id}
              style={{ padding:"12px 14px", borderRadius:12, marginBottom:8,
                background:T.white, border:`1px solid ${T.surfaceMd}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:T.charcoal, fontSize:13, fontWeight:600 }}>
                  {p.commuter_name || "Commuter"}
                </span>
                <span style={{ color:p.status==="completed"?T.emerald:p.status==="failed"?T.red:T.amber,
                  fontSize:12, fontWeight:700, textTransform:"uppercase" }}>
                  {p.status}
                </span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:T.muted, fontSize:11 }}>
                  {p.method?.replace("_"," ")} · {p.vehicle_code}
                </span>
                <span style={{ color:T.amber, fontWeight:800, fontSize:14 }}>
                  GHS {parseFloat(p.amount||0).toFixed(2)}
                </span>
              </div>
              <div style={{ color:T.muted, fontSize:10, marginTop:3 }}>
                {new Date(p.created_at).toLocaleString("en-GH")}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SMS ── */}
      {tab === "sms" && (
        <div>
          <div style={{ color:T.offWhite, fontSize:18, fontWeight:800, marginBottom:4 }}>
            Send SMS
          </div>
          <div style={{ color:T.muted, fontSize:13, marginBottom:20 }}>
            Send a text message to any driver or commuter
          </div>

          <div style={{ color:T.muted, fontSize:11, fontWeight:700,
            marginBottom:8, letterSpacing:1 }}>PHONE NUMBER</div>
          <input
            value={smsForm.phone}
            onChange={e => setSmsForm(f => ({ ...f, phone:e.target.value }))}
            placeholder="e.g. 0244 000 000"
            type="tel"
            style={{ width:"100%", background:T.surface, border:`1px solid ${T.surfaceMd}`,
              borderRadius:12, padding:"13px 16px", color:T.charcoal, fontSize:15,
              fontFamily:T.fontSans, outline:"none", marginBottom:14,
              boxSizing:"border-box" }} />

          <div style={{ color:T.muted, fontSize:11, fontWeight:700,
            marginBottom:8, letterSpacing:1 }}>MESSAGE</div>
          <textarea
            value={smsForm.message}
            onChange={e => setSmsForm(f => ({ ...f, message:e.target.value }))}
            placeholder="Type your message here..."
            rows={4}
            style={{ width:"100%", background:T.surface, border:`1px solid ${T.surfaceMd}`,
              borderRadius:12, padding:"13px 16px", color:T.charcoal, fontSize:15,
              fontFamily:T.fontSans, outline:"none", marginBottom:6,
              boxSizing:"border-box", resize:"none" }} />
          <div style={{ color:T.muted, fontSize:11, marginBottom:16, textAlign:"right" }}>
            {smsForm.message.length}/160 characters
          </div>

          {smsSent && (
            <div style={{ background: smsSent.includes("Failed") ? T.redLt : T.emeraldLt,
              border:`1px solid ${smsSent.includes("Failed") ? T.red : T.emerald}44`,
              borderRadius:12, padding:"12px 16px",
              color: smsSent.includes("Failed") ? T.red : T.emerald,
              fontSize:13, marginBottom:16 }}>
              {smsSent.includes("Failed") ? "⚠️" : "✅"} {smsSent}
            </div>
          )}

          <button onClick={sendSMS}
            disabled={!smsForm.phone || !smsForm.message}
            style={{ width:"100%", padding:"14px", borderRadius:14, border:"none",
              background: (!smsForm.phone||!smsForm.message)
                ? T.surfaceMd : `linear-gradient(135deg,${T.amber},#a07000)`,
              color: (!smsForm.phone||!smsForm.message) ? T.muted : T.offWhite,
              fontSize:15, fontWeight:800, cursor:"pointer",
              fontFamily:T.fontSans, marginBottom:24 }}>
            📱 Send SMS
          </button>

          {/* Bulk SMS shortcuts */}
          <div style={{ color:T.muted, fontSize:11, fontWeight:700,
            letterSpacing:1, marginBottom:12 }}>QUICK BROADCAST</div>
          {[
            { label:"Message all drivers", msg:"Hello from Glogo! Make sure your app is updated and go live today to connect with commuters. www.glogogh.com" },
            { label:"Message all commuters", msg:"Glogo update: New vehicles are now available in your city. Open the app to join a queue. www.glogogh.com" },
          ].map(({ label, msg }) => (
            <button key={label}
              onClick={() => setSmsForm(f => ({ ...f, message:msg }))}
              style={{ width:"100%", padding:"12px", borderRadius:12, border:"none",
                background:T.white, border:`1px solid ${T.surfaceMd}`,
                color:T.muted, fontSize:13, cursor:"pointer", marginBottom:8,
                fontFamily:T.fontSans, textAlign:"left" }}>
              📢 {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
