import { T } from "../theme";
import React, { useState, useEffect } from "react";
import { queueAPI } from "../services/api";
import { getSocket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

const C = { gold:T.amber, green:T.emerald, red:T.red,
            card:T.white, border:T.surfaceMd, text:T.charcoal, sub:T.muted };

function QueueRow({ item, isMe }) {
  const statusMap = {
    boarding: { col:T.emerald,  label:"🟢 Boarding now" },
    ready:    { col:T.amber,   label:`🟡 Ready in ~${item.estimated_wait} min` },
    waiting:  { col:T.muted,    label:`⏳ ~${item.estimated_wait} min wait` },
    boarded:  { col:"#6b6b6b",label:"✅ Boarded" },
  };
  const s = statusMap[item.status] || statusMap.waiting;

  return (
    <div style={{ display:"flex",alignItems:"center",gap:14,
      padding:"14px 16px",borderRadius:14,marginBottom:8,
      background: isMe?"#08160a":T.white,
      border:`1px solid ${isMe?T.emerald+"55":T.surfaceMd}`,
      position:"relative",overflow:"hidden" }}>
      {isMe && <div style={{ position:"absolute",left:0,top:0,bottom:0,width:3,background:T.emerald }} />}
      <div style={{ width:42,height:42,borderRadius:10,flexShrink:0,
        background:isMe?T.emerald:T.surface,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontFamily:T.fontMono,fontWeight:800,fontSize:13,
        color:isMe?"#000":T.muted }}>#{item.queue_number}</div>
      <div style={{ flex:1 }}>
        <div style={{ color:isMe?T.emerald:T.charcoal,fontWeight:700,fontSize:14,
          display:"flex",alignItems:"center",gap:8 }}>
          {item.commuter_name || (isMe ? "You" : "Passenger")}
          {isMe && <span style={{ fontSize:10,background:T.emerald+"22",color:T.emerald,
            borderRadius:6,padding:"2px 7px",fontWeight:800 }}>YOU</span>}
        </div>
        <div style={{ color:s.col,fontSize:12,marginTop:3 }}>{s.label}</div>
      </div>
    </div>
  );
}

export default function QueueTab({ onNavigate }) {
  const { user } = useAuth();
  const [myQueues,  setMyQueues]  = useState([]);
  const [queueList, setQueueList] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const loadMy = async () => {
    try {
      const { data } = await queueAPI.myQueues();
      setMyQueues(data.queues || []);

      // Load queue detail for first active entry
      if (data.queues?.length) {
        const q = data.queues[0];
        const stopId = q.stop_id || q.stopId;
        if (q.vehicle_id && stopId) {
          const { data:ql } = await queueAPI.getQueue(q.vehicle_id, stopId);
          setQueueList(ql.queue || []);
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadMy();
    const iv = setInterval(loadMy, 10000);
    const s = getSocket();
    if (s) {
      s.on("queue:updated",  loadMy);
      s.on("queue:boarded",  loadMy);
      s.on("queue:joined",   loadMy);
    }
    return () => {
      clearInterval(iv);
      s?.off("queue:updated");
      s?.off("queue:boarded");
      s?.off("queue:joined");
    };
  }, []);

  if (loading) return <div style={{ padding:40,textAlign:"center",color:T.muted }}>Loading queue...</div>;

  const myEntry = myQueues[0];

  return (
    <div style={{ padding:20 }}>
      <div style={{ color:T.charcoal,fontSize:22,fontWeight:800,marginBottom:3 }}>Queue Status</div>

      {!myEntry ? (
        <div style={{ background:T.white,border:`1px solid ${T.surfaceMd}`,borderRadius:18,
          padding:"40px 20px",textAlign:"center",marginTop:20 }}>
          <div style={{ fontSize:48,marginBottom:16 }}>🎫</div>
          <div style={{ color:T.charcoal,fontSize:16,fontWeight:700,marginBottom:8 }}>No Active Queue</div>
          <div style={{ color:T.muted,fontSize:13,marginBottom:20 }}>Join a vehicle queue to see your position here</div>
          <button onClick={()=>onNavigate("home")} style={{
            background:`linear-gradient(135deg,${T.amber},#a07000)`,border:"none",
            borderRadius:12,padding:"12px 24px",color:"#000",fontWeight:800,
            fontSize:14,cursor:"pointer",fontFamily:T.fontSans }}>
            ⚡ Find a Bus
          </button>
        </div>
      ) : (
        <>
          {/* My spot card */}
          <div style={{ background:"#08160a",border:`1px solid ${T.emerald}44`,
            borderRadius:18,padding:18,marginBottom:20 }}>
            <div style={{ color:T.emerald,fontSize:11,fontWeight:700,marginBottom:10,letterSpacing:1 }}>YOUR SPOT</div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:T.fontMono,color:T.charcoal,
                  fontSize:40,fontWeight:700 }}>#{myEntry.queue_number}</div>
                <div style={{ color:T.muted,fontSize:13 }}>{myEntry.vehicle_code} · {myEntry.route_name}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:T.amber,fontWeight:800,fontSize:30 }}>
                  {myEntry.estimated_wait}<span style={{ fontSize:14,color:T.muted,fontWeight:400 }}>m</span>
                </div>
                <div style={{ color:T.muted,fontSize:11 }}>estimated wait</div>
              </div>
            </div>
            <div style={{ marginTop:12,padding:"10px 14px",background:"#0a1a0c",borderRadius:10,
              color:T.amber,fontSize:13 }}>
              💡 Leave home in ~{Math.max(0,myEntry.estimated_wait-5)} min to board just in time
            </div>
            <div style={{ display:"flex",gap:8,marginTop:12 }}>
              <button onClick={()=>onNavigate("pay")} style={{
                flex:1,padding:"11px",borderRadius:12,
                background:`linear-gradient(135deg,${T.emerald},#145c2e)`,
                border:"none",color:"#000",fontSize:13,fontWeight:800,
                cursor:"pointer",fontFamily:T.fontSans }}>💳 Pay Fare</button>
            </div>
          </div>

          {/* Full queue list */}
          <div style={{ color:T.muted,fontSize:11,fontWeight:700,marginBottom:10,letterSpacing:1 }}>
            QUEUE — {myEntry.stop_name || "Kejetia Terminal"}
          </div>
          {queueList.length === 0 ? (
            <div style={{ color:T.muted,textAlign:"center",padding:"20px 0",fontSize:13 }}>
              Queue data loading...
            </div>
          ) : (
            queueList.map(item => (
              <QueueRow
                key={item.queue_number}
                item={{ ...item, estimated_wait: item.estimated_wait || item.queue_number * 2 }}
                isMe={item.queue_number === myEntry.queue_number}
              />
            ))
          )}

          {/* Make sure current user appears even if not in list yet */}
          {queueList.length > 0 &&
           !queueList.find(q => q.queue_number === myEntry.queue_number) && (
            <QueueRow
              item={{ queue_number:myEntry.queue_number, status:myEntry.status||"waiting",
                estimated_wait:myEntry.estimated_wait, commuter_name:"You" }}
              isMe={true}
            />
          )}
        </>
      )}
    </div>
  );
}
