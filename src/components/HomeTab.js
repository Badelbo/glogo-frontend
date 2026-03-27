import { T } from "../theme";
import React, { useState, useEffect, useCallback } from "react";
import { vehiclesAPI, stopsAPI, queueAPI } from "../services/api";
import { getSocket, watchVehicle } from "../services/socket";

const C = { gold:T.amber, green:T.emerald, red:T.red, dark:T.charcoal,
            card:T.white, border:T.surfaceMd, text:T.charcoal, sub:T.muted,
            cream:T.offWhite };

function CapBar({ passengers, capacity }) {
  const pct = Math.min((passengers/capacity)*100, 100);
  const col  = pct>=100?T.red:pct>=75?T.amber:T.emerald;
  return (
    <div style={{ background:T.surface, borderRadius:99, height:7, overflow:"hidden" }}>
      <div style={{ width:`${pct}%`, background:col, height:"100%", borderRadius:99, transition:"width 0.6s" }} />
    </div>
  );
}

const VEHICLE_LABEL = { trotro:"🚐 Trotro", metro_bus:"🚌 Metro Bus", taxi:"🚕 Taxi", shared_taxi:"🚕 Shared Taxi", mini_bus:"🚐 Mini Bus" };

// ── Welcome walkthrough shown once after first login ──────
function WelcomeWalkthrough({ onDone }) {
  const [step, setStep] = useState(0);
  const steps = [
    { icon:"🎉", title:"Welcome to Glogo!", desc:"Ghana's smartest transit app. We will show you how it works in 3 quick steps.", btn:"Let's Go →" },
    { icon:"🎫", title:"Join the Queue",     desc:"See a vehicle you need? Tap Join Queue. Your spot is saved — you don't need to go to the stop yet.", btn:"Got it →" },
    { icon:"📍", title:"We Tell You When to Leave", desc:"Glogo tracks the bus live and tells you exactly when to start walking to the stop.", btn:"Got it →" },
    { icon:"💳", title:"Pay your driver",      desc:"Pay your fare direct to your driver via MTN MoMo, AirtelTigo or card when you board.", btn:"Start Using Glogo →" },
  ];
  const s = steps[step];
  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:200,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:T.white, border:`1px solid ${T.emerald}44`,
        borderRadius:24, padding:32, maxWidth:360, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:64, marginBottom:16 }}>{s.icon}</div>
        <div style={{ color:T.offWhite, fontSize:22, fontWeight:800, marginBottom:10 }}>{s.title}</div>
        <div style={{ color:T.muted, fontSize:14, lineHeight:1.7, marginBottom:24 }}>{s.desc}</div>
        {/* Progress dots */}
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:24 }}>
          {steps.map((_,i) => (
            <div key={i} style={{ width:8, height:8, borderRadius:"50%",
              background: i===step ? T.amber : T.surfaceMd, transition:"background 0.3s" }} />
          ))}
        </div>
        <button onClick={() => { if (step < steps.length-1) setStep(s=>s+1); else onDone(); }}
          style={{ width:"100%", padding:"14px", borderRadius:14, border:"none",
            background:`linear-gradient(135deg,${T.amber},#a07000)`,
            color:T.offWhite, fontSize:15, fontWeight:800, cursor:"pointer",
            fontFamily:T.fontSans }}>
          {s.btn}
        </button>
        {step > 0 && (
          <button onClick={onDone}
            style={{ background:"none", border:"none", color:T.muted,
              fontSize:12, cursor:"pointer", marginTop:12, fontFamily:T.fontSans }}>
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  );
}

function VehicleCard({ v, onJoin, joined, myEntry }) {
  const isMine    = myEntry?.vehicleId===v.id || myEntry?.vehicle_id===v.id;
  const statusCol = v.status==="full"?T.red:v.status==="loading"?T.amber:T.emerald;
  const statusLabel = { full:"FULL", loading:"LOADING", en_route:"EN ROUTE", idle:"IDLE", offline:"OFFLINE" }[v.status]||v.status?.toUpperCase();
  const pax  = parseInt(v.passengers||v.on_board_count||0);
  const free = parseInt(v.capacity) - pax;
  const canJoin = !joined && !["full","offline","idle"].includes(v.status);

  return (
    <div style={{ background:T.white, border:`1px solid ${isMine?T.emerald+"55":T.surfaceMd}`,
      borderRadius:18, padding:"18px 20px", marginBottom:14,
      position:"relative", overflow:"hidden", boxShadow:"0 4px 20px #0006" }}>
      <div style={{ position:"absolute", left:0, top:16, bottom:16, width:3,
        background:statusCol, borderRadius:"0 4px 4px 0" }} />
      <div style={{ paddingLeft:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <span style={{ fontFamily:T.fontMono, color:T.amber, fontWeight:700, fontSize:13 }}>{v.vehicle_code}</span>
              <span style={{ fontSize:10, background:T.surface, color:T.muted, borderRadius:6, padding:"2px 7px" }}>
                {VEHICLE_LABEL[v.type]||v.type?.replace("_"," ")}
              </span>
            </div>
            <div style={{ color:T.charcoal, fontSize:15, fontWeight:700 }}>{v.route_name}</div>
            <div style={{ color:T.muted, fontSize:12, marginTop:2 }}>Driver: {v.driver_name||"—"}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ background:v.status==="full"?T.redLt:T.emeraldLt,
              color:statusCol, borderRadius:8, padding:"4px 10px", fontSize:10, fontWeight:800, letterSpacing:1 }}>
              {statusLabel}
            </div>
            <div style={{ color:T.amber, fontWeight:700, fontSize:15, marginTop:6 }}>
              GHS {parseFloat(v.fare||0).toFixed(2)}
            </div>
          </div>
        </div>

        <CapBar passengers={pax} capacity={v.capacity} />
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:7, marginBottom:canJoin||isMine?14:0 }}>
          <span style={{ color:T.muted, fontSize:12 }}>{pax}/{v.capacity} passengers</span>
          <span style={{ color:v.status==="full"?T.red:T.emerald, fontSize:12, fontWeight:700 }}>
            {v.status==="full"?"No seats":`${free} seat${free!==1?"s":""} free`}
          </span>
        </div>

        {isMine && (
          <div style={{ background:T.emeraldLt, border:`1px solid ${T.emerald}44`, borderRadius:12,
            padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ color:T.emerald, fontWeight:700, fontSize:14 }}>
              ✅ Queue #{myEntry?.queue_number||myEntry?.queueNumber}
            </span>
            <span style={{ color:T.muted, fontSize:12 }}>~{myEntry?.estimated_wait||0} min</span>
          </div>
        )}
        {canJoin && (
          <button onClick={() => onJoin(v)}
            style={{ width:"100%", padding:"13px", borderRadius:14, border:"none",
              background:`linear-gradient(135deg,${T.amber},#a07000)`,
              color:T.offWhite, fontSize:14, fontWeight:800, cursor:"pointer",
              fontFamily:T.fontSans }}>
            ⚡ Join Queue
          </button>
        )}
      </div>
    </div>
  );
}

export default function HomeTab({ onNavigate }) {
  const [vehicles,   setVehicles]   = useState([]);
  const [stops,      setStops]      = useState([]);
  const [myEntry,    setMyEntry]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [joining,    setJoining]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [avgWait,    setAvgWait]    = useState(null);
  const [cities,     setCities]     = useState([]);
  const [selectedCity, setSelectedCity] = useState("All Cities");
  const [showWelcome,  setShowWelcome]  = useState(false);

  // Show welcome walkthrough once for new users
  useEffect(() => {
    const seen = localStorage.getItem("glogo_welcome_seen");
    if (!seen) setShowWelcome(true);
  }, []);

  const dismissWelcome = () => {
    localStorage.setItem("glogo_welcome_seen", "1");
    setShowWelcome(false);
  };

  const load = useCallback(async () => {
    try {
      const [vr, sr, qr] = await Promise.all([
        vehiclesAPI.list(), stopsAPI.list(), queueAPI.myQueues()
      ]);
      const vs = vr.data.vehicles || [];
      const ss = sr.data.stops    || [];
      setVehicles(vs);
      setStops(ss);
      setMyEntry(qr.data.queues?.[0] || null);

      // Extract unique cities for filter
      const uniqueCities = ["All Cities", ...new Set(ss.map(s => s.city).filter(Boolean)).values()].sort();
      setCities(uniqueCities);

      // Calculate real average wait time from active vehicles
      const active = vs.filter(v => !["idle","offline"].includes(v.status));
      if (active.length > 0) {
        const totalPax = active.reduce((sum, v) => sum + parseInt(v.passengers||0), 0);
        const totalCap = active.reduce((sum, v) => sum + parseInt(v.capacity||18), 0);
        const avgLoad  = totalPax / totalCap;
        const estWait  = Math.round(3 + avgLoad * 12);
        setAvgWait(estWait);
      } else {
        setAvgWait(null);
      }
    } catch(err) {
      // Only show error on first load — not on background refreshes
      if (vehicles.length === 0 && stops.length === 0) {
        setError("Could not reach server. Wake it up at: https://glogo-backend.onrender.com/health then refresh.");
      }
    }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    const s  = getSocket();
    if (s) {
      s.on("vehicles:refresh", load);
      s.on("vehicle:status",   load);
      s.on("payment:success",  () => {});
      s.on("queue:cancelled", ({ queueNumber }) => {
        setMyEntry(null);
        setError("⚠️ Your driver has gone offline. Queue #" + queueNumber + " has been cancelled. Please join another vehicle.");
        load();
      });
      s.on("notification:new", n => {
        if (n.type === "trip_update") {
          setMyEntry(null);
          setError(n.body);
          load();
        }
      });
    }
    return () => {
      clearInterval(iv);
      const s2 = getSocket();
      s2?.off("vehicles:refresh");
      s2?.off("vehicle:status");
      s2?.off("payment:success");
    };
  }, [load]);

  const joinQueue = async vehicle => {
    if (!stops.length) return;
    setJoining(true); setError(""); setSuccess("");
    try {
      // Pick a stop in the same city as the vehicle's route if possible
      const cityStop = stops.find(s =>
        vehicle.route_name?.toLowerCase().includes(s.city?.toLowerCase())
      ) || stops[0];
      const { data } = await queueAPI.join(vehicle.id, cityStop.id);
      setMyEntry({ ...data.entry, vehicle_id:vehicle.id });
      setSuccess(`Joined! You are #${data.entry.queueNumber}. Est. wait: ${data.entry.estimatedWait} min.`);
      watchVehicle(vehicle.id);
      load();
    } catch(e) { setError(e.response?.data?.error || "Failed to join queue."); }
    finally    { setJoining(false); }
  };

  const leaveQueue = async () => {
    if (!myEntry) return;
    try { await queueAPI.leave(myEntry.id); setMyEntry(null); load(); }
    catch(e) { setError(e.response?.data?.error || "Failed to leave."); }
  };

  // Filter vehicles by selected city
  const filteredVehicles = vehicles.filter(v => {
    if (selectedCity === "All Cities") return true;
    // Match vehicle route to selected city
    return v.route_name?.toLowerCase().includes(selectedCity.toLowerCase()) ||
           stops.some(s => s.city === selectedCity &&
             (v.route_name?.includes(s.name) || v.route_name?.includes(s.city)));
  });

  const active = filteredVehicles.filter(v => !["idle","offline"].includes(v.status));
  const next   = active[0];

  if (loading) return (
    <div style={{ padding:40, textAlign:"center" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>🚌</div>
      <div style={{ color:T.muted, fontSize:14 }}>Loading Ghana transit...</div>
    </div>
  );

  return (
    <div style={{ padding:16 }}>
      {showWelcome && <WelcomeWalkthrough onDone={dismissWelcome} />}

      {/* City filter */}
      <div style={{ marginBottom:14 }}>
        <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
          style={{ width:"100%", padding:"11px 14px", borderRadius:12,
            background:T.white, border:`1px solid ${T.surfaceMd}`,
            color:T.charcoal, fontSize:14, fontFamily:T.fontSans,
            outline:"none", cursor:"pointer" }}>
          {cities.map(c => <option key={c} value={c} style={{ background:T.offWhite }}>{c}</option>)}
        </select>
      </div>

      {/* Hero */}
      <div style={{ background:"linear-gradient(145deg,#1a1a08,#0e1f10)",
        border:`1px solid ${T.emerald}33`, borderRadius:22, padding:"22px 20px",
        marginBottom:16, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, display:"flex", height:3 }}>
          {[T.amber,T.red,T.emerald,T.amber,T.offWhite,T.amber,T.emerald,T.red,T.amber].map((c,i)=>
            <div key={i} style={{ flex:1, background:c }} />)}
        </div>
        <div style={{ color:T.muted, fontSize:12, marginBottom:8 }}>
          📍 {selectedCity === "All Cities" ? "Ghana Transit · Live" : `${selectedCity} · Live`}
        </div>
        {next ? (
          <>
            <div style={{ color:T.offWhite, fontSize:22, fontWeight:800, marginBottom:4, lineHeight:1.3 }}>
              Next vehicle: <span style={{ color:T.amber }}>{next.vehicle_code}</span>
            </div>
            <div style={{ color:T.muted, fontSize:14, marginBottom:20 }}>
              {parseInt(next.capacity)-parseInt(next.passengers||0)} seats · GHS {parseFloat(next.fare||0).toFixed(2)} · {next.route_name}
            </div>
          </>
        ) : (
          <div style={{ color:T.offWhite, fontSize:18, fontWeight:700, marginBottom:20 }}>
            No active vehicles {selectedCity !== "All Cities" ? `in ${selectedCity}` : "right now"}
          </div>
        )}

        {myEntry ? (
          <div style={{ background:"#08160a", border:`1px solid ${T.emerald}44`, borderRadius:16, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div>
                <div style={{ color:T.emerald, fontWeight:800, fontSize:20 }}>
                  Queue #{myEntry.queue_number||myEntry.queueNumber}
                </div>
                <div style={{ color:T.muted, fontSize:13, marginTop:2 }}>{myEntry.route_name||"Active queue"}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:T.offWhite, fontWeight:800, fontSize:28 }}>
                  {myEntry.estimated_wait||0}<span style={{ fontSize:13, color:T.muted, fontWeight:400 }}>m</span>
                </div>
                <div style={{ color:T.muted, fontSize:11 }}>est. wait</div>
              </div>
            </div>
            <div style={{ color:T.amber, fontSize:13, marginBottom:12 }}>
              💡 Leave home in ~{Math.max(0,(myEntry.estimated_wait||0)-5)} min
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => onNavigate("pay")}
                style={{ display:"none" }}>Pay</button>
              <div style={{ background:"#FEF3C7", border:"1px solid #F59E0B44",
                borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
                <div style={{ color:"#92400E", fontSize:12, fontWeight:600, lineHeight:1.5 }}>
                  💰 Your fare will be collected when you board. Pay direct to your driver via MoMo, AirtelTigo or card.
                </div>
              </div>
              <button onClick={leaveQueue}
                style={{ width:"100%", padding:"10px", borderRadius:10, background:T.surface,
                  border:`1px solid ${T.surfaceMd}`, color:T.muted, fontSize:13,
                  cursor:"pointer", fontFamily:T.fontSans }}>
                Leave Queue
              </button>
            </div>
          </div>
        ) : next ? (
          <button onClick={() => joinQueue(next)} disabled={joining}
            style={{ width:"100%", padding:"14px", borderRadius:14, border:"none",
              background:joining?T.surfaceMd:`linear-gradient(135deg,${T.amber},#a07000)`,
              color:joining?T.muted:T.offWhite, fontSize:15, fontWeight:800,
              cursor:joining?"not-allowed":"pointer", fontFamily:T.fontSans }}>
            {joining?"Joining...":"⚡ Join Virtual Queue"}
          </button>
        ) : null}
      </div>

      {error   && <div style={{ background:T.redLt, border:`1px solid ${T.red}44`, borderRadius:12, padding:"12px 16px", color:T.red, fontSize:13, marginBottom:14 }}>⚠️ {error}</div>}
      {success && <div style={{ background:T.emeraldLt, border:`1px solid ${T.emerald}44`, borderRadius:12, padding:"12px 16px", color:T.emerald, fontSize:13, marginBottom:14 }}>✅ {success}</div>}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
        {[
          { label:"Active Buses",  value:active.length,                           icon:"🚌" },
          { label:"Stops",         value:stops.filter(s => selectedCity==="All Cities"||s.city===selectedCity).length, icon:"📍" },
          { label:"Avg Wait",      value: avgWait ? `${avgWait}m` : "—",           icon:"⏱️" },
        ].map(s => (
          <div key={s.label} style={{ background:T.white, border:`1px solid ${T.surfaceMd}`,
            borderRadius:14, padding:"14px 10px", textAlign:"center" }}>
            <div style={{ fontSize:20, marginBottom:6 }}>{s.icon}</div>
            <div style={{ color:T.amber, fontWeight:800, fontSize:20 }}>{s.value}</div>
            <div style={{ color:T.muted, fontSize:10, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ color:T.muted, fontSize:11, fontWeight:700, marginBottom:12, letterSpacing:1 }}>
        {selectedCity === "All Cities" ? "NEARBY VEHICLES" : `VEHICLES IN ${selectedCity.toUpperCase()}`}
      </div>

      {active.length === 0 ? (
        <div style={{ background:T.white, border:`1px solid ${T.surfaceMd}`, borderRadius:18,
          padding:"40px 20px", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🚌</div>
          <div style={{ color:T.offWhite, fontSize:15, fontWeight:700, marginBottom:6 }}>
            No Active Vehicles {selectedCity !== "All Cities" ? `in ${selectedCity}` : ""}
          </div>
          <div style={{ color:T.muted, fontSize:13 }}>Check back soon or try another city</div>
          {selectedCity !== "All Cities" && (
            <button onClick={() => setSelectedCity("All Cities")}
              style={{ marginTop:14, padding:"9px 18px", borderRadius:10, border:`1px solid ${T.surfaceMd}`,
                background:"none", color:T.amber, fontSize:13, cursor:"pointer",
                fontFamily:T.fontSans }}>
              Show all cities
            </button>
          )}
        </div>
      ) : (
        active.slice(0,5).map(v => (
          <VehicleCard key={v.id} v={v} onJoin={joinQueue}
            joined={!!myEntry} myEntry={myEntry} />
        ))
      )}
    </div>
  );
}
