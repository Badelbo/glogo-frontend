import { T } from "../theme";
import React, { useState, useEffect } from "react";
import { notifAPI } from "../services/api";
import { getSocket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

const C = { gold:T.amber, green:T.emerald, red:T.red,
            card:T.white, border:T.surfaceMd, text:T.charcoal, sub:T.muted,
            dark:T.charcoal };

const TYPE_CONFIG = {
  vehicle_arriving: { icon:"🚌", bg:T.emeraldLt, border:T.emerald },
  queue_ready:      { icon:"✅", bg:T.emeraldLt, border:T.emerald },
  payment_success:  { icon:"💳", bg:T.emeraldLt, border:T.emerald },
  payment_failed:   { icon:"❌", bg:T.redLt, border:T.red   },
  trip_update:      { icon:"📍", bg:T.emeraldLt, border:T.emerald },
  system:           { icon:"📢", bg:T.amberLt, border:T.amber  },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff/60000);
  if (min < 1)  return "Just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min/60);
  if (h < 24)   return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

// Welcome notification shown once to new users
function WelcomeNotif({ name }) {
  return (
    <div style={{ background:T.emeraldLt, border:`1px solid ${T.emerald}44`,
      borderRadius:14, padding:"16px", marginBottom:10 }}>
      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
        <span style={{ fontSize:24 }}>🎉</span>
        <div>
          <div style={{ color:T.charcoal, fontWeight:700, fontSize:14, marginBottom:4 }}>
            Welcome to Glogo, {name}!
          </div>
          <div style={{ color:T.muted, fontSize:13, lineHeight:1.6, marginBottom:10 }}>
            You are now part of Ghana's smartest transit network. Here is how to get started:
          </div>
          {[
            "Go to Home tab → pick a vehicle → tap Join Queue",
            "We track the bus live and tell you when to leave",
            "Pay your fare by MoMo when you board",
            "Check this Alerts tab for live queue updates",
          ].map((tip, i) => (
            <div key={i} style={{ display:"flex", gap:10, marginBottom:8, alignItems:"flex-start" }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:T.amber,
                display:"flex", alignItems:"center", justifyContent:"center",
                color:T.offWhite, fontWeight:800, fontSize:10, flexShrink:0 }}>{i+1}</div>
              <div style={{ color:T.charcoal, fontSize:12, lineHeight:1.5 }}>{tip}</div>
            </div>
          ))}
          <div style={{ marginTop:10, color:T.amber, fontSize:11 }}>
            🇬🇭 Glogo — Making Transit Smarter, One Queue at a Time
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertsTab() {
  const { user } = useAuth();
  const [notifs,  setNotifs]  = useState([]);
  const [unread,  setUnread]  = useState(0);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Show welcome card for new users (registered in last 5 minutes)
    if (user?.created_at) {
      const age = Date.now() - new Date(user.created_at).getTime();
      if (age < 5 * 60 * 1000) setShowWelcome(true);
    }
    // Also show if they have never seen it
    const seen = localStorage.getItem("glogo_alerts_welcome");
    if (!seen) { setShowWelcome(true); localStorage.setItem("glogo_alerts_welcome","1"); }
  }, [user]);

  const load = async () => {
    try {
      const { data } = await notifAPI.list();
      setNotifs(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const s = getSocket();
    if (s) {
      s.on("notification:new", n => {
        setNotifs(prev => [n, ...prev]);
        setUnread(u => u+1);
      });
    }
    return () => { s?.off("notification:new"); };
  }, []);

  const markAllRead = async () => {
    try {
      await notifAPI.readAll();
      setNotifs(prev => prev.map(n => ({ ...n, is_read:true })));
      setUnread(0);
    } catch {}
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:T.muted }}>Loading alerts...</div>;

  return (
    <div style={{ padding:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ color:T.charcoal, fontSize:22, fontWeight:800 }}>Alerts</div>
          {unread > 0 && <div style={{ color:T.muted, fontSize:13 }}>{unread} unread</div>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            style={{ background:"none", border:`1px solid ${T.surfaceMd}`, borderRadius:10,
              color:T.muted, fontSize:12, padding:"6px 12px", cursor:"pointer",
              fontFamily:T.fontSans }}>Mark all read</button>
        )}
      </div>

      {/* Welcome card for new users */}
      {showWelcome && <WelcomeNotif name={user?.name?.split(" ")[0] || "there"} />}

      {notifs.length === 0 && !showWelcome ? (
        <div style={{ background:T.white, border:`1px solid ${T.surfaceMd}`, borderRadius:18,
          padding:"60px 20px", textAlign:"center", marginTop:10 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔔</div>
          <div style={{ color:T.charcoal, fontSize:16, fontWeight:700, marginBottom:8 }}>
            No Alerts Yet
          </div>
          <div style={{ color:T.muted, fontSize:13, lineHeight:1.6 }}>
            Join a queue on the Home tab to start receiving live alerts about your bus.
          </div>
        </div>
      ) : (
        notifs.map(n => {
          const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
          return (
            <div key={n.id}
              style={{ display:"flex", gap:12, padding:"14px 16px", borderRadius:14,
                marginBottom:10, background:cfg.bg,
                border:`1px solid ${cfg.border}22`, opacity:n.is_read?0.7:1 }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{cfg.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ color:T.charcoal, fontWeight:700, fontSize:14 }}>{n.title}</div>
                <div style={{ color:T.muted, fontSize:13, marginTop:3, lineHeight:1.5 }}>{n.body}</div>
                <div style={{ color:T.muted, fontSize:11, marginTop:6,
                  display:"flex", alignItems:"center", gap:8 }}>
                  {timeAgo(n.sent_at)}
                  {!n.is_read && (
                    <span style={{ width:6, height:6, background:T.amber,
                      borderRadius:"50%", display:"inline-block" }} />
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
