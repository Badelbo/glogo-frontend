import { T } from "../theme";
import React, { useState, useEffect } from "react";
import { queueAPI, paymentsAPI } from "../services/api";
import { getSocket } from "../services/socket";

const C = { gold:T.amber, green:T.emerald, red:T.red,
            card:T.white, border:T.surfaceMd, text:T.charcoal, sub:T.muted, dark:T.charcoal };

const METHODS = [
  { id:"mtn_momo",    label:"MTN Mobile Money",   icon:"📱", hint:"0244 *** 000" },
  { id:"airtel_money",label:"AirtelTigo Money",    icon:"📱", hint:"0500 *** 000" },
  { id:"visa",        label:"Visa / Mastercard",   icon:"💳", hint:"Card ending ****" },
];

export default function PayScreen({ onBack }) {
  const [myQueue,  setMyQueue]  = useState(null);
  const [method,   setMethod]   = useState("mtn_momo");
  const [phone,    setPhone]    = useState("");
  const [step,     setStep]     = useState("select"); // select | processing | done | error
  const [paymentId,setPaymentId]= useState(null);
  const [txnRef,   setTxnRef]   = useState(null);
  const [errMsg,   setErrMsg]   = useState("");

  useEffect(() => {
    queueAPI.myQueues().then(({ data }) => {
      setMyQueue(data.queues?.[0] || null);
    }).catch(() => {});

    const s = getSocket();
    if (s) {
      s.on("payment:success", ({ paymentId }) => {
        setPaymentId(paymentId);
        setStep("done");
      });
    }
    return () => { s?.off("payment:success"); };
  }, []);

  const pay = async () => {
    if (!myQueue) return;
    setStep("processing"); setErrMsg("");
    try {
      const { data } = await paymentsAPI.initiate(myQueue.id, method, phone || null);
      setPaymentId(data.paymentId);
      setTxnRef(data.paymentId?.slice(0,8).toUpperCase());
      // In sandbox, payment:success socket event arrives in ~2s
      // In production, it comes from the MTN/Airtel webhook
    } catch(e) {
      setErrMsg(e.response?.data?.error || "Payment failed. Please try again.");
      setStep("error");
    }
  };

  if (!myQueue && step === "select") return (
    <div style={{ padding:20 }}>
      <button onClick={onBack} style={{ background:"none",border:"none",color:T.amber,cursor:"pointer",
        fontSize:13,fontWeight:700,marginBottom:20,fontFamily:T.fontSans }}>← Back</button>
      <div style={{ background:T.white,border:`1px solid ${T.surfaceMd}`,borderRadius:18,
        padding:"40px 20px",textAlign:"center" }}>
        <div style={{ fontSize:48,marginBottom:16 }}>🎫</div>
        <div style={{ color:T.charcoal,fontSize:16,fontWeight:700,marginBottom:8 }}>No Active Queue</div>
        <div style={{ color:T.muted,fontSize:13 }}>Join a queue first before paying your fare</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding:20 }}>
      <button onClick={onBack} style={{ background:"none",border:"none",color:T.amber,cursor:"pointer",
        fontSize:13,fontWeight:700,marginBottom:20,display:"flex",alignItems:"center",gap:6,
        fontFamily:T.fontSans }}>← Back</button>

      {step === "done" && (
        <div style={{ textAlign:"center",paddingTop:20 }}>
          <div style={{ fontSize:72,marginBottom:16 }}>✅</div>
          <div style={{ color:T.emerald,fontWeight:800,fontSize:24,marginBottom:6 }}>Payment Confirmed!</div>
          <div style={{ color:T.muted,fontSize:14,marginBottom:24 }}>
            Akwaaba! 🇬🇭 Your boarding spot is secured.
          </div>
          <div style={{ background:T.emeraldLt,border:`1px solid ${T.emerald}44`,
            borderRadius:18,padding:22,textAlign:"left",marginBottom:24 }}>
            <div style={{ color:T.muted,fontSize:11,fontWeight:700,marginBottom:12,letterSpacing:1 }}>RECEIPT</div>
            {[
              ["Vehicle",  myQueue?.vehicle_code||"—"],
              ["Route",    myQueue?.route_name||"—"],
              ["Queue #",  `#${myQueue?.queue_number}`],
              ["Amount",   `GHS ${parseFloat(myQueue?.fare||0).toFixed(2)}`],
              ["Method",   METHODS.find(m=>m.id===method)?.label||method],
              ["TXN ID",   `GLG-${txnRef||"——————"}`],
            ].map(([k,v]) => (
              <div key={k} style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
                <span style={{ color:T.muted,fontSize:13 }}>{k}</span>
                <span style={{ color:k==="TXN ID"?T.amber:T.charcoal,fontSize:13,
                  fontWeight:k==="Amount"?800:600 }}>{v}</span>
              </div>
            ))}
          </div>
          <button onClick={onBack} style={{ width:"100%",padding:"14px",borderRadius:14,border:"none",
            background:`linear-gradient(135deg,${T.emerald},#145c2e)`,color:"#000",
            fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:T.fontSans }}>
            Back to Home
          </button>
        </div>
      )}

      {step === "processing" && (
        <div style={{ textAlign:"center",paddingTop:60 }}>
          <div style={{ fontSize:56,marginBottom:20 }}>⏳</div>
          <div style={{ color:T.charcoal,fontSize:18,fontWeight:700,marginBottom:8 }}>Processing Payment...</div>
          <div style={{ color:T.muted,fontSize:13 }}>
            {method==="mtn_momo"?"Check your MTN MoMo prompt":
             method==="airtel_money"?"Check your AirtelTigo prompt":
             "Verifying card payment..."}
          </div>
          <div style={{ marginTop:24,color:T.muted,fontSize:12 }}>Do not close this screen</div>
        </div>
      )}

      {(step === "select" || step === "error") && myQueue && (
        <>
          <div style={{ color:T.charcoal,fontSize:22,fontWeight:800,marginBottom:4 }}>Pay Your Fare</div>
          <div style={{ color:T.muted,fontSize:13,marginBottom:22 }}>
            Cashless — board faster, no cash needed
          </div>

          {/* Trip details */}
          <div style={{ background:T.white,border:`1px solid ${T.surfaceMd}`,borderRadius:16,padding:18,marginBottom:20 }}>
            <div style={{ color:T.muted,fontSize:11,fontWeight:700,marginBottom:10,letterSpacing:1 }}>TRIP DETAILS</div>
            <div style={{ color:T.charcoal,fontSize:14,fontWeight:700 }}>🚌 {myQueue.vehicle_code}</div>
            <div style={{ color:T.muted,fontSize:13,marginTop:4 }}>{myQueue.route_name}</div>
            <div style={{ color:T.muted,fontSize:13,marginTop:2 }}>
              Queue: <span style={{ color:T.amber,fontWeight:700 }}>#{myQueue.queue_number}</span>
            </div>
            <div style={{ borderTop:`1px solid ${T.surfaceMd}`,marginTop:14,paddingTop:14,
              display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span style={{ color:T.muted,fontSize:14 }}>Total Fare</span>
              <span style={{ color:T.amber,fontWeight:800,fontSize:26 }}>
                GHS {parseFloat(myQueue.fare||2.50).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment method */}
          <div style={{ color:T.muted,fontSize:11,fontWeight:700,marginBottom:10,letterSpacing:1 }}>PAYMENT METHOD</div>
          {METHODS.map(m => (
            <div key={m.id} onClick={()=>setMethod(m.id)} style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"14px 16px",borderRadius:12,marginBottom:8,cursor:"pointer",
              background:method===m.id?T.emeraldLt:T.white,
              border:`1px solid ${method===m.id?T.emerald+"55":T.surfaceMd}`,
              transition:"all 0.2s" }}>
              <div style={{ display:"flex",gap:12,alignItems:"center" }}>
                <span style={{ fontSize:22 }}>{m.icon}</span>
                <div>
                  <div style={{ color:T.charcoal,fontSize:13,fontWeight:600 }}>{m.label}</div>
                  <div style={{ color:T.muted,fontSize:11,marginTop:2 }}>{m.hint}</div>
                </div>
              </div>
              <div style={{ width:18,height:18,borderRadius:"50%",
                border:`2px solid ${method===m.id?T.emerald:T.surfaceMd}`,
                background:method===m.id?T.emerald:"transparent",
                display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s" }}>
                {method===m.id && <div style={{ width:6,height:6,borderRadius:"50%",background:"#000" }} />}
              </div>
            </div>
          ))}

          {/* Phone number for MoMo */}
          {(method==="mtn_momo"||method==="airtel_money") && (
            <div style={{ marginTop:12,marginBottom:4 }}>
              <label style={{ color:T.muted,fontSize:11,fontWeight:700,display:"block",marginBottom:6,letterSpacing:1 }}>
                MOBILE NUMBER TO CHARGE
              </label>
              <input
                value={phone} onChange={e=>setPhone(e.target.value)}
                placeholder="e.g. 0244000000"
                type="tel" inputMode="numeric"
                style={{ width:"100%",background:T.surface,border:`1px solid ${T.surfaceMd}`,
                  borderRadius:12,padding:"14px 16px",color:T.charcoal,fontSize:15,
                  fontFamily:T.fontSans,outline:"none" }} />
            </div>
          )}

          {step==="error" && (
            <div style={{ background:T.redLt,border:`1px solid ${T.red}44`,borderRadius:12,
              padding:"12px 16px",color:T.red,fontSize:13,marginTop:12 }}>
              ⚠️ {errMsg}
            </div>
          )}

          <button onClick={pay} style={{
            width:"100%",marginTop:20,padding:"16px",borderRadius:14,border:"none",
            background:`linear-gradient(135deg,${T.amber},#a07000)`,
            color:T.offWhite,fontSize:16,fontWeight:800,cursor:"pointer",
            fontFamily:T.fontSans,transition:"all 0.3s" }}>
            Pay GHS {parseFloat(myQueue.fare||2.50).toFixed(2)}
          </button>
        </>
      )}
    </div>
  );
}
