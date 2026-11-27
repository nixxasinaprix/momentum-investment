import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center text-[var(--text-primary)] transition-colors duration-700">
        <div className="lab-card flex items-center gap-3 rounded-2xl px-6 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-brand-plum dark:text-brand-coral" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Restoring session...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
