import { T } from "../theme";
import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";

const C = {
  gold:T.amber, green:T.emerald, red:T.red,
  dark:T.charcoal, card:T.white, border:T.surfaceMd,
  text:T.charcoal, sub:T.muted, cream:T.offWhite,
};

function EarningBar({ label, value, max, color=T.amber }) {
  const pct = max > 0 ? Math.min((value/max)*100, 100) : 0;
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ color:T.muted, fontSize:12 }}>{label}</span>
        <span style={{ color:color, fontSize:12, fontWeight:700 }}>
          GHS {parseFloat(value).toFixed(2)}
        </span>
      </div>
      <div style={{ background:T.surface, borderRadius:99, height:6, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, background:color, height:"100%",
          borderRadius:99, transition:"width 0.8s" }} />
      </div>
    </div>
  );
}

export default function EarningsDashboard() {
  const [earnings, setEarnings] = useState(null);
  const [trips,    setTrips]    = useState([]);
  const [period,   setPeriod]   = useState("week"); // today | week | month | all
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [er, tr] = await Promise.all([
        api.get(`/drivers/earnings?period=${period}`),
        api.get("/drivers/trips"),
      ]);
      setEarnings(er.data);
      setTrips(tr.data.trips || []);
    } catch(e) {
      // Build mock earnings from trips if endpoint not ready
      try {
        const { data } = await api.get("/drivers/trips");
        const t = data.trips || [];
        setTrips(t);
        const now   = new Date();
        const today = t.filter(tr => new Date(tr.created_at).toDateString() === now.toDateString());
        const week  = t.filter(tr => (now - new Date(tr.created_at)) < 7*24*60*60*1000);
        const month = t.filter(tr => new Date(tr.created_at).getMonth() === now.getMonth());

        const sumFare = arr => arr.reduce((s,tr) => s + parseFloat(tr.fare||0), 0);
        setEarnings({
          today:  { trips: today.length,  revenue: sumFare(today)  },
          week:   { trips: week.length,   revenue: sumFare(week)   },
          month:  { trips: month.length,  revenue: sumFare(month)  },
          all:    { trips: t.length,      revenue: sumFare(t)      },
          commission_rate: 10,
        });
      } catch {}
    } finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const PERIODS = [
    { id:"today", label:"Today" },
    { id:"week",  label:"Week"  },
    { id:"month", label:"Month" },
    { id:"all",   label:"All Time" },
  ];

  const current  = earnings?.[period] || { trips:0, revenue:0 };
  const gross    = parseFloat(current.revenue || 0);
  const rate     = parseFloat(earnings?.commission_rate || 10) / 100;
  const commission = gross * rate;
  const net      = gross - commission;

  if (loading) return (
    <div style={{ padding:40, textAlign:"center" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>💰</div>
      <div style={{ color:T.muted }}>Loading earnings...</div>
    </div>
  );

  return (
    <div style={{ padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <div style={{ fontSize:28 }}>💰</div>
        <div>
          <div style={{ color:T.offWhite, fontSize:20, fontWeight:800 }}>My Earnings</div>
          <div style={{ color:T.muted, fontSize:12 }}>Your income from Glogo trips</div>
        </div>
      </div>

      {/* Period selector */}
      <div style={{ display:"flex", gap:6, marginBottom:20,
        background:T.surface, borderRadius:14, padding:5 }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            style={{ flex:1, padding:"8px 4px", borderRadius:10, border:"none",
              cursor:"pointer",
              background: period===p.id ? T.amber : "transparent",
              color: period===p.id ? T.offWhite : T.muted,
              fontSize:11, fontWeight:700, fontFamily:T.fontSans }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Main earnings card */}
      <div style={{ background:"linear-gradient(145deg,#1a1a08,#0e1f10)",
        border:`1px solid ${T.emerald}33`, borderRadius:22, padding:"24px 20px",
        marginBottom:16, textAlign:"center" }}>
        <div style={{ color:T.muted, fontSize:12, marginBottom:8 }}>
          {period==="today"?"Today's Earnings":
           period==="week" ?"This Week":
           period==="month"?"This Month":"All Time Earnings"}
        </div>
        <div style={{ color:T.emerald, fontWeight:800, fontSize:42, lineHeight:1 }}>
          GHS {net.toFixed(2)}
        </div>
        <div style={{ color:T.muted, fontSize:12, marginTop:6 }}>
          your take-home after {earnings?.commission_rate || 10}% Glogo fee
        </div>
        <div style={{ display:"flex", justifyContent:"center", gap:24, marginTop:16 }}>
          <div>
            <div style={{ color:T.amber, fontWeight:800, fontSize:22 }}>{current.trips}</div>
            <div style={{ color:T.muted, fontSize:11 }}>trips</div>
          </div>
          <div style={{ width:1, background:T.surfaceMd }} />
          <div>
            <div style={{ color:T.charcoal, fontWeight:800, fontSize:22 }}>
              GHS {current.trips > 0 ? (net/current.trips).toFixed(2) : "0.00"}
            </div>
            <div style={{ color:T.muted, fontSize:11 }}>per trip avg</div>
          </div>
        </div>
      </div>

      {/* Earnings breakdown */}
      <div style={{ background:T.white, border:`1px solid ${T.surfaceMd}`,
        borderRadius:16, padding:"16px 18px", marginBottom:16 }}>
        <div style={{ color:T.muted, fontSize:11, fontWeight:700,
          letterSpacing:1, marginBottom:16 }}>EARNINGS BREAKDOWN</div>

        <div style={{ display:"flex", justifyContent:"space-between",
          padding:"10px 0", borderBottom:`1px solid ${T.surfaceMd}` }}>
          <span style={{ color:T.muted, fontSize:13 }}>Gross fares collected</span>
          <span style={{ color:T.charcoal, fontWeight:700 }}>GHS {gross.toFixed(2)}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between",
          padding:"10px 0", borderBottom:`1px solid ${T.surfaceMd}` }}>
          <span style={{ color:T.muted, fontSize:13 }}>
            Glogo fee ({earnings?.commission_rate || 10}%)
          </span>
          <span style={{ color:T.red, fontWeight:700 }}>− GHS {commission.toFixed(2)}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0" }}>
          <span style={{ color:T.offWhite, fontSize:14, fontWeight:800 }}>Your earnings</span>
          <span style={{ color:T.emerald, fontSize:16, fontWeight:800 }}>GHS {net.toFixed(2)}</span>
        </div>
      </div>

      {/* Comparison bars */}
      {earnings && (
        <div style={{ background:T.white, border:`1px solid ${T.surfaceMd}`,
          borderRadius:16, padding:"16px 18px", marginBottom:16 }}>
          <div style={{ color:T.muted, fontSize:11, fontWeight:700,
            letterSpacing:1, marginBottom:16 }}>EARNINGS COMPARISON</div>
          {[
            { label:"Today",     value:(earnings.today?.revenue||0)*(1-rate),  max:(earnings.month?.revenue||1)*(1-rate), color:T.amber  },
            { label:"This Week", value:(earnings.week?.revenue||0)*(1-rate),   max:(earnings.month?.revenue||1)*(1-rate), color:T.emerald },
            { label:"This Month",value:(earnings.month?.revenue||0)*(1-rate),  max:(earnings.month?.revenue||1)*(1-rate), color:"#9a7bfa" },
          ].map(b => <EarningBar key={b.label} {...b} />)}
        </div>
      )}

      {/* Trip history */}
      <div style={{ color:T.muted, fontSize:11, fontWeight:700,
        letterSpacing:1, marginBottom:12 }}>RECENT TRIPS</div>

      {trips.length === 0 ? (
        <div style={{ background:T.white, border:`1px solid ${T.surfaceMd}`,
          borderRadius:16, padding:"40px 20px", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🚌</div>
          <div style={{ color:T.offWhite, fontSize:15, fontWeight:700, marginBottom:6 }}>
            No trips yet
          </div>
          <div style={{ color:T.muted, fontSize:13 }}>
            Go live on the Drive tab to start earning
          </div>
        </div>
      ) : (
        trips.slice(0,10).map(t => (
          <div key={t.id}
            style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"12px 14px", borderRadius:12, marginBottom:8,
              background:T.white, border:`1px solid ${T.surfaceMd}` }}>
            <div>
              <div style={{ color:T.charcoal, fontSize:13, fontWeight:600 }}>
                🚌 {t.vehicle_code}
              </div>
              <div style={{ color:T.muted, fontSize:11, marginTop:2 }}>
                {t.passengers_count || 0} passengers ·{" "}
                {t.completed_at
                  ? new Date(t.completed_at).toLocaleDateString("en-GH",
                      { day:"numeric", month:"short" })
                  : "Active"}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:T.emerald, fontWeight:800, fontSize:14 }}>
                GHS {(parseFloat(t.fare||0) * (1-rate) * (t.passengers_count||1)).toFixed(2)}
              </div>
              <div style={{ color:T.muted, fontSize:10, marginTop:2 }}>
                {t.status}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
