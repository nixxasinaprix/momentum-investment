import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronDown,
  Filter,
  GitCompare,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { clearApiCache } from "../hooks/useCachedApi";
import { useWatchlist } from "../hooks/useWatchlist";
import { Badge, BrandMark, ThemeToggle } from "./ui";

const NAV_ITEMS = [
  { to: "/picks", label: "Today's Picks", icon: Sparkles, iconColor: "text-brand-gold" },
  { to: "/strategy", label: "Strategy Builder", icon: SlidersHorizontal, iconColor: "text-brand-coral" },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, iconColor: "text-brand-mauve" },
  { to: "/screener", label: "Screener", icon: Filter, iconColor: "text-brand-gold" },
  { to: "/compare", label: "Compare", icon: GitCompare, iconColor: "text-brand-coral" },
  { to: "/backtest", label: "Backtest", icon: BarChart3, iconColor: "text-brand-mauve" },
  { to: "/learn", label: "Learn", icon: BookOpen, iconColor: "text-brand-gold" },
  { to: "/watchlist", label: "Watchlist", icon: Star, iconColor: "text-brand-coral" },
];

export default function AppLayout({ title, subtitle, actions, children }) {
  const { user, logout } = useAuth();
  const { watchlist } = useWatchlist();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = quickSearch.trim();
    if (!q) {
      navigate("/screener");
      return;
    }
    navigate(`/screener?q=${encodeURIComponent(q)}`);
  };

  const renderNavLinks = (onNavigate) => (
    <nav aria-label="Workspace navigation" className="flex-1 space-y-1.5 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-full px-4 py-2.5 text-sm transition-all duration-200 ${
                isActive ? "lab-nav-active" : "lab-nav-item font-medium"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? "text-[#3B1F4E] dark:text-surface-cream"
                        : item.iconColor
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {item.to === "/watchlist" && watchlist.length > 0 && (
                  <Badge
                    variant={isActive ? "plum" : "gold"}
                    size="xs"
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
    <div className="border-t border-[var(--border-sidebar)] p-4">
      <div
        className="rounded-2xl border border-brand-coral/35 p-3.5 shadow-lg"
        style={{
          background:
            "linear-gradient(135deg, rgba(240,134,124,0.24) 0%, rgba(110,53,89,0.45) 55%, rgba(227,200,125,0.2) 100%)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-coral to-brand-gold text-[#3B1F4E] shadow-md">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-surface-cream">
              {user?.email || "Researcher"}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-brand-gold">
              <Activity className="h-3 w-3 text-emerald-300" />
              <span>Benchmark: NIFTY 200</span>
            </div>
          </div>
        </div>
        <p className="mt-2.5 border-t border-brand-coral/25 pt-2 text-[11px] leading-snug text-surface-cream/85">
          Educational tool, not investment advice.
        </p>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 flex min-h-[100dvh] font-sans text-[var(--text-primary)] antialiased transition-colors duration-700">
      {/* Desktop sidebar */}
      <aside className="lab-sidebar relative z-20 hidden w-64 shrink-0 flex-col lg:flex">
        <div className="flex h-16 items-center border-b border-[var(--border-sidebar)] px-5">
          <Link to="/" className="min-w-0">
            <BrandMark
              title="Momentum Lab"
              subtitle="Nifty 500 Pipeline"
              inverted
            />
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
              className="fixed inset-0 bg-[#1B0F2E]/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="lab-sidebar relative z-10 flex w-72 max-w-[85vw] flex-col"
            >
              <div className="flex h-16 items-center justify-between border-b border-[var(--border-sidebar)] px-5">
                <Link to="/" onClick={() => setMobileOpen(false)}>
                  <BrandMark
                    size="sm"
                    title="Momentum Lab"
                    subtitle="Nifty 500"
                    inverted
                  />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                  className="rounded-full p-1.5 text-surface-cream/85 transition hover:bg-brand-coral/25 hover:text-surface-cream"
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
        <header className="lab-topbar sticky top-0 z-30">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-full border border-brand-plum/30 bg-brand-plum/10 p-2 text-brand-plum shadow-sm transition hover:border-brand-plum hover:bg-brand-plum/20 dark:border-brand-coral/35 dark:bg-brand-coral/15 dark:text-brand-coral lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate font-display text-lg font-extrabold tracking-tight sm:text-xl">
                  <span className="bg-gradient-to-r from-[#3B1F4E] via-[#B5445E] to-[#C87D20] bg-clip-text text-transparent dark:from-brand-coral dark:via-brand-gold dark:to-surface-cream">
                    {title}
                  </span>
                </h1>
                {subtitle && (
                  <p className="hidden truncate text-xs font-medium text-[var(--text-muted)] sm:block">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
              {/* Tinted search pill */}
              <form
                onSubmit={handleSearchSubmit}
                className="relative hidden xl:block"
                role="search"
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-plum dark:text-brand-coral" />
                <input
                  type="text"
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Jump to ticker..."
                  aria-label="Search screener tickers"
                  className="lab-input w-36 rounded-full py-1.5 pl-8 pr-3 text-xs font-medium placeholder:text-[var(--text-muted)] 2xl:w-44"
                />
              </form>

              {actions && (
                <div className="hidden sm:flex sm:items-center sm:gap-2">
                  {actions}
                </div>
              )}

              {/* Theme toggle with gradient ring */}
              <div className="rounded-full bg-gradient-to-tr from-brand-coral via-brand-gold to-brand-plum p-[2px] shadow-md shadow-brand-plum/20 dark:shadow-brand-plumDark/30">
                <ThemeToggle className="border-0 shadow-none" />
              </div>

              {/* User Menu with gradient ring */}
              <div className="relative" ref={userMenuRef}>
                <div className="rounded-full bg-gradient-to-tr from-brand-coral via-brand-gold to-brand-plum p-[2px] shadow-md shadow-brand-plum/20 dark:shadow-brand-plumDark/30">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    aria-expanded={userMenuOpen}
                    aria-haspopup="menu"
                    className="inline-flex h-8 items-center gap-2 rounded-full bg-surface-cream px-2.5 text-xs font-semibold text-[#3B1F4E] transition hover:bg-surface-cream/90 dark:bg-surface-cardDark dark:text-surface-cream dark:hover:bg-[#2B1740]"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-brand-coral to-brand-plum text-[10px] font-bold text-surface-cream">
                      {(user?.email || "M")[0].toUpperCase()}
                    </span>
                    <span className="hidden max-w-[92px] truncate md:inline 2xl:max-w-[130px]">
                      {user?.email || "Account"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-brand-plum dark:text-brand-coral" />
                  </button>
                </div>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="lab-card absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-2xl p-1.5"
                    >
                      <div className="border-b border-[var(--border-table)] px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-brand-plum dark:text-brand-coral">
                          Signed in as
                        </div>
                        <div className="truncate text-xs font-semibold text-[var(--text-primary)]">
                          {user?.email}
                        </div>
                      </div>
                      <Link
                        to="/"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-brand-coral/15 hover:text-[var(--text-primary)]"
                      >
                        <Home className="h-3.5 w-3.5 text-brand-plum dark:text-brand-coral" />
                        Landing Page
                      </Link>
                      <Link
                        to="/watchlist"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-brand-coral/15 hover:text-[var(--text-primary)]"
                      >
                        <span className="flex items-center gap-2">
                          <Star className="h-3.5 w-3.5 text-brand-gold" />
                          Watchlist
                        </span>
                        <Badge variant="plum" size="xs">
                          {watchlist.length}
                        </Badge>
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-500/15 dark:text-red-300"
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
                className="hidden h-9 items-center gap-1.5 rounded-full border border-brand-plum/30 bg-brand-plum/10 px-3.5 text-xs font-semibold text-[#3B1F4E] shadow-sm transition hover:border-brand-plum hover:bg-brand-plum hover:text-surface-cream dark:border-brand-coral/35 dark:bg-brand-coral/15 dark:text-surface-cream dark:hover:border-brand-coral dark:hover:bg-brand-plumDark sm:inline-flex"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log out</span>
              </button>
            </div>
          </div>

          {actions && (
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-table)] px-4 py-2 sm:hidden">
              {actions}
            </div>
          )}

          {/* 2px coral-gold-plum bottom hairline */}
          <div className="h-[2px] w-full bg-gradient-to-r from-brand-coral via-brand-gold to-brand-plum dark:to-brand-mauve" />
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

        <footer className="lab-topbar border-t border-brand-coral/30 px-4 py-3 text-center text-[11px] font-medium text-[var(--text-secondary)] sm:px-6 lg:px-8">
          Educational quantitative momentum research workspace — not investment advice.
        </footer>
      </div>
    </div>
  );
}
