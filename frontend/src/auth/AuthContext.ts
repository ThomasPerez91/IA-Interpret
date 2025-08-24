import { createContext, useContext } from "react";

export type User = {
  id: string;
  username: string;
  email: string;
  role: string;
};

export type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginWithPassword: (ident: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthState | null>(null);

/** Hook d’accès au contexte (peut être importé partout) */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
