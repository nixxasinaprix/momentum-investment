import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center bg-surface-cream text-stone-900 transition-colors duration-700 dark:bg-surface-night dark:text-stone-100">
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white/85 px-6 py-4 shadow-xl backdrop-blur-md dark:border-stone-800 dark:bg-surface-cardDark/90">
          <Loader2 className="h-5 w-5 animate-spin text-brand-plum dark:text-brand-coral" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
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
