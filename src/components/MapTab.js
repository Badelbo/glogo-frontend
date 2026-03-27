import { T } from "../theme";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { vehiclesAPI, stopsAPI } from "../services/api";
import { getSocket } from "../services/socket";

function latLngToXY(lat, lng, stops, W, H) {
  if (!stops.length) return [W/2, H/2];
  const lats = stops.map(s => parseFloat(s.lat));
  const lngs = stops.map(s => parseFloat(s.lng));
  const minLat = Math.min(...lats) - 0.5;
  const maxLat = Math.max(...lats) + 0.5;
  const minLng = Math.min(...lngs) - 0.5;
  const maxLng = Math.max(...lngs) + 0.5;
  const PAD = 40;
  const x = PAD + ((parseFloat(lng) - minLng) / (maxLng - minLng)) * (W - PAD * 2);
  const y = PAD + ((maxLat - parseFloat(lat)) / (maxLat - minLat)) * (H - PAD * 2);
  return [x, y];
}

export default function MapTab() {
  const canvasRef    = useRef(null);
  const tickRef      = useRef(0);
  const animRef      = useRef(null);
  const vehiclesRef  = useRef([]);
  const stopsRef     = useRef([]);

  const [stops,      setStops]      = useState([]);
  const [vehicles,   setVehicles]   = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [filter,     setFilter]     = useState("all");
  const [cityFilter, setCityFilter] = useState("All");
  const [cities,     setCities]     = useState(["All"]);

  const load = useCallback(async () => {
    try {
      const [vr, sr] = await Promise.all([vehiclesAPI.list(), stopsAPI.list()]);
      const vs = vr.data.vehicles || [];
      const ss = sr.data.stops    || [];
      setVehicles(vs);
      setStops(ss);
      vehiclesRef.current = vs;
      stopsRef.current    = ss;
      const uniqueCities = ["All", ...new Set(ss.map(s => s.city).filter(Boolean)).values()].sort();
      setCities(uniqueCities);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 12000);
    const s  = getSocket();
    if (s) {
      s.on("vehicle:location", ({ vehicleId, lat, lng }) => {
        vehiclesRef.current = vehiclesRef.current.map(v =>
          v.id === vehicleId ? { ...v, current_lat:lat, current_lng:lng } : v
        );
        setVehicles([...vehiclesRef.current]);
      });
    }
    return () => { clearInterval(iv); s?.off("vehicle:location"); };
  }, [load]);

  // ── Draw map ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stopsRef.current.length) return;
    const ctx = canvas.getContext("2d");
    const W   = canvas.width;
    const H   = canvas.height;

    const draw = () => {
      tickRef.current++;
      ctx.clearRect(0, 0, W, H);

      // Light background
      ctx.fillStyle = "#F0F7F4";
      ctx.fillRect(0, 0, W, H);

      // Subtle grid
      ctx.strokeStyle = "rgba(16,185,129,0.08)";
      ctx.lineWidth   = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
      }

      const ss = stopsRef.current;
      const vs = vehiclesRef.current;

      // Filter stops by city
      const visibleStops = cityFilter === "All"
        ? ss
        : ss.filter(s => s.city === cityFilter);

      // ── City region labels ──────────────────────────
      const cityGroups = {};
      visibleStops.forEach(s => {
        const city = s.city || "Other";
        if (!cityGroups[city]) cityGroups[city] = [];
        cityGroups[city].push(s);
      });

      Object.entries(cityGroups).forEach(([city, cityStops]) => {
        if (cityStops.length < 2) return;
        const coords = cityStops.map(s => latLngToXY(s.lat, s.lng, ss, W, H));
        const cx = coords.reduce((a,b) => a + b[0], 0) / coords.length;
        const cy = coords.reduce((a,b) => a + b[1], 0) / coords.length;
        ctx.font      = "bold 10px sans-serif";
        ctx.fillStyle = "rgba(6,78,59,0.4)";
        ctx.textAlign = "center";
        ctx.fillText(city.toUpperCase(), cx, cy - 8);
      });

      // ── Draw stops ──────────────────────────────────
      if (filter !== "vehicles") {
        visibleStops.forEach(stop => {
          const [x, y] = latLngToXY(stop.lat, stop.lng, ss, W, H);
          const isSelected = selected?.type === "stop" && selected?.data?.id === stop.id;

          // Outer glow for selected
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(16,185,129,0.2)";
            ctx.fill();
          }

          // Stop circle
          ctx.beginPath();
          ctx.arc(x, y, isSelected ? 6 : 4, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? T.emerald : "#F59E0B";
          ctx.fill();

          // White border
          ctx.strokeStyle = "#fff";
          ctx.lineWidth   = 1.5;
          ctx.stroke();
        });
      }

      // ── Draw active vehicles ────────────────────────
      if (filter !== "stops") {
        vs.forEach(v => {
          if (["idle","offline"].includes(v.status)) return;
          const lat = v.current_lat || v.live_location?.lat;
          const lng = v.current_lng || v.live_location?.lng;
          if (!lat || !lng) return;
          const [x, y] = latLngToXY(lat, lng, ss, W, H);

          // Animated pulse ring
          const pulse = (Math.sin(tickRef.current * 0.08) * 0.5 + 0.5);
          ctx.beginPath();
          ctx.arc(x, y, 12 + pulse * 6, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(16,185,129,${0.3 - pulse * 0.2})`;
          ctx.lineWidth   = 2;
          ctx.stroke();

          // Vehicle dot
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fillStyle = v.status === "full" ? T.red : T.emerald;
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth   = 2;
          ctx.stroke();

          // Vehicle code label
          ctx.font      = "bold 8px monospace";
          ctx.fillStyle = T.charcoal;
          ctx.textAlign = "center";
          ctx.fillText(v.vehicle_code || "", x, y - 14);
        });
      }
    };

    if (animRef.current) clearInterval(animRef.current);
    draw();
    animRef.current = setInterval(draw, 400);
    return () => clearInterval(animRef.current);
  }, [stops, vehicles, selected, filter, cityFilter]);

  // ── Click to select nearest stop ───────────────────
  const handleClick = e => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (canvas.width  / rect.width);
    const my   = (e.clientY - rect.top)  * (canvas.height / rect.height);
    let nearest = null, minDist = 24;
    stopsRef.current.forEach(stop => {
      const [sx, sy] = latLngToXY(stop.lat, stop.lng, stopsRef.current, canvas.width, canvas.height);
      const dist = Math.hypot(sx - mx, sy - my);
      if (dist < minDist) { minDist = dist; nearest = stop; }
    });
    setSelected(nearest ? { type:"stop", data:nearest } : null);
  };

  const activeVehicles = vehicles.filter(v => !["idle","offline"].includes(v.status));
  const filteredStops  = cityFilter === "All" ? stops : stops.filter(s => s.city === cityFilter);

  return (
    <div style={{ background:T.offWhite, minHeight:"100vh",
      fontFamily:T.fontSans }}>

      {/* Header */}
      <div style={{ background:T.white, padding:"16px 16px 12px",
        borderBottom:`1px solid ${T.surfaceMd}` }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:12 }}>
          <div style={{ fontFamily:T.fontHead, fontWeight:800,
            fontSize:18, color:T.charcoal }}>Live Map</div>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ background:activeVehicles.length > 0 ? "#D1FAE5" : T.surface,
              border:`1px solid ${activeVehicles.length > 0 ? T.emerald+"44" : T.surfaceMd}`,
              borderRadius:T.rFull, padding:"4px 12px",
              fontSize:11, fontWeight:700,
              color:activeVehicles.length > 0 ? T.forest : T.muted }}>
              🚌 {activeVehicles.length} active
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.surfaceMd}`,
              borderRadius:T.rFull, padding:"4px 12px",
              fontSize:11, color:T.muted, fontWeight:500 }}>
              📍 {filteredStops.length} stops
            </div>
          </div>
        </div>

        {/* City filter */}
        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
          style={{ width:"100%", padding:"10px 14px", borderRadius:T.rMd,
            background:T.white, border:`1.5px solid ${T.surfaceMd}`,
            color:T.charcoal, fontSize:14, fontFamily:T.fontSans,
            outline:"none", marginBottom:10, cursor:"pointer" }}>
          {cities.map(c => <option key={c} value={c}>{c === "All" ? "🇬🇭 All Cities" : c}</option>)}
        </select>

        {/* Filter tabs */}
        <div style={{ display:"flex", background:T.surface,
          borderRadius:T.rMd, padding:3, gap:3 }}>
          {[["all","All"],["stops","Stops Only"],["vehicles","Vehicles Only"]].map(([v,label]) => (
            <button key={v} onClick={() => setFilter(v)}
              style={{ flex:1, padding:"8px 4px", borderRadius:"7px",
                border:"none", cursor:"pointer", fontFamily:T.fontSans,
                background: filter===v ? T.white : "transparent",
                color: filter===v ? T.charcoal : T.muted,
                fontSize:12, fontWeight: filter===v ? 700 : 500,
                boxShadow: filter===v ? T.shadow : "none",
                transition:"all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas map */}
      <div style={{ position:"relative" }}>
        <canvas ref={canvasRef} width={420} height={400}
          style={{ width:"100%", height:"auto", display:"block",
            cursor:"pointer" }}
          onClick={handleClick} />

        {/* Legend */}
        <div style={{ position:"absolute", top:12, right:12,
          background:"rgba(255,255,255,0.95)", borderRadius:T.rMd,
          padding:"10px 14px", boxShadow:T.shadow,
          border:`1px solid ${T.surfaceMd}` }}>
          <div style={{ display:"flex", alignItems:"center",
            gap:8, marginBottom:6 }}>
            <div style={{ width:10, height:10, borderRadius:"50%",
              background:"#F59E0B", border:"1.5px solid #fff",
              boxShadow:"0 0 0 1px #F59E0B" }} />
            <span style={{ color:T.slate, fontSize:11,
              fontWeight:500 }}>Bus stop</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:10, height:10, borderRadius:"50%",
              background:T.emerald, border:"1.5px solid #fff",
              boxShadow:"0 0 0 1px " + T.emerald }} />
            <span style={{ color:T.slate, fontSize:11,
              fontWeight:500 }}>Active bus</span>
          </div>
        </div>
      </div>

      {/* Vehicles Only empty state */}
      {filter === "vehicles" && activeVehicles.length === 0 && (
        <div style={{ margin:"0 16px 16px",
          background:T.white, border:`1px solid ${T.surfaceMd}`,
          borderRadius:T.rLg, padding:"24px 20px", textAlign:"center",
          boxShadow:T.shadow }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🚌</div>
          <div style={{ fontFamily:T.fontHead, fontWeight:800,
            fontSize:16, color:T.charcoal, marginBottom:6 }}>
            No Active Vehicles Right Now
          </div>
          <div style={{ color:T.muted, fontSize:13, lineHeight:1.6,
            marginBottom:16 }}>
            Drivers go live from the Drive tab. When a driver is active
            their vehicle appears here with a pulsing green dot.
          </div>
          <div style={{ background:T.emeraldLt, border:`1px solid ${T.emerald}44`,
            borderRadius:T.rMd, padding:"12px 16px" }}>
            <div style={{ color:T.forest, fontSize:12, fontWeight:600,
              lineHeight:1.6 }}>
              💡 Are you a driver? Switch to Driver mode using the 🚌 toggle
              at the top right, then tap the Drive tab and click Go Live.
            </div>
          </div>
        </div>
      )}

      {/* Selected stop info */}
      {selected && (
        <div style={{ margin:"0 16px 16px",
          background:T.white, border:`1px solid ${T.emerald}44`,
          borderRadius:T.rLg, padding:"14px 16px",
          boxShadow:T.shadow }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"flex-start" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center",
                gap:8, marginBottom:3 }}>
                <div style={{ width:8, height:8, borderRadius:"50%",
                  background:"#F59E0B", flexShrink:0 }} />
                <div style={{ color:T.charcoal, fontWeight:700,
                  fontSize:15 }}>{selected.data.name}</div>
              </div>
              <div style={{ color:T.muted, fontSize:12, marginLeft:16 }}>
                {selected.data.city} · {selected.data.region}
              </div>
            </div>
            <button onClick={() => setSelected(null)}
              style={{ background:T.surface, border:"none",
                cursor:"pointer", width:28, height:28,
                borderRadius:T.rFull, fontSize:14, color:T.muted,
                display:"flex", alignItems:"center",
                justifyContent:"center" }}>✕</button>
          </div>
        </div>
      )}

      {/* All stops list */}
      <div style={{ padding:"0 16px 16px" }}>
        <div style={{ color:T.muted, fontSize:11, fontWeight:600,
          letterSpacing:"0.08em", textTransform:"uppercase",
          marginBottom:10 }}>
          {cityFilter === "All" ? "All Stops Across Ghana" : `Stops in ${cityFilter}`}
          <span style={{ marginLeft:8, background:T.emeraldLt,
            color:T.forest, borderRadius:T.rFull,
            padding:"1px 8px", fontSize:10 }}>
            {filteredStops.length}
          </span>
        </div>
        <div style={{ maxHeight:220, overflowY:"auto",
          display:"flex", flexDirection:"column", gap:6 }}>
          {filteredStops.map(s => (
            <div key={s.id}
              onClick={() => setSelected({ type:"stop", data:s })}
              style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", padding:"10px 14px",
                borderRadius:T.rMd, cursor:"pointer",
                background: selected?.data?.id === s.id ? "#D1FAE5" : T.white,
                border:`1px solid ${selected?.data?.id === s.id ? T.emerald+"44" : T.surfaceMd}`,
                transition:"all 0.15s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:7, height:7, borderRadius:"50%",
                  background:"#F59E0B", flexShrink:0 }} />
                <span style={{ color:T.charcoal, fontSize:13,
                  fontWeight:500 }}>{s.name}</span>
              </div>
              <span style={{ color:T.muted, fontSize:11,
                fontWeight:500 }}>{s.city}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
