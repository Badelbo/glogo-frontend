import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { getSocket } from "./services/socket";
import { T } from "./theme";

import AuthScreen        from "./components/AuthScreen";
import HomeTab           from "./components/HomeTab";
import BusesTab          from "./components/BusesTab";
import QueueTab          from "./components/QueueTab";
import MapTab            from "./components/MapTab";
import AlertsTab         from "./components/AlertsTab";
import PayScreen         from "./components/PayScreen";
import DriverDashboard   from "./components/DriverDashboard";
import ProfileTab        from "./components/ProfileTab";
import AdminDashboard    from "./components/AdminDashboard";
import EarningsDashboard from "./components/EarningsDashboard";

function KenteStrip() {
  const cols = [T.kenteGold,T.kenteRed,T.kenteGreen,T.kenteGold,
                T.kenteDark,T.kenteGold,T.kenteGreen,T.kenteRed,T.kenteGold];
  return (
    <div style={{ display:"flex", height:3, width:"100%" }}>
      {cols.map((c,i) => <div key={i} style={{ flex:1, background:c }} />)}
    </div>
  );
}

const COMMUTER_TABS = [
  { id:"home",    icon:"🏠", label:"Home"    },
  { id:"buses",   icon:"🚌", label:"Buses"   },
  { id:"queue",   icon:"👥", label:"Queue"   },
  { id:"map",     icon:"🗺️", label:"Map"     },
  { id:"profile", icon:"👤", label:"Account" },
];

const DRIVER_TABS = [
  { id:"home",     icon:"🏠", label:"Home"     },
  { id:"driver",   icon:"🚌", label:"Drive"    },
  { id:"earnings", icon:"💰", label:"Earnings" },
  { id:"alerts",   icon:"🔔", label:"Alerts"   },
  { id:"profile",  icon:"👤", label:"Profile"  },
];

const ADMIN_TABS = [
  { id:"home",    icon:"🏠", label:"Home"  },
  { id:"admin",   icon:"⚙️", label:"Admin" },
  { id:"buses",   icon:"🚌", label:"Buses" },
  { id:"alerts",  icon:"🔔", label:"Alerts"},
  { id:"profile", icon:"👤", label:"Me"    },
];

function GlogoApp() {
  const { user, loading } = useAuth();

  // Restore tab and viewMode from localStorage on page refresh
  const [tab,      setTab]      = useState(() => localStorage.getItem("glogo_tab") || "home");
  const [screen,   setScreen]   = useState("tabs");
  const [unread,   setUnread]   = useState(0);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("glogo_viewmode") || "commuter");
  const [clock,    setClock]    = useState(new Date());

  // Persist tab whenever it changes
  useEffect(() => { localStorage.setItem("glogo_tab", tab); }, [tab]);

  // Persist viewMode whenever it changes
  useEffect(() => { localStorage.setItem("glogo_viewmode", viewMode); }, [viewMode]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    // Only set viewMode from role if no saved preference
    const saved = localStorage.getItem("glogo_viewmode");
    if (!saved) {
      if (user.role === "driver") setViewMode("driver");
      if (user.role === "admin")  setViewMode("admin");
    }
    // Commuters always stay in commuter mode
    if (user.role === "commuter") setViewMode("commuter");
    const s = getSocket();
    if (s) {
      s.on("notification:new", () => setUnread(u => u+1));
      s.on("payment:success",  () => setScreen("tabs"));
    }
    return () => { s?.off("notification:new"); s?.off("payment:success"); };
  }, [user]);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:T.offWhite, display:"flex",
      alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ width:56, height:56, borderRadius:T.rLg,
        background:`linear-gradient(135deg,${T.emerald},${T.forest})`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:26, boxShadow:`0 4px 14px ${T.emerald}44` }}>🚌</div>
      <div style={{ fontFamily:T.fontHead, fontWeight:900, fontSize:26,
        color:T.charcoal, letterSpacing:"-0.5px" }}>
        Glo<span style={{ color:T.emerald }}>go</span>
      </div>
      <div style={{ color:T.muted, fontSize:13, fontWeight:500,
        fontFamily:T.fontSans }}>
        {localStorage.getItem("glogo_token") ? "Restoring your session..." : "Loading..."}
      </div>
    </div>
  );

  if (!user) return <AuthScreen />;

  const tabs = viewMode==="admin"  ? ADMIN_TABS   :
               viewMode==="driver" ? DRIVER_TABS  : COMMUTER_TABS;

  const navigate = dest => {
    if (dest === "pay") { setScreen("pay"); return; }
    setScreen("tabs"); setTab(dest);
    if (dest === "alerts") setUnread(0);
  };

  const renderContent = () => {
    if (screen === "pay")     return <PayScreen onBack={() => setScreen("tabs")} />;
    if (tab === "admin")      return <AdminDashboard />;
    if (tab === "driver")     return <DriverDashboard />;
    if (tab === "earnings")   return <EarningsDashboard />;
    if (tab === "profile")    return <ProfileTab />;
    if (tab === "buses")      return <BusesTab />;
    if (tab === "queue")      return <QueueTab onNavigate={navigate} />;
    if (tab === "map")        return <MapTab />;
    if (tab === "alerts")     return <AlertsTab />;
    return <HomeTab onNavigate={navigate} />;
  };

  return (
    <div style={{ minHeight:"100vh", background:T.offWhite,
      color:T.charcoal, fontFamily:T.fontSans,
      maxWidth:430, margin:"0 auto",
      boxShadow:"0 0 60px rgba(0,0,0,0.08)",
      position:"relative" }}>

      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        button { transition: all 0.18s cubic-bezier(0.4,0,0.2,1); }
        button:hover { opacity: 0.92; }
        button:active { transform: scale(0.97); }
      `}</style>

      {/* PREMIUM TOP HEADER */}
      <div style={{ background:T.white,
        borderBottom:`1px solid ${T.surfaceMd}`,
        position:"sticky", top:0, zIndex:60,
        boxShadow:T.shadow }}>
        <KenteStrip />
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", padding:"10px 16px 10px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:T.rMd,
              background:`linear-gradient(135deg,${T.emerald},${T.forest})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:18, boxShadow:`0 2px 8px ${T.emerald}44` }}>🚌</div>
            <div>
              <div style={{ fontFamily:T.fontHead, fontWeight:900, fontSize:17,
                color:T.charcoal, letterSpacing:"-0.3px" }}>
                Glo<span style={{ color:T.emerald }}>go</span>
              </div>
              <div style={{ color:T.muted, fontSize:10, fontWeight:500 }}>
                🇬🇭 Ghana Transit · Live
              </div>
            </div>
          </div>

          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {/* View mode toggle */}
            {(user.role === "driver" || user.role === "admin") && (
              <div style={{ background:T.surface, borderRadius:T.rFull,
                padding:"3px", display:"flex", gap:2,
                border:`1px solid ${T.surfaceMd}` }}>
                {(user.role === "admin"
                  ? [["commuter","👤"],["admin","⚙️"]]
                  : [["commuter","👤"],["driver","🚌"]]
                ).map(([v,icon]) => (
                  <button key={v}
                    onClick={() => { setViewMode(v); setTab("home"); }}
                    style={{ padding:"4px 10px", borderRadius:T.rFull,
                      border:"none", cursor:"pointer",
                      background: viewMode===v
                        ? (v==="driver"||v==="admin" ? T.forest : T.emerald)
                        : "transparent",
                      color: viewMode===v ? T.white : T.muted,
                      fontSize:11, fontWeight:700, fontFamily:T.fontSans }}>
                    {icon}
                  </button>
                ))}
              </div>
            )}
            <div style={{ fontFamily:"'JetBrains Mono', monospace",
              color:T.muted, fontSize:11, fontWeight:400 }}>
              {clock.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ minHeight:"calc(100vh - 130px)", overflowY:"auto",
        paddingBottom:88, animation:"fadeUp 0.3s ease" }}>
        {renderContent()}
      </div>

      {/* PREMIUM BOTTOM NAV */}
      {screen !== "pay" && (
        <div style={{ position:"fixed", bottom:0, left:"50%",
          transform:"translateX(-50%)", width:"100%", maxWidth:430,
          background:`linear-gradient(180deg,transparent 0%,${T.white} 30%)`,
          paddingBottom:12, paddingTop:20 }}>
          <div style={{ margin:"0 12px", background:T.white,
            border:`1px solid ${T.surfaceMd}`,
            borderRadius:T.rXl, padding:"8px 4px", display:"flex",
            boxShadow:T.shadowLg }}>
            {tabs.map(t => {
              const active   = tab === t.id && screen === "tabs";
              const hasNotif = t.id === "alerts" && unread > 0;
              return (
                <button key={t.id} onClick={() => navigate(t.id)}
                  style={{ flex:1, padding:"8px 0", cursor:"pointer",
                    border:"none", position:"relative",
                    background: active
                      ? `${T.emeraldLt}`
                      : "transparent",
                    borderRadius:T.rMd,
                    margin:"0 3px" }}>
                  <div style={{ fontSize:18 }}>{t.icon}</div>
                  <div style={{ color: active ? T.emerald : T.ghost,
                    fontSize:9, marginTop:3, fontWeight:700,
                    fontFamily:T.fontSans, letterSpacing:"0.02em" }}>
                    {t.label}
                  </div>
                  {active && (
                    <div style={{ position:"absolute", bottom:0, left:"50%",
                      transform:"translateX(-50%)", width:20, height:2,
                      background:T.emerald, borderRadius:T.rFull }} />
                  )}
                  {hasNotif && (
                    <div style={{ position:"absolute", top:4, right:"18%",
                      width:8, height:8, borderRadius:"50%",
                      background:T.red, border:`2px solid ${T.white}` }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GlogoApp />
    </AuthProvider>
  );
}
