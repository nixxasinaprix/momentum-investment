import { Link, useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck, Zap } from "lucide-react";
import SceneryBackground from "../components/SceneryBackground";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="dark relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#07080F] font-sans text-white antialiased">
      <div className="absolute inset-0 z-0">
        <SceneryBackground dark={true} />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-stone-900/70 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#F0867C] to-[#6E3559] shadow-md">
              <Zap className="h-5 w-5 text-white" fill="currentColor" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              Momentum Investment
            </span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-[#F0867C]/60 hover:bg-[#8C4570]"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </header>

      <section className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-[24px] border border-white/10 bg-[#1E1723]/90 p-8 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-[#F0867C]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Authenticated Session
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="mt-3 text-base text-stone-300">
            Signed in as <span className="font-semibold text-white">{user?.email}</span>
          </p>

          <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
            <Link
              to="/"
              className="text-sm font-medium text-stone-300 transition-colors hover:text-[#F0867C]"
            >
              Back to Market Insights
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full bg-[#8C4570] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#8C4570]/30 transition-all hover:bg-[#7A3B61]"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
