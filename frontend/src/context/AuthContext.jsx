import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem("clinic-session");
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (_err) {
      localStorage.removeItem("clinic-session");
      return null;
    }
  });

  const login = (authResponse) => {
    const nextSession = {
      userId: authResponse.userId,
      fullName: authResponse.fullName,
      email: authResponse.email,
      phoneNumber: authResponse.phoneNumber,
      role: authResponse.role,
      token: authResponse.token,
    };
    setSession(nextSession);
    localStorage.setItem("clinic-session", JSON.stringify(nextSession));
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem("clinic-session");
  };

  const value = useMemo(() => ({ session, login, logout }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
