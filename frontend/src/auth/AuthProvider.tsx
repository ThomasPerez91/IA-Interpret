import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { AuthContext, type User } from "./AuthContext";

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token")
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync multi-onglets
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token") setToken(localStorage.getItem("token"));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Charger /auth/me si token
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        if (token) {
          const me = await api<User>("/auth/me");
          if (!ignore) setUser(me);
        } else {
          if (!ignore) setUser(null);
        }
      } catch {
        if (!ignore) {
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [token]);

  async function loginWithPassword(ident: string, password: string) {
    const body = new URLSearchParams();
    body.set("username", ident);
    body.set("password", password);

    const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) throw new Error("Invalid credentials");
    const data = (await res.json()) as { access_token: string };

    localStorage.setItem("token", data.access_token);
    setToken(data.access_token);

    const me = await api<User>("/auth/me");
    setUser(me);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, token, loading, loginWithPassword, logout }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
