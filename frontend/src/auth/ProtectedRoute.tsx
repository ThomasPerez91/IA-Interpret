import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { JSX } from "react";

type Props = {
  children: JSX.Element;
};

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 24, opacity: 0.7 }}>Chargement…</div>;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};
