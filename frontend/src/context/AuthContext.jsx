// context/AuthContext.jsx — Gestion globale de l'authentification
import { createContext, useContext, useState, useEffect } from "react";
import { getMe, login as apiLogin, register as apiRegister } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Restaurer la session au chargement
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      getMe()
        .then((r) => setUser(r.data))
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, mot_de_passe) => {
    const { data } = await apiLogin({ email, mot_de_passe });
    localStorage.setItem("token", data.access_token);
    const me = await getMe();
    setUser(me.data);
    return me.data;
  };

  const register = async (nom, prenom, email, mot_de_passe) => {
    await apiRegister({ nom, prenom, email, mot_de_passe });
    return login(email, mot_de_passe);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
