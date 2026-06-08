// services/api.js — Client HTTP centralisé (axios)
import axios from "axios";


const API = axios.create({
  baseURL: 'http://localhost:8000',  
});
/*const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 30000,
});*/

// Injection automatique du token JWT
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Déconnexion automatique si token expiré
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register    = (data)  => API.post("/auth/register", data);
export const login       = (data)  => API.post("/auth/login",    data);
export const getMe       = ()      => API.get("/auth/me");

// ── Prédiction ────────────────────────────────────────────────────────────────
export const predict     = (data)  => API.post("/predict",       data);

// ── Historique ────────────────────────────────────────────────────────────────
export const getHistorique = (page = 1, parPage = 10) =>
  API.get(`/historique?page=${page}&par_page=${parPage}`);
export const getStats      = () => API.get("/historique/stats");

export default API;
