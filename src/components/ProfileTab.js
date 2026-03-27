import { T } from "../theme";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { userAPI } from "../services/api";

function Field({ label, value, onChange, type="text", placeholder }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", color:T.slate, fontSize:12,
        fontWeight:600, marginBottom:6, letterSpacing:"0.02em",
        fontFamily:T.fontSans }}>{label}</label>
      <input value={value} onChange={onChange} type={type}
        placeholder={placeholder}
        style={{ background:T.white, border:`1.5px solid ${T.surfaceMd}`,
          borderRadius:T.rMd, padding:"12px 14px", color:T.charcoal,
          fontSize:14, width:"100%", fontFamily:T.fontSans,
          outline:"none", boxSizing:"border-box" }} />
    </div>
  );
}

function AlertBox({ type, msg }) {
  if (!msg) return null;
  const isErr = type === "error";
  return (
    <div style={{ background: isErr ? T.redLt : T.emeraldLt,
      border:`1px solid ${isErr ? T.red+"33" : T.emerald+"44"}`,
      borderRadius:T.rMd, padding:"12px 16px", marginBottom:14,
      display:"flex", gap:8, alignItems:"center" }}>
      <span>{isErr ? "⚠️" : "✅"}</span>
      <span style={{ color: isErr ? T.red : T.forest, fontSize:13,
        fontWeight:500, fontFamily:T.fontSans }}>{msg}</span>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
      zIndex:200, display:"flex", alignItems:"center",
      justifyContent:"center", padding:20 }}>
      <div style={{ background:T.white, borderRadius:T.rXl, padding:"28px 24px",
        width:"100%", maxWidth:380, boxShadow:T.shadowLg }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:20 }}>
          <div style={{ fontFamily:T.fontHead, fontWeight:800, fontSize:18,
            color:T.charcoal }}>{title}</div>
          <button onClick={onClose}
            style={{ background:T.surface, border:"none", cursor:"pointer",
              width:32, height:32, borderRadius:T.rFull, fontSize:16,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:T.muted }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ProfileTab() {
  const { user, logout } = useAuth();
  const [trips,   setTrips]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);

  // Edit profile
  const [editName,  setEditName]  = useState(user?.name  || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [editMsg,   setEditMsg]   = useState({ type:"", text:"" });
  const [editLoad,  setEditLoad]  = useState(false);

  // Change password
  const [curPw,  setCurPw]  = useState("");
  const [newPw,  setNewPw]  = useState("");
  const [confPw, setConfPw] = useState("");
  const [pwMsg,  setPwMsg]  = useState({ type:"", text:"" });
  const [pwLoad, setPwLoad] = useState(false);

  // Delete account
  const [delPw,      setDelPw]      = useState("");
  const [delMsg,     setDelMsg]     = useState({ type:"", text:"" });
  const [delLoad,    setDelLoad]    = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  const loadTrips = useCallback(async () => {
    try {
      const BASE  = process.env.REACT_APP_API_URL || "";
      const token = localStorage.getItem("glogo_token");
      const res   = await fetch(`${BASE}/api/users/me/trips`, {
        headers: { Authorization:`Bearer ${token}` }
      });
      const data  = await res.json();
      setTrips(data.trips || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const saveProfile = async () => {
    setEditLoad(true); setEditMsg({ type:"", text:"" });
    try {
      await userAPI.updateProfile({ name:editName, email:editEmail });
      setEditMsg({ type:"success", text:"Profile updated!" });
      setTimeout(() => { setModal(null); setEditMsg({ type:"", text:"" }); }, 1500);
    } catch(e) {
      setEditMsg({ type:"error", text:e.response?.data?.error || "Failed to update." });
    } finally { setEditLoad(false); }
  };

  const changePassword = async () => {
    if (newPw !== confPw) { setPwMsg({ type:"error", text:"New passwords do not match." }); return; }
    if (newPw.length < 6) { setPwMsg({ type:"error", text:"Password must be at least 6 characters." }); return; }
    setPwLoad(true); setPwMsg({ type:"", text:"" });
    try {
      await userAPI.changePassword(curPw, newPw);
      setPwMsg({ type:"success", text:"Password changed!" });
      setCurPw(""); setNewPw(""); setConfPw("");
      setTimeout(() => { setModal(null); setPwMsg({ type:"", text:"" }); }, 1500);
    } catch(e) {
      setPwMsg({ type:"error", text:e.response?.data?.error || "Failed to change password." });
    } finally { setPwLoad(false); }
  };

  const deleteAccount = async () => {
    if (!delConfirm) { setDelConfirm(true); return; }
    if (!delPw) { setDelMsg({ type:"error", text:"Please enter your password." }); return; }
    setDelLoad(true); setDelMsg({ type:"", text:"" });
    try {
      await userAPI.deleteAccount(delPw);
      setDelMsg({ type:"success", text:"Account deleted. Goodbye!" });
      setTimeout(() => logout(), 2000);
    } catch(e) {
      setDelMsg({ type:"error", text:e.response?.data?.error || "Failed to delete account." });
    } finally { setDelLoad(false); }
  };

  const roleColor = { admin:"#7C3AED", driver:T.emerald, commuter:T.amber };
  const roleBg    = { admin:"#EDE9FE", driver:T.emeraldLt, commuter:T.amberLt };
  const statusColor = {
    waiting:T.muted, ready:T.amber, boarding:T.emerald,
    boarded:T.emerald, cancelled:T.red
  };

  return (
    <div style={{ background:T.offWhite, minHeight:"100vh",
      fontFamily:T.fontSans }}>

      {/* ── PROFILE HEADER ── */}
      <div style={{ background:T.white, padding:"24px 20px 20px",
        borderBottom:`1px solid ${T.surfaceMd}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:16,
          marginBottom:20 }}>
          <div style={{ width:64, height:64, borderRadius:T.rXl, flexShrink:0,
            background:`linear-gradient(135deg,${T.emerald},${T.forest})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:28, boxShadow:`0 4px 12px ${T.emerald}44` }}>
            {user?.role === "driver" ? "🚌" : user?.role === "admin" ? "⚙️" : "👤"}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:T.fontHead, fontWeight:800, fontSize:20,
              color:T.charcoal, marginBottom:2 }}>{user?.name}</div>
            <div style={{ color:T.muted, fontSize:13, fontWeight:500,
              marginBottom:8 }}>{user?.phone}</div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6,
              background:roleBg[user?.role] || T.surface,
              borderRadius:T.rFull, padding:"3px 12px" }}>
              <div style={{ width:6, height:6, borderRadius:"50%",
                background:roleColor[user?.role] || T.muted }} />
              <span style={{ color:roleColor[user?.role] || T.muted,
                fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.06em" }}>{user?.role}</span>
            </div>
          </div>
          <button onClick={() => {
            setEditName(user?.name || "");
            setEditEmail(user?.email || "");
            setModal("edit");
          }} style={{ background:T.emeraldLt, border:`1px solid ${T.emerald}44`,
            borderRadius:T.rMd, padding:"8px 16px", cursor:"pointer",
            color:T.emerald, fontSize:12, fontWeight:700,
            fontFamily:T.fontSans }}>Edit</button>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
          gap:10, paddingTop:16, borderTop:`1px solid ${T.surfaceMd}` }}>
          {[
            { label:"Trips",   value: loading ? "—" : trips.length },
            { label:"Member",  value: "Active" },
            { label:"Region",  value: "Ghana"  },
          ].map(s => (
            <div key={s.label} style={{ textAlign:"center" }}>
              <div style={{ fontFamily:T.fontHead, fontWeight:800, fontSize:16,
                color:T.charcoal }}>{s.value}</div>
              <div style={{ color:T.muted, fontSize:11, fontWeight:500,
                marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"20px 16px" }}>

        {/* ── ACCOUNT ACTIONS — shown prominently ── */}
        <div style={{ color:T.muted, fontSize:11, fontWeight:600,
          letterSpacing:"0.08em", textTransform:"uppercase",
          marginBottom:12 }}>Account</div>

        {/* Edit Profile */}
        <button onClick={() => {
          setEditName(user?.name || "");
          setEditEmail(user?.email || "");
          setModal("edit");
        }} style={{ width:"100%", display:"flex", alignItems:"center",
          gap:14, padding:"14px 16px", background:T.white, borderRadius:T.rMd,
          border:`1px solid ${T.surfaceMd}`, cursor:"pointer",
          boxShadow:T.shadow, marginBottom:8, textAlign:"left",
          fontFamily:T.fontSans }}>
          <div style={{ width:40, height:40, borderRadius:T.rMd, flexShrink:0,
            background:T.emeraldLt, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:18 }}>✏️</div>
          <div style={{ flex:1 }}>
            <div style={{ color:T.charcoal, fontSize:14, fontWeight:600 }}>Edit Profile</div>
            <div style={{ color:T.muted, fontSize:12, marginTop:1 }}>Update your name and email</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke={T.muted} strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Change Password */}
        <button onClick={() => {
          setCurPw(""); setNewPw(""); setConfPw("");
          setModal("password");
        }} style={{ width:"100%", display:"flex", alignItems:"center",
          gap:14, padding:"14px 16px", background:T.white, borderRadius:T.rMd,
          border:`1px solid ${T.surfaceMd}`, cursor:"pointer",
          boxShadow:T.shadow, marginBottom:20, textAlign:"left",
          fontFamily:T.fontSans }}>
          <div style={{ width:40, height:40, borderRadius:T.rMd, flexShrink:0,
            background:T.emeraldLt, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:18 }}>🔑</div>
          <div style={{ flex:1 }}>
            <div style={{ color:T.charcoal, fontSize:14, fontWeight:600 }}>Change Password</div>
            <div style={{ color:T.muted, fontSize:12, marginTop:1 }}>Update your login password</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke={T.muted} strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* ── SIGN OUT — big and clear ── */}
        <button onClick={() => setModal("logout")}
          style={{ width:"100%", padding:"15px", borderRadius:T.rMd,
            border:`1.5px solid ${T.surfaceMd}`, cursor:"pointer",
            background:T.white, color:T.charcoal, fontSize:15,
            fontWeight:700, fontFamily:T.fontSans, marginBottom:12,
            display:"flex", alignItems:"center", justifyContent:"center",
            gap:10, boxShadow:T.shadow }}>
          <span style={{ fontSize:18 }}>🚪</span> Sign Out
        </button>

        {/* ── TRIP HISTORY ── */}
        <div style={{ color:T.muted, fontSize:11, fontWeight:600,
          letterSpacing:"0.08em", textTransform:"uppercase",
          marginBottom:12, marginTop:4 }}>Trip History</div>

        {loading ? (
          <div style={{ color:T.muted, textAlign:"center",
            padding:"20px 0", fontSize:13 }}>Loading trips...</div>
        ) : trips.length === 0 ? (
          <div style={{ background:T.white, border:`1px solid ${T.surfaceMd}`,
            borderRadius:T.rLg, padding:"40px 20px", textAlign:"center",
            boxShadow:T.shadow, marginBottom:20 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🎫</div>
            <div style={{ color:T.charcoal, fontSize:15, fontWeight:700,
              marginBottom:6 }}>No Trips Yet</div>
            <div style={{ color:T.muted, fontSize:13 }}>
              Join a queue to see your trip history here
            </div>
          </div>
        ) : (
          <div style={{ marginBottom:20 }}>
            {trips.slice(0, 8).map(t => (
              <div key={t.id} style={{ background:T.white,
                border:`1px solid ${T.surfaceMd}`, borderRadius:T.rMd,
                padding:"14px 16px", marginBottom:8, boxShadow:T.shadow }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ color:T.charcoal, fontWeight:700, fontSize:14 }}>
                      🚌 {t.vehicle_code || "Vehicle"} #{t.queue_number}
                    </div>
                    <div style={{ color:T.muted, fontSize:12, marginTop:3 }}>
                      {t.route_name || "—"}
                    </div>
                    <div style={{ color:T.ghost, fontSize:11, marginTop:2 }}>
                      {t.joined_at ? new Date(t.joined_at).toLocaleDateString("en-GH",
                        { day:"numeric", month:"short", year:"numeric" }) : "—"}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ color:statusColor[t.status] || T.muted,
                      fontSize:11, fontWeight:700, textTransform:"uppercase",
                      marginBottom:4 }}>{t.status}</div>
                    {t.amount && (
                      <div style={{ color:T.emerald, fontWeight:800,
                        fontSize:14 }}>
                        GHS {parseFloat(t.amount).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── DELETE ACCOUNT — at bottom in red ── */}
        <div style={{ color:T.muted, fontSize:11, fontWeight:600,
          letterSpacing:"0.08em", textTransform:"uppercase",
          marginBottom:12 }}>Danger Zone</div>

        <button onClick={() => {
          setDelPw(""); setDelConfirm(false);
          setDelMsg({ type:"", text:"" });
          setModal("delete");
        }} style={{ width:"100%", padding:"14px", borderRadius:T.rMd,
          border:`1.5px solid ${T.red}33`, cursor:"pointer",
          background:T.redLt, color:T.red, fontSize:14,
          fontWeight:700, fontFamily:T.fontSans, marginBottom:24,
          display:"flex", alignItems:"center", justifyContent:"center",
          gap:10 }}>
          <span style={{ fontSize:18 }}>🗑️</span> Delete Account
        </button>

        <div style={{ textAlign:"center", paddingBottom:8 }}>
          <div style={{ color:T.ghost, fontSize:11 }}>
            Glogo · Ghana Transit Platform · glogogh.com
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}

      {modal === "edit" && (
        <Modal title="Edit Profile" onClose={() => setModal(null)}>
          <AlertBox type={editMsg.type} msg={editMsg.text} />
          <Field label="Full name" value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="Your full name" />
          <Field label="Email (optional)" value={editEmail}
            onChange={e => setEditEmail(e.target.value)}
            type="email" placeholder="your@email.com" />
          <button onClick={saveProfile} disabled={editLoad}
            style={{ width:"100%", padding:"13px", borderRadius:T.rMd,
              border:"none", cursor: editLoad ? "not-allowed" : "pointer",
              background: editLoad ? T.surfaceMd
                : `linear-gradient(135deg,${T.emerald},${T.forest})`,
              color: editLoad ? T.muted : T.white,
              fontSize:14, fontWeight:700, fontFamily:T.fontSans }}>
            {editLoad ? "Saving..." : "Save Changes"}
          </button>
        </Modal>
      )}

      {modal === "password" && (
        <Modal title="Change Password" onClose={() => setModal(null)}>
          <AlertBox type={pwMsg.type} msg={pwMsg.text} />
          <Field label="Current password" value={curPw}
            onChange={e => setCurPw(e.target.value)}
            type="password" placeholder="Your current password" />
          <Field label="New password" value={newPw}
            onChange={e => setNewPw(e.target.value)}
            type="password" placeholder="At least 6 characters" />
          <Field label="Confirm new password" value={confPw}
            onChange={e => setConfPw(e.target.value)}
            type="password" placeholder="Repeat new password" />
          <button onClick={changePassword} disabled={pwLoad}
            style={{ width:"100%", padding:"13px", borderRadius:T.rMd,
              border:"none", cursor: pwLoad ? "not-allowed" : "pointer",
              background: pwLoad ? T.surfaceMd
                : `linear-gradient(135deg,${T.emerald},${T.forest})`,
              color: pwLoad ? T.muted : T.white,
              fontSize:14, fontWeight:700, fontFamily:T.fontSans }}>
            {pwLoad ? "Changing..." : "Change Password"}
          </button>
        </Modal>
      )}

      {modal === "logout" && (
        <Modal title="Sign Out" onClose={() => setModal(null)}>
          <div style={{ textAlign:"center", padding:"8px 0 20px" }}>
            <div style={{ fontSize:52, marginBottom:14 }}>🚪</div>
            <div style={{ color:T.charcoal, fontSize:15, fontWeight:700,
              fontFamily:T.fontHead, marginBottom:8 }}>
              Sign out of Glogo?
            </div>
            <div style={{ color:T.muted, fontSize:13, marginBottom:24,
              lineHeight:1.6 }}>
              You will need to sign in again to join queues and track vehicles.
            </div>
            <button onClick={logout}
              style={{ width:"100%", padding:"14px", borderRadius:T.rMd,
                border:"none", cursor:"pointer",
                background:`linear-gradient(135deg,${T.emerald},${T.forest})`,
                color:T.white, fontSize:15, fontWeight:700,
                fontFamily:T.fontSans, marginBottom:10,
                boxShadow:`0 3px 10px ${T.emerald}44` }}>
              Yes, Sign Out
            </button>
            <button onClick={() => setModal(null)}
              style={{ width:"100%", padding:"12px", borderRadius:T.rMd,
                border:`1.5px solid ${T.surfaceMd}`, cursor:"pointer",
                background:T.white, color:T.slate,
                fontSize:14, fontWeight:600, fontFamily:T.fontSans }}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {modal === "delete" && (
        <Modal title="Delete Account" onClose={() => setModal(null)}>
          <div style={{ background:T.redLt, border:`1px solid ${T.red}22`,
            borderRadius:T.rMd, padding:"14px", marginBottom:16 }}>
            <div style={{ color:T.red, fontWeight:700, fontSize:13,
              marginBottom:4 }}>⚠️ This cannot be undone</div>
            <div style={{ color:T.red, fontSize:12, lineHeight:1.6 }}>
              Your account, trip history, and all data will be permanently removed.
            </div>
          </div>

          <AlertBox type={delMsg.type} msg={delMsg.text} />

          {!delConfirm ? (
            <>
              <button onClick={() => setDelConfirm(true)}
                style={{ width:"100%", padding:"13px", borderRadius:T.rMd,
                  border:`1.5px solid ${T.red}`, cursor:"pointer",
                  background:T.redLt, color:T.red,
                  fontSize:14, fontWeight:700, fontFamily:T.fontSans,
                  marginBottom:10 }}>
                Yes, delete my account
              </button>
              <button onClick={() => setModal(null)}
                style={{ width:"100%", padding:"12px", borderRadius:T.rMd,
                  border:`1.5px solid ${T.surfaceMd}`, cursor:"pointer",
                  background:T.white, color:T.slate,
                  fontSize:14, fontWeight:600, fontFamily:T.fontSans }}>
                Cancel — Keep my account
              </button>
            </>
          ) : (
            <>
              <div style={{ color:T.slate, fontSize:13, marginBottom:14,
                fontFamily:T.fontSans, fontWeight:500 }}>
                Enter your password to confirm permanent deletion:
              </div>
              <Field label="Your password" value={delPw}
                onChange={e => setDelPw(e.target.value)}
                type="password" placeholder="Enter your password" />
              <button onClick={deleteAccount}
                disabled={delLoad || !delPw}
                style={{ width:"100%", padding:"13px", borderRadius:T.rMd,
                  border:"none", marginBottom:10,
                  cursor: (!delPw || delLoad) ? "not-allowed" : "pointer",
                  background: (!delPw || delLoad) ? T.surfaceMd : T.red,
                  color: (!delPw || delLoad) ? T.muted : T.white,
                  fontSize:14, fontWeight:700, fontFamily:T.fontSans }}>
                {delLoad ? "Deleting..." : "Permanently Delete Account"}
              </button>
              <button onClick={() => { setDelConfirm(false); setDelPw(""); }}
                style={{ width:"100%", padding:"12px", borderRadius:T.rMd,
                  border:`1.5px solid ${T.surfaceMd}`, cursor:"pointer",
                  background:T.white, color:T.slate,
                  fontSize:14, fontWeight:600, fontFamily:T.fontSans }}>
                ← Go Back
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
