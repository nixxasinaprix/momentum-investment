import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronDown,
  Compass,
  Filter,
  GitCompare,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { clearApiCache } from "../hooks/useCachedApi";
import { useWatchlist } from "../hooks/useWatchlist";
import { Badge, BrandMark, ThemeToggle } from "./ui";

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    document.title = title
      ? `${title} · Momentum Investment`
      : "Momentum Investment";
  }, [title]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const handleLogout = () => {
    clearApiCache();
    logout();
    navigate("/login", { replace: true });
  };

  const renderNavLinks = (onNavigate) => (
    <nav aria-label="Workspace navigation" className="flex-1 space-y-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-300 ${
                isActive
                  ? "border-brand-plum/30 bg-brand-plum text-stone-50 shadow-lg shadow-brand-plum/30 dark:border-brand-coral/35 dark:bg-brand-plumDark dark:shadow-brand-plumDark/30"
                  : "border-transparent text-stone-700 hover:bg-stone-200/60 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800/70 dark:hover:text-brand-coral"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? "text-stone-50 dark:text-brand-gold"
                        : "text-stone-500 dark:text-stone-400"
                    }`}
                  />
                  {item.label}
                </span>
                {item.to === "/watchlist" && watchlist.length > 0 && (
                  <Badge
                    variant={isActive ? "neutral" : "coral"}
                    size="xs"
                    className={
                      isActive
                        ? "border-stone-50/30 bg-stone-50/20 text-stone-50"
                        : ""
                    }
                  >
                    {watchlist.length}
                  </Badge>
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  const renderSidebarFooter = () => (
    <div className="border-t border-stone-200/70 p-4 dark:border-stone-800/70">
      <div className="rounded-xl border border-stone-200/90 bg-white/75 p-3 shadow-sm backdrop-blur-sm dark:border-stone-800 dark:bg-stone-800/60">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
          <Activity className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Benchmark: NIFTY 200</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
          Educational momentum research tool. Not investment advice.
        </p>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 flex min-h-[100dvh] font-sans text-stone-900 antialiased transition-colors duration-700 dark:text-stone-100">
      {/* Desktop sidebar */}
      <aside className="relative z-20 hidden w-64 shrink-0 flex-col border-r border-stone-200/70 bg-white/80 backdrop-blur-lg transition-colors duration-700 dark:border-stone-800/70 dark:bg-stone-900/80 lg:flex">
        <div className="flex h-16 items-center border-b border-stone-200/70 px-5 dark:border-stone-800/70">
          <Link to="/" className="min-w-0">
            <BrandMark title="Momentum Lab" subtitle="Nifty 500 Pipeline" />
          </Link>
        </div>

        {renderNavLinks(undefined)}
        {renderSidebarFooter()}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-stone-950/55 backdrop-blur-sm dark:bg-surface-night/80"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 flex w-72 max-w-[85vw] flex-col border-r border-stone-200 bg-surface-cream/95 shadow-2xl backdrop-blur-xl dark:border-stone-800 dark:bg-stone-900/95"
            >
              <div className="flex h-16 items-center justify-between border-b border-stone-200/80 px-5 dark:border-stone-800">
                <Link to="/" onClick={() => setMobileOpen(false)}>
                  <BrandMark size="sm" title="Momentum Lab" subtitle="Nifty 500" />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                  className="rounded-lg p-1.5 text-stone-600 transition hover:bg-stone-200/70 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-brand-coral"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {renderNavLinks(() => setMobileOpen(false))}
              {renderSidebarFooter()}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-x-clip">
        <header className="sticky top-0 z-30 border-b border-stone-200/60 bg-white/80 backdrop-blur-lg transition-colors duration-700 dark:border-stone-800/70 dark:bg-stone-900/80">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-full border border-stone-300 bg-white/85 p-2 text-stone-700 shadow-sm transition hover:border-brand-plum hover:text-brand-plum dark:border-stone-700 dark:bg-stone-800/85 dark:text-stone-300 dark:hover:border-brand-coral dark:hover:text-brand-coral lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate font-display text-lg font-bold tracking-tight sm:text-xl">
                  <span className="bg-gradient-to-r from-brand-plum via-brand-coral to-brand-gold bg-clip-text text-transparent dark:from-brand-coral dark:via-brand-gold dark:to-surface-cream">
                    {title}
                  </span>
                </h1>
                {subtitle && (
                  <p className="hidden truncate text-xs text-stone-600 dark:text-stone-400 sm:block">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
              {actions && (
                <div className="hidden sm:flex sm:items-center sm:gap-2">
                  {actions}
                </div>
              )}
              <ThemeToggle />

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-stone-300 bg-white/85 px-3 text-xs font-medium text-stone-700 shadow-sm backdrop-blur-sm transition-colors duration-300 hover:border-brand-plum dark:border-stone-700 dark:bg-stone-800/85 dark:text-stone-200 dark:hover:border-brand-coral"
                >
                  <Compass className="h-3.5 w-3.5 text-brand-plum dark:text-brand-coral" />
                  <span className="hidden max-w-[150px] truncate md:inline">
                    {user?.email || "Account"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-stone-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-lg dark:border-stone-800 dark:bg-stone-900/95"
                    >
                      <div className="border-b border-stone-200/80 px-3 py-2 dark:border-stone-800">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                          Signed in as
                        </div>
                        <div className="truncate text-xs font-semibold text-stone-900 dark:text-stone-100">
                          {user?.email}
                        </div>
                      </div>
                      <Link
                        to="/"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                      >
                        <Home className="h-3.5 w-3.5" />
                        Landing Page
                      </Link>
                      <Link
                        to="/watchlist"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                      >
                        <span className="flex items-center gap-2">
                          <Star className="h-3.5 w-3.5" />
                          Watchlist
                        </span>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400">
                          {watchlist.length}
                        </span>
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Log out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                aria-label="Log out"
                className="hidden h-9 items-center gap-1.5 rounded-full border border-stone-300 bg-white/85 px-3.5 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur-sm transition-colors duration-300 hover:border-brand-plum hover:text-brand-plum dark:border-stone-700 dark:bg-stone-800/85 dark:text-stone-200 dark:hover:border-brand-coral dark:hover:text-brand-coral sm:inline-flex"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log out</span>
              </button>
            </div>
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 border-t border-stone-200/60 px-4 py-2 dark:border-stone-800/60 sm:hidden">
              {actions}
            </div>
          )}
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0 w-full"
          >
            {children}
          </motion.div>
        </main>

        <footer className="border-t border-stone-200/70 bg-white/60 px-4 py-3 text-center text-[11px] text-stone-600 backdrop-blur-md transition-colors duration-700 dark:border-stone-800/70 dark:bg-stone-900/60 dark:text-stone-400 sm:px-6 lg:px-8">
          Educational quantitative momentum research workspace — not investment advice.
        </footer>
      </div>
    </div>
  );
}
