import { useAuth, type User } from "./AuthContext";

export function useAuthUser(): { user: User | null; loading: boolean } {
  const { user, loading } = useAuth();
  return { user, loading };
}

export function useIsAuthenticated(): {
  isAuthenticated: boolean;
  loading: boolean;
} {
  const { token, loading } = useAuth();
  return { isAuthenticated: Boolean(token), loading };
}

export function useRequireAuth(): User {
  const { user, token, loading } = useAuth();
  if (loading) throw new Error("Auth loading");
  if (!token || !user) throw new Error("Not authenticated");
  return user;
}
