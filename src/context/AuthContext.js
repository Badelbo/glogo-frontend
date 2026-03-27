import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { connectSocket, disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);
const BASE = "https://glogo-backend.onrender.com";

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Wake up backend on app start
  useEffect(() => {
    fetch(`${BASE}/health`, { method:"GET" })
      .catch(() => {}); // silent — just wakes Render
  }, []);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("glogo_token");
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await axios.get(`${BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      setUser(data.user);
      connectSocket(token);
    } catch(err) {
      // Only log out if explicitly unauthorized (401)
      // Network errors or timeouts should keep the user logged in
      if (err.response && err.response.status === 401) {
        localStorage.removeItem("glogo_token");
        localStorage.removeItem("glogo_refresh");
      } else {
        // Network error — use cached token, set a minimal user object
        // so the app still shows instead of going to landing page
        const savedUser = localStorage.getItem("glogo_user");
        if (savedUser) {
          try { setUser(JSON.parse(savedUser)); connectSocket(token); } catch {}
        }
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (phone, password) => {
    const { data } = await axios.post(`${BASE}/api/auth/login`, { phone, password });
    localStorage.setItem("glogo_token",   data.tokens.access);
    localStorage.setItem("glogo_refresh", data.tokens.refresh);
    setUser(data.user);
    localStorage.setItem("glogo_user", JSON.stringify(data.user));
    connectSocket(data.tokens.access);
    return data.user;
  };

  const register = async (form) => {
    const { data } = await axios.post(`${BASE}/api/auth/register`, form);
    localStorage.setItem("glogo_token",   data.tokens.access);
    localStorage.setItem("glogo_refresh", data.tokens.refresh);
    setUser(data.user);
    localStorage.setItem("glogo_user", JSON.stringify(data.user));
    connectSocket(data.tokens.access);
    return data.user;
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("glogo_token");
      if (token) await axios.post(`${BASE}/api/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {}
    localStorage.removeItem("glogo_token");
    localStorage.removeItem("glogo_refresh");
    localStorage.removeItem("glogo_user");
    localStorage.removeItem("glogo_tab");
    localStorage.removeItem("glogo_viewmode");
    localStorage.removeItem("glogo_welcome_seen");
    localStorage.removeItem("glogo_alerts_welcome");
    disconnectSocket();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
