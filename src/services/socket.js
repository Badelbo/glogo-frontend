import { io } from "socket.io-client";

const WS_URL = "https://glogo-backend.onrender.com";
let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;
  socket = io(WS_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });
  socket.on("connect",       () => console.log("🔌 Socket connected"));
  socket.on("disconnect",    r  => console.log("🔌 Disconnected:", r));
  socket.on("connect_error", e  => console.warn("🔌 Socket error:", e.message));
  return socket;
}

export function disconnectSocket()  { socket?.disconnect(); socket = null; }
export function getSocket()         { return socket; }
export function watchVehicle(id)    { socket?.emit("watch:vehicle", id); }
export function unwatchVehicle(id)  { socket?.emit("unwatch:vehicle", id); }
export function driverOnline(vid)   { socket?.emit("driver:online",    { vehicleId: vid }); }
export function driverOffline(vid)  { socket?.emit("driver:offline",   { vehicleId: vid }); }
export function driverLocation(d)   { socket?.emit("driver:location",  d); }
export function driverPassengers(d) { socket?.emit("driver:passengers", d); }
