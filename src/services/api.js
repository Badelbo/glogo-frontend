import axios from "axios";

const BASE = "https://glogo-backend.onrender.com";

const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("glogo_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  async err => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      try {
        const refresh = localStorage.getItem("glogo_refresh");
        if (!refresh) throw new Error("no refresh");
        const { data } = await axios.post(`${BASE}/api/auth/refresh`, { refreshToken: refresh });
        localStorage.setItem("glogo_token",   data.tokens.access);
        localStorage.setItem("glogo_refresh", data.tokens.refresh);
        orig.headers.Authorization = `Bearer ${data.tokens.access}`;
        return api(orig);
      } catch {
        localStorage.removeItem("glogo_token");
        localStorage.removeItem("glogo_refresh");
        window.location.href = "/";
      }
    }
    return Promise.reject(err);
  }
);

export const vehiclesAPI = {
  list: ()          => api.get("/vehicles"),
  get:  id          => api.get(`/vehicles/${id}`),
  updateStatus:(id,s)=> api.patch(`/vehicles/${id}/status`, { status:s }),
};
export const stopsAPI = { list: () => api.get("/stops") };
export const queueAPI = {
  join:     (vehicleId, stopId) => api.post("/queues/join", { vehicleId, stopId }),
  leave:    entryId             => api.delete(`/queues/${entryId}/leave`),
  myQueues: ()                  => api.get("/queues/my"),
  getQueue: (vehicleId, stopId) => api.get(`/queues/${vehicleId}/${stopId}`),
};
export const paymentsAPI = {
  initiate: (queueEntryId, method, phoneNumber) =>
    api.post("/payments/initiate", { queueEntryId, method, phoneNumber }),
  history: (page=1) => api.get(`/payments/history?page=${page}`),
};
export const notifAPI = {
  list:    (page=1) => api.get(`/notifications?page=${page}`),
  readAll: ()       => api.patch("/notifications/read-all"),
};
export const driverAPI = {
  me:           ()            => api.get("/drivers/me"),
  startTrip:    vehicleId     => api.post("/drivers/trips/start", { vehicleId }),
  completeTrip: (tripId, pax) => api.patch(`/drivers/trips/${tripId}/complete`, { passengersCount:pax }),
};

export default api;

export const userAPI = {
  me:             ()              => api.get("/users/me"),
  updateProfile:  (data)          => api.patch("/users/me", data),
  changePassword: (cur, newP)     => api.patch("/users/me/password", { currentPassword:cur, newPassword:newP }),
  deleteAccount:  (password)      => api.delete("/users/me", { data: { password } }),
  tripHistory:    (page=1)        => api.get(`/users/me/trips?page=${page}`),
};
