import { Navigate, Outlet } from "react-router-dom";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

export function RequireAdmin() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-100">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/recherche" replace />;
  }

  return <Outlet />;
}
