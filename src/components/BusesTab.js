import { T } from "../theme";
import React, { useState, useEffect } from "react";
import { vehiclesAPI, stopsAPI, queueAPI } from "../services/api";
import { getSocket, watchVehicle } from "../services/socket";

const C = { gold:T.amber, green:T.emerald, red:T.red, dark:T.charcoal,
            card:T.white, border:T.surfaceMd, text:T.charcoal, sub:T.muted };

function CapBar({ passengers, capacity }) {
  const pct = Math.min((passengers/capacity)*100,100);
  const col  = pct>=100?T.red:pct>=75?T.amber:T.emerald;
  return (
    <div style={{ background:T.surface,borderRadius:99,height:7,overflow:"hidden" }}>
      <div style={{ width:`${pct}%`,background:col,height:"100%",borderRadius:99,transition:"width 0.6s" }} />
    </div>
  );
}

export default function BusesTab() {
  const [vehicles, setVehicles] = useState([]);
  const [stops,    setStops]    = useState([]);
  const [myEntry,  setMyEntry]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [joining,  setJoining]  = useState(null);
  const [msg,      setMsg]      = useState({ type:"", text:"" });

  const load = async () => {
    try {
      const [vr, sr, qr] = await Promise.all([
        vehiclesAPI.list(), stopsAPI.list(), queueAPI.myQueues()
      ]);
      setVehicles(vr.data.vehicles || []);
      setStops(sr.data.stops || []);
      setMyEntry(qr.data.queues?.[0] || null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 12000);
    const s = getSocket();
    if (s) {
      s.on("vehicles:refresh", load);
      s.on("vehicle:status",   load);
    }
    return () => { clearInterval(iv); s?.off("vehicles:refresh"); s?.off("vehicle:status"); };
  }, []);

  const join = async (v) => {
    const stop = stops[0];
    if (!stop) return;
    setJoining(v.id); setMsg({ type:"", text:"" });
    try {
      const { data } = await queueAPI.join(v.id, stop.id);
      setMyEntry({ ...data.entry, vehicleId: v.id });
      setMsg({ type:"success", text:`Joined! You are #${data.entry.queueNumber}` });
      watchVehicle(v.id);
      load();
    } catch(e) { setMsg({ type:"error", text: e.response?.data?.error || "Failed to join" }); }
    finally { setJoining(null); }
  };

  const leave = async () => {
    if (!myEntry) return;
    try { await queueAPI.leave(myEntry.id); setMyEntry(null); load(); }
    catch(e) { setMsg({ type:"error", text: e.response?.data?.error || "Failed to leave" }); }
  };

  if (loading) return <div style={{ padding:40,textAlign:"center",color:T.muted }}>Loading vehicles...</div>;

  return (
    <div style={{ padding:20 }}>
      <div style={{ color:T.charcoal,fontSize:22,fontWeight:800,marginBottom:3 }}>All Vehicles</div>
      <div style={{ color:T.muted,fontSize:13,marginBottom:16 }}>
        Live tracking · {vehicles.length} registered
      </div>

      {msg.text && (
        <div style={{ background:msg.type==="error"?T.redLt:T.emeraldLt,
          border:`1px solid ${msg.type==="error"?T.red:T.emerald}44`,
          borderRadius:12,padding:"12px 16px",
          color:msg.type==="error"?T.red:T.emerald,fontSize:13,marginBottom:16 }}>
          {msg.type==="error"?"⚠️":"✅"} {msg.text}
        </div>
      )}

      {vehicles.length === 0 ? (
        <div style={{ textAlign:"center",color:T.muted,padding:"60px 0",fontSize:14 }}>
          No vehicles found
        </div>
      ) : vehicles.map(v => {
        const isMine   = myEntry?.vehicleId === v.id || myEntry?.vehicle_id === v.id;
        const free     = parseInt(v.capacity) - parseInt(v.passengers||0);
        const statusCol= v.status==="full"?T.red:v.status==="loading"?T.amber:T.emerald;
        const statusLabel = { full:"FULL",loading:"LOADING",en_route:"EN ROUTE",idle:"IDLE",offline:"OFFLINE" }[v.status]||v.status.toUpperCase();
        const canJoin  = !myEntry && v.status!=="full" && v.status!=="offline" && v.status!=="idle";

        return (
          <div key={v.id} style={{ background:T.white,border:`1px solid ${isMine?T.emerald+"55":T.surfaceMd}`,
            borderRadius:18,padding:"18px 20px",marginBottom:14,
            position:"relative",overflow:"hidden",boxShadow:"0 4px 20px #0006" }}>
            <div style={{ position:"absolute",left:0,top:16,bottom:16,width:3,
              background:statusCol,borderRadius:"0 4px 4px 0" }} />
            <div style={{ paddingLeft:10 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                <div>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <span style={{ fontFamily:T.fontMono,color:T.amber,fontWeight:700,fontSize:13 }}>{v.vehicle_code}</span>
                    <span style={{ fontSize:10,background:T.surface,color:T.muted,borderRadius:6,padding:"2px 7px",fontWeight:600 }}>
                      {v.type?.replace("_"," ")}
                    </span>
                  </div>
                  <div style={{ color:T.charcoal,fontSize:15,fontWeight:700,marginTop:4 }}>{v.route_name}</div>
                  <div style={{ color:T.muted,fontSize:12,marginTop:2 }}>Driver: {v.driver_name||"—"}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ background:v.status==="full"?T.redLt:T.emeraldLt,color:statusCol,
                    borderRadius:8,padding:"4px 10px",fontSize:10,fontWeight:800,letterSpacing:1 }}>{statusLabel}</div>
                  <div style={{ color:T.amber,fontWeight:700,fontSize:15,marginTop:6 }}>GHS {parseFloat(v.fare).toFixed(2)}</div>
                </div>
              </div>

              <CapBar passengers={v.passengers||0} capacity={v.capacity} />
              <div style={{ display:"flex",justifyContent:"space-between",marginTop:7,marginBottom:isMine||canJoin?14:0 }}>
                <span style={{ color:T.muted,fontSize:12 }}>{v.passengers||0}/{v.capacity}</span>
                <span style={{ color:v.status==="full"?T.red:T.emerald,fontSize:12,fontWeight:700 }}>
                  {v.status==="full"?"No seats":`${free} free`}
                </span>
              </div>

              {isMine && (
                <div style={{ background:T.emeraldLt,border:`1px solid ${T.emerald}44`,borderRadius:12,
                  padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <span style={{ color:T.emerald,fontWeight:700 }}>✅ Queue #{myEntry.queue_number||myEntry.queueNumber}</span>
                  <button onClick={leave} style={{ background:"none",border:`1px solid ${T.surfaceMd}`,
                    borderRadius:8,color:T.muted,fontSize:12,padding:"4px 10px",cursor:"pointer",
                    fontFamily:T.fontSans }}>Leave</button>
                </div>
              )}

              {canJoin && (
                <button onClick={()=>join(v)} disabled={joining===v.id}
                  style={{ width:"100%",padding:"11px",borderRadius:12,
                    background:joining===v.id?T.surfaceMd:`linear-gradient(135deg,${T.amber},#a07000)`,
                    border:"none",color:joining===v.id?T.muted:T.offWhite,
                    fontSize:13,fontWeight:800,cursor:joining===v.id?"not-allowed":"pointer",
                    fontFamily:T.fontSans,transition:"all 0.25s" }}>
                  {joining===v.id?"Joining...":"⚡ Join Queue"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
