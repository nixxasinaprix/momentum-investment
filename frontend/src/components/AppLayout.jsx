import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BookOpen,
  Compass,
  Filter,
  GitCompare,
  LayoutDashboard,
  LogOut,
  Menu,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { clearApiCache } from "../hooks/useCachedApi";
import { useWatchlist } from "../hooks/useWatchlist";

const NAV_ITEMS = [
  { to: "/picks", label: "Today's Picks", icon: Sparkles },
  { to: "/strategy", label: "Strategy Builder", icon: SlidersHorizontal },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/screener", label: "Screener", icon: Filter },
  { to: "/compare", label: "Compare", icon: GitCompare },
  { to: "/backtest", label: "Backtest", icon: BarChart3 },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/watchlist", label: "Watchlist", icon: Star },
];

export default function AppLayout({ title, subtitle, actions, children }) {
  const { user, logout } = useAuth();
  const { watchlist } = useWatchlist();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.title = title
      ? `${title} · Momentum Investment`
      : "Momentum Investment";
  }, [title]);

  const handleLogout = () => {
    clearApiCache();
    logout();
    navigate("/login", { replace: true });
  };

  const renderNavLinks = (onNavigate) => (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "border border-[#F0867C]/35 bg-gradient-to-r from-[#8C4570]/45 to-[#F0867C]/15 text-white shadow-sm"
                  : "border border-transparent text-stone-400 hover:bg-white/[0.04] hover:text-stone-100"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </span>
            {item.to === "/watchlist" && watchlist.length > 0 && (
              <span className="rounded-full bg-[#F0867C]/20 px-2 py-0.5 text-[11px] font-semibold text-[#F0867C]">
                {watchlist.length}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="dark flex min-h-[100dvh] bg-[#07080F] font-sans text-white antialiased">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#0B0C16] lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#F0867C] to-[#6E3559] shadow-md">
              <Zap className="h-5 w-5 text-white" fill="currentColor" />
            </div>
            <div>
              <div className="font-display text-sm font-bold tracking-tight text-white">
                Momentum Lab
              </div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-[#F0867C]">
                Nifty 500 Pipeline
              </div>
            </div>
          </Link>
        </div>

        {renderNavLinks(undefined)}

        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-stone-300">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span>Benchmark: NIFTY 200</span>
            </div>
            <p className="mt-1 text-[11px] text-stone-500">
              Educational momentum research tool. Not investment advice.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex w-72 flex-col border-r border-white/10 bg-[#0B0C16]">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#F0867C] to-[#6E3559]">
                  <Zap className="h-4 w-4 text-white" fill="currentColor" />
                </div>
                <span className="font-display text-sm font-bold text-white">
                  Momentum Lab
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNavLinks(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07080F]/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-stone-300 hover:text-white lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate font-display text-lg font-bold tracking-tight text-white sm:text-xl">
                  {title}
                </h1>
                {subtitle && (
                  <p className="hidden truncate text-xs text-stone-400 sm:block">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
              {actions}
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-stone-300 md:flex">
                <Compass className="h-3.5 w-3.5 text-[#F0867C]" />
                <span className="max-w-[180px] truncate">{user?.email}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-200 transition hover:border-[#F0867C]/60 hover:bg-[#8C4570]/40 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
