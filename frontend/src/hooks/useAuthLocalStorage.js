import { useMemo } from "react";
import { jwtDecode } from "jwt-decode";

export function useAuth() {
  const token = localStorage.getItem("access_token");

  const auth = useMemo(() => {
    if (!token) return { isAuthenticated: false, role: null, userId: null };

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;

      if (decoded.exp < now) {
        // Token vencido
        localStorage.removeItem("access_token") 
        return { isAuthenticated: false, role: null, userId: null };
      }

      return {
        isAuthenticated: true,
        role: decoded.role || "user",
        userId: decoded.sub || null,
      };
    } catch (err) {
      console.error("Token inválido", err);
      return { isAuthenticated: false, role: null, userId: null };
    }
  }, [token]);

  return auth;
}
