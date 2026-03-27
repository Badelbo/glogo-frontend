import { T } from "../theme";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { driverAPI } from "../services/api";
import api from "../services/api";
import { driverOnline, driverOffline, driverLocation, driverPassengers, getSocket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

function LiveDot() {
  return (
    <span style={{ position:"relative", display:"inline-flex",
      alignItems:"center", justifyContent:"center", width:10, height:10 }}>
      <span style={{ position:"absolute", width:10, height:10, borderRadius:"50%",
        background:T.emerald, opacity:0.4,
        animation:"ping 1.5s ease-out infinite" }} />
      <span style={{ width:6, height:6, borderRadius:"50%",
        background:T.emerald, flexShrink:0 }} />
      <style>{`@keyframes ping{0%{transform:scale(1);opacity:0.4}100%{transform:scale(2.5);opacity:0}}`}</style>
    </span>
  );
}

function CapBar({ pax, cap }) {
  const pct = cap > 0 ? Math.min((pax/cap)*100,100) : 0;
  const col  = pct>=100 ? T.red : pct>=75 ? T.amber : T.emerald;
  return (
    <div style={{ background:T.surface, borderRadius:99, height:10, overflow:"hidden" }}>
      <div style={{ width:`${pct}%`, background:col, height:"100%",
        borderRadius:99, transition:"width 0.5s" }} />
    </div>
  );
}

export default function DriverDashboard() {
  const { user }   = useAuth();
  const [profile,  setProfile]    = useState(null);
  const [live,     setLive]       = useState(false);
  const [pax,      setPax]        = useState(0);
  const [tripId,   setTripId]     = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [gpsOk,    setGpsOk]      = useState(null);
  const [elapsed,  setElapsed]    = useState(0);
  const [msg,      setMsg]        = useState({ type:"", text:"" });
  const [goingLive,setGoingLive]  = useState(false);
  const [queue,    setQueue]      = useState([]);
  const [boarding, setBoarding]   = useState({}); // entryId -> loading

  const gpsRef   = useRef(null);
  const timerRef = useRef(null);
  const startRef = useRef(null);

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await driverAPI.me();
      setProfile(data.driver);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const loadQueue = useCallback(async (vehicleId) => {
    try {
      const { data } = await api.get(`/queues/vehicle/${vehicleId}`);
      setQueue(data.queue || []);
    } catch {}
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Refresh queue every 10 seconds while live
  useEffect(() => {
    if (!live || !profile?.vehicle_id) return;
    loadQueue(profile.vehicle_id);
    const iv = setInterval(() => loadQueue(profile.vehicle_id), 10000);
    return () => clearInterval(iv);
  }, [live, profile, loadQueue]);

  useEffect(() => () => {
    clearInterval(gpsRef.current);
    clearInterval(timerRef.current);
    if (gpsRef._heartbeat) clearInterval(gpsRef._heartbeat);
  }, []);

  const showMsg = (type, text, dur=5000) => {
    setMsg({ type, text });
    if (dur) setTimeout(() => setMsg({ type:"", text:"" }), dur);
  };

  const goLive = async () => {
    if (!profile?.vehicle_id) {
      showMsg("error", "No vehicle linked to your account.");
      return;
    }
    setGoingLive(true);
    try {
      const { data } = await driverAPI.startTrip(profile.vehicle_id);
      setTripId(data.trip.id);
      driverOnline(profile.vehicle_id);

      // GPS broadcast
      const broadcast = () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            pos => {
              setGpsOk(true);
              driverLocation({
                vehicleId: profile.vehicle_id,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                heading: pos.coords.heading || 0,
                speed: pos.coords.speed || 0,
              });
            },
            () => {
              setGpsOk(false);
              driverLocation({
                vehicleId: profile.vehicle_id,
                lat: 6.6931 + (Math.random()-0.5)*0.02,
                lng: -1.6248 + (Math.random()-0.5)*0.02,
                heading: 0, speed: 0,
              });
            },
            { enableHighAccuracy:true, timeout:8000, maximumAge:10000 }
          );
        }
      };
      broadcast();
      gpsRef.current = setInterval(broadcast, 5000);

      // Heartbeat every 14 seconds
      const hb = () => {
        const s = getSocket();
        if (s) s.emit("driver:heartbeat", { vehicleId: profile.vehicle_id });
      };
      hb();
      gpsRef._heartbeat = setInterval(hb, 14000);

      // Timer
      startRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);

      // Listen for socket events
      const sock = getSocket();
      if (sock) {
        sock.on("queue:updated", () => loadQueue(profile.vehicle_id));
        sock.on("queue:cancelled", () => {
          showMsg("success", "Trip ended and commuters have been notified.");
        });
      }

      setLive(true);
      await loadQueue(profile.vehicle_id);
      showMsg("success", "You are LIVE! Commuters can now see and join your queue. 🇬🇭", 5000);
    } catch(e) {
      showMsg("error", e.response?.data?.error || "Failed to go live. Try again.");
    } finally { setGoingLive(false); }
  };

  const goOffline = async () => {
    clearInterval(gpsRef.current);
    clearInterval(timerRef.current);
    if (gpsRef._heartbeat) clearInterval(gpsRef._heartbeat);
    if (profile?.vehicle_id) driverOffline(profile.vehicle_id);
    if (tripId) { try { await driverAPI.completeTrip(tripId, pax); } catch {} }
    setLive(false); setTripId(null); setPax(0);
    setElapsed(0); setGpsOk(null); setQueue([]);
    showMsg("success", `Trip complete! ${pax} passengers carried. Well done! 🎉`);
    loadProfile();
  };

  const updatePax = delta => {
    const cap  = parseInt(profile?.capacity || 18);
    const next = Math.max(0, Math.min(cap, pax + delta));
    setPax(next);
    if (profile?.vehicle_id) {
      driverPassengers({ vehicleId:profile.vehicle_id, count:next, capacity:cap });
    }
  };

  // ── CONFIRM BOARDING — triggers payment ───────────────────
  const confirmBoarding = async (entryId, commuterName) => {
    setBoarding(b => ({ ...b, [entryId]:true }));
    try {
      await api.patch(`/queues/${entryId}/board`);
      showMsg("success", `✅ ${commuterName} boarded — collect GHS ${parseFloat(profile?.fare||0).toFixed(2)} via MoMo!`);
      updatePax(+1);
      await loadQueue(profile.vehicle_id);
    } catch(e) {
      showMsg("error", e.response?.data?.error || "Failed to confirm boarding.");
    } finally {
      setBoarding(b => ({ ...b, [entryId]:false }));
    }
  };

  const formatTime = s => {
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const sec = s%60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  if (loading) return (
    <div style={{ padding:60, textAlign:"center" }}>
      <div style={{ fontSize:48, marginBottom:14 }}>🚌</div>
      <div style={{ color:T.muted, fontSize:14 }}>Loading driver profile...</div>
    </div>
  );

  if (!profile) return (
    <div style={{ padding:20 }}>
      <div style={{ background:T.white, border:`1px solid ${T.surfaceMd}`,
        borderRadius:T.rXl, padding:"48px 24px", textAlign:"center",
        boxShadow:T.shadowMd }}>
        <div style={{ fontSize:52, marginBottom:16 }}>🚗</div>
        <div style={{ fontFamily:T.fontHead, fontWeight:800,
          fontSize:18, color:T.charcoal, marginBottom:8 }}>No Driver Profile</div>
        <div style={{ color:T.muted, fontSize:14, lineHeight:1.6 }}>
          Register using the driver registration form to get started.
        </div>
      </div>
    </div>
  );

  const cap    = parseInt(profile.capacity || 18);
  const pct    = cap > 0 ? (pax/cap)*100 : 0;
  const isFull = pax >= cap;
  const waitingQueue = queue.filter(q => q.status !== "boarded");

  return (
    <div style={{ background:T.offWhite, minHeight:"100vh", fontFamily:T.fontSans }}>

      {/* Status header */}
      <div style={{ background: live
          ? `linear-gradient(135deg,${T.forest},#0a6b4a)` : T.white,
        padding:"20px 16px 16px",
        borderBottom:`1px solid ${live ? "transparent" : T.surfaceMd}`,
        transition:"background 0.4s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom: live ? 14 : 0 }}>
          <div style={{ width:52, height:52, borderRadius:T.rLg,
            background: live ? "rgba(255,255,255,0.15)"
              : `linear-gradient(135deg,${T.emerald},${T.forest})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:26, flexShrink:0 }}>🚌</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:T.fontHead, fontWeight:800, fontSize:18,
              color: live ? "#fff" : T.charcoal }}>{profile.name}</div>
            <div style={{ fontSize:12, fontWeight:500, marginTop:2,
              color: live ? "rgba(255,255,255,0.65)" : T.muted }}>
              {profile.vehicle_code || "No vehicle"} · {profile.vehicle_type?.replace(/_/g," ") || "Vehicle"}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6,
            background: live ? "rgba(255,255,255,0.15)" : T.surface,
            border:`1px solid ${live ? "rgba(255,255,255,0.25)" : T.surfaceMd}`,
            borderRadius:T.rFull, padding:"6px 12px" }}>
            {live ? <LiveDot /> : (
              <span style={{ width:6, height:6, borderRadius:"50%",
                background:T.ghost, display:"inline-block" }} />
            )}
            <span style={{ fontSize:11, fontWeight:800,
              color: live ? "#fff" : T.muted, letterSpacing:"0.06em" }}>
              {live ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>

        {live && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[
              { label:"Time live",  value:formatTime(elapsed) },
              { label:"On board",   value:`${pax}/${cap}`     },
              { label:"Waiting",    value:waitingQueue.length  },
            ].map(s => (
              <div key={s.label}
                style={{ background:"rgba(255,255,255,0.1)",
                  borderRadius:T.rMd, padding:"10px 12px", textAlign:"center" }}>
                <div style={{ color:"#fff", fontFamily:T.fontHead,
                  fontWeight:800, fontSize:16 }}>{s.value}</div>
                <div style={{ color:"rgba(255,255,255,0.55)",
                  fontSize:10, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:16 }}>

        {/* Alert */}
        {msg.text && (
          <div style={{ background: msg.type==="error" ? T.redLt : T.emeraldLt,
            border:`1px solid ${msg.type==="error" ? T.red+"33" : T.emerald+"44"}`,
            borderRadius:T.rMd, padding:"12px 16px", marginBottom:16,
            display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:16, flexShrink:0 }}>
              {msg.type==="error" ? "⚠️" : "✅"}
            </span>
            <span style={{ color: msg.type==="error" ? T.red : T.forest,
              fontSize:13, fontWeight:500, lineHeight:1.5 }}>{msg.text}</span>
          </div>
        )}

        {/* Go Live screen */}
        {!live ? (
          <div style={{ background:T.white, borderRadius:T.rXl,
            padding:"28px 20px", marginBottom:16,
            border:`1px solid ${T.surfaceMd}`,
            boxShadow:T.shadowLg, textAlign:"center" }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🚀</div>
            <div style={{ fontFamily:T.fontHead, fontWeight:900,
              fontSize:22, color:T.charcoal, marginBottom:8 }}>
              Ready to go live?
            </div>
            <div style={{ color:T.muted, fontSize:14, lineHeight:1.7,
              marginBottom:24, maxWidth:280, margin:"0 auto 24px" }}>
              When you go live, commuters across Ghana can see your vehicle
              and join your queue instantly.
            </div>

            <div style={{ background:"#FEF3C7",
              border:`1px solid ${T.amber}44`,
              borderRadius:T.rLg, padding:"14px 16px", marginBottom:20,
              textAlign:"left" }}>
              <div style={{ color:"#92400E", fontWeight:700, fontSize:13,
                marginBottom:8 }}>💰 How payment works</div>
              {[
                "Commuters join your queue for free — no payment upfront",
                "When a commuter boards, tap Confirm Boarding",
                "They pay you directly via MoMo, AirtelTigo or card",
                "100% of the fare goes straight to you — Glogo takes nothing",
              ].map((item, i) => (
                <div key={i} style={{ display:"flex", gap:8,
                  marginBottom: i < 3 ? 8 : 0, alignItems:"flex-start" }}>
                  <span style={{ color:"#92400E", fontWeight:800,
                    fontSize:12, flexShrink:0 }}>{i+1}.</span>
                  <span style={{ color:"#92400E", fontSize:12,
                    lineHeight:1.5 }}>{item}</span>
                </div>
              ))}
            </div>

            <button onClick={goLive} disabled={goingLive}
              style={{ width:"100%", padding:"16px", borderRadius:T.rMd,
                border:"none", cursor: goingLive ? "not-allowed" : "pointer",
                background: goingLive ? T.surfaceMd
                  : `linear-gradient(135deg,${T.emerald},${T.forest})`,
                color: goingLive ? T.muted : "#fff",
                fontFamily:T.fontHead, fontWeight:900, fontSize:17,
                boxShadow: goingLive ? "none" : `0 4px 20px ${T.emerald}55` }}>
              {goingLive ? "Going live..." : "🚀 Go Live Now"}
            </button>

            {profile.route_name && (
              <div style={{ color:T.muted, fontSize:12, marginTop:10 }}>
                Route: {profile.route_name} · GHS {parseFloat(profile.fare||0).toFixed(2)} per passenger
              </div>
            )}
          </div>
        ) : (

          /* LIVE STATE */
          <div>

            {/* GPS warning */}
            {gpsOk === false && (
              <div style={{ background:"#FEF3C7", border:`1px solid ${T.amber}44`,
                borderRadius:T.rMd, padding:"10px 14px", marginBottom:12,
                display:"flex", gap:8, alignItems:"center" }}>
                <span>⚠️</span>
                <span style={{ color:"#92400E", fontSize:12, fontWeight:500 }}>
                  GPS unavailable — enable location in browser settings.
                </span>
              </div>
            )}

            {/* ── BOARDING QUEUE — the key new feature ── */}
            <div style={{ background:T.white, borderRadius:T.rXl,
              padding:"18px", marginBottom:14,
              border:`1px solid ${T.surfaceMd}`, boxShadow:T.shadowMd }}>

              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:14 }}>
                <div style={{ color:T.muted, fontSize:11, fontWeight:700,
                  letterSpacing:"0.08em", textTransform:"uppercase" }}>
                  Passengers waiting
                </div>
                <div style={{ background:T.emeraldLt,
                  border:`1px solid ${T.emerald}44`,
                  borderRadius:T.rFull, padding:"3px 12px",
                  color:T.forest, fontSize:12, fontWeight:700 }}>
                  {waitingQueue.length} in queue
                </div>
              </div>

              {waitingQueue.length === 0 ? (
                <div style={{ textAlign:"center", padding:"20px 0",
                  color:T.muted, fontSize:13 }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>👥</div>
                  No passengers in queue yet.<br/>
                  Commuters will appear here as they join.
                </div>
              ) : (
                waitingQueue.map(q => (
                  <div key={q.id}
                    style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", padding:"12px 14px",
                      borderRadius:T.rMd, marginBottom:8,
                      background: q.status==="boarding" ? T.emeraldLt : T.surface,
                      border:`1px solid ${q.status==="boarding"
                        ? T.emerald+"44" : T.surfaceMd}` }}>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:24, height:24, borderRadius:"50%",
                          background:T.emerald, display:"flex",
                          alignItems:"center", justifyContent:"center",
                          color:"#fff", fontWeight:800, fontSize:11,
                          flexShrink:0 }}>
                          {q.queue_number}
                        </div>
                        <span style={{ color:T.charcoal, fontWeight:600,
                          fontSize:14 }}>{q.commuter_name}</span>
                      </div>
                      <div style={{ color:T.muted, fontSize:11,
                        marginTop:3, marginLeft:32 }}>
                        "✅ On board"
                      </div>
                    </div>

                    {/* Confirm Boarding button */}
                    {q.payment_status !== "paid" ? (
                      <button
                        onClick={() => confirmBoarding(q.id, q.commuter_name)}
                        disabled={boarding[q.id]}
                        style={{ padding:"10px 14px", borderRadius:T.rMd,
                          border:"none", cursor: boarding[q.id] ? "not-allowed" : "pointer",
                          background: boarding[q.id] ? T.surfaceMd
                            : `linear-gradient(135deg,${T.emerald},${T.forest})`,
                          color: boarding[q.id] ? T.muted : "#fff",
                          fontSize:12, fontWeight:700, fontFamily:T.fontSans,
                          whiteSpace:"nowrap",
                          boxShadow: boarding[q.id] ? "none"
                            : `0 2px 8px ${T.emerald}44` }}>
                        {boarding[q.id] ? "..." : "✓ Boarded"}
                      </button>
                    ) : (
                      <div style={{ background:T.emeraldLt,
                        border:`1px solid ${T.emerald}44`,
                        borderRadius:T.rMd, padding:"8px 12px",
                        color:T.forest, fontSize:11, fontWeight:700 }}>
                        ✅ Boarded
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Capacity bar */}
            <div style={{ background:T.white, borderRadius:T.rLg,
              padding:"16px", marginBottom:14,
              border:`1px solid ${T.surfaceMd}`, boxShadow:T.shadow }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                marginBottom:8 }}>
                <span style={{ color:T.muted, fontSize:12 }}>
                  {pax} on board
                </span>
                <span style={{ color: isFull ? T.red : T.emerald,
                  fontSize:12, fontWeight:700 }}>
                  {isFull ? "FULL" : `${cap-pax} seats free`}
                </span>
              </div>
              <CapBar pax={pax} cap={cap} />
            </div>

            {/* Manual pax counter */}
            <div style={{ background:T.white, borderRadius:T.rLg,
              padding:"14px 16px", marginBottom:14,
              border:`1px solid ${T.surfaceMd}`, boxShadow:T.shadow }}>
              <div style={{ color:T.muted, fontSize:11, fontWeight:600,
                letterSpacing:"0.06em", marginBottom:10 }}>
                MANUAL PASSENGER ADJUST
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 60px 1fr", gap:10 }}>
                <button onClick={() => updatePax(-1)} disabled={pax<=0}
                  style={{ padding:"14px", borderRadius:T.rMd, border:"none",
                    background: pax>0 ? T.surface : T.surfaceMd,
                    color: pax>0 ? T.charcoal : T.ghost,
                    fontSize:24, fontWeight:700,
                    cursor: pax>0 ? "pointer" : "not-allowed" }}>−</button>
                <div style={{ textAlign:"center", display:"flex",
                  flexDirection:"column", justifyContent:"center" }}>
                  <div style={{ fontFamily:T.fontHead, fontWeight:900,
                    fontSize:28, color:T.charcoal }}>{pax}</div>
                </div>
                <button onClick={() => updatePax(+1)} disabled={isFull}
                  style={{ padding:"14px", borderRadius:T.rMd, border:"none",
                    background: isFull ? T.redLt : T.emeraldLt,
                    color: isFull ? T.red : T.forest,
                    fontSize:24, fontWeight:700, border:`1.5px solid ${isFull ? T.red+"33" : T.emerald+"44"}`,
                    cursor: isFull ? "not-allowed" : "pointer" }}>+</button>
              </div>
            </div>

            {/* Broadcasting */}
            <div style={{ background:T.emeraldLt, border:`1px solid ${T.emerald}44`,
              borderRadius:T.rMd, padding:"10px 14px", marginBottom:16,
              display:"flex", alignItems:"center", gap:10 }}>
              <LiveDot />
              <span style={{ color:T.forest, fontSize:12, fontWeight:600 }}>
                Live — commuters can see and join your queue
              </span>
            </div>

            {/* End trip */}
            <button onClick={goOffline}
              style={{ width:"100%", padding:"14px", borderRadius:T.rMd,
                border:`1.5px solid ${T.red}33`, cursor:"pointer",
                background:T.redLt, color:T.red,
                fontFamily:T.fontHead, fontWeight:800, fontSize:15 }}>
              🛑 End Trip · Go Offline
            </button>
          </div>
        )}

        {/* Today stats when offline */}
        {!live && (
          <div style={{ background:T.white, borderRadius:T.rLg,
            padding:"18px 16px", border:`1px solid ${T.surfaceMd}`,
            boxShadow:T.shadow }}>
            <div style={{ color:T.muted, fontSize:11, fontWeight:700,
              letterSpacing:"0.08em", textTransform:"uppercase",
              marginBottom:14 }}>Today</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              {[
                { label:"Trips",      value:profile.trips_today || "0",      icon:"✅" },
                { label:"Passengers", value:profile.passengers_today || "0", icon:"👥" },
                { label:"Vehicle",    value:profile.vehicle_code || "—",     icon:"🚌" },
              ].map(s => (
                <div key={s.label} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
                  <div style={{ fontFamily:T.fontHead, fontWeight:800,
                    fontSize:18, color:T.charcoal }}>{s.value}</div>
                  <div style={{ color:T.muted, fontSize:10,
                    fontWeight:500, marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
