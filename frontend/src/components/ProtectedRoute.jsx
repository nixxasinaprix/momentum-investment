import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#07080F] text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1E1723]/90 px-6 py-4 shadow-xl backdrop-blur-md">
          <Loader2 className="h-5 w-5 animate-spin text-[#F0867C]" />
          <span className="text-sm font-medium text-stone-200">Restoring session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
