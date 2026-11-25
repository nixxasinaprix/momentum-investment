import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Shield, Zap, BarChart3, Globe, Clock,
  ArrowRight, CheckCircle2, Star, Menu, X, Sun, Moon, RefreshCw
} from "lucide-react";
import SceneryBackground from "../components/SceneryBackground";

const DEFAULT_MARKET_DATA = {
  index: {
    name: "NIFTY 500",
    last: 24088.80,
    change: 191.65,
    pChange: 0.80,
    previousClose: 23897.15,
    open: 23750.80,
    high: 24089.05,
    low: 23722.75,
  },
  topGainers: [
    { symbol: "RELIANCE", name: "Reliance Industries", last: 1377.50, change: 8.50, pChange: 0.62 },
    { symbol: "TCS", name: "Tata Consultancy Services", last: 4120.30, change: 38.90, pChange: 0.95 },
    { symbol: "INFY", name: "Infosys", last: 1850.75, change: 15.20, pChange: 0.83 },
    { symbol: "HDFCBANK", name: "HDFC Bank", last: 1680.55, change: 12.35, pChange: 0.74 },
    { symbol: "YESBANK", name: "Yes Bank", last: 17.91, change: 0.15, pChange: 0.84 },
  ],
  topLosers: [
    { symbol: "ADANIENT", name: "Adani Enterprises", last: 3120.85, change: -42.15, pChange: -1.33 },
    { symbol: "SBIN", name: "State Bank of India", last: 825.30, change: -8.60, pChange: -1.03 },
    { symbol: "MARUTI", name: "Maruti Suzuki", last: 12450.20, change: -110.80, pChange: -0.88 },
    { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", last: 1745.10, change: -10.25, pChange: -0.58 },
    { symbol: "ITC", name: "ITC Limited", last: 465.20, change: -1.85, pChange: -0.40 },
  ],
  _source: "default",
};

const formatINR = (val) => {
  const num = Number(val);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPercent = (val) => {
  const num = Number(val);
  if (isNaN(num)) return "0.00%";
  return `${num > 0 ? "+" : ""}${num.toFixed(2)}%`;
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function LandingPage() {
  const [dark, setDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [marketDetails, setMarketDetails] = useState(DEFAULT_MARKET_DATA);
  const [isLiveFeed, setIsLiveFeed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch("http://localhost:8000/api/nifty500-details", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.index && Array.isArray(data.topGainers) && Array.isArray(data.topLosers)) {
          setMarketDetails(data);
          setIsLiveFeed(data._source === "live_market" || data._source === "redis");
          setLastUpdated(new Date().toLocaleTimeString());
        }
      }
    } catch {
      setIsLiveFeed(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const response = await fetch("http://localhost:8000/api/nifty500-details", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (active && data && data.index && Array.isArray(data.topGainers) && Array.isArray(data.topLosers)) {
            setMarketDetails(data);
            setIsLiveFeed(data._source === "live_market" || data._source === "redis");
            setLastUpdated(new Date().toLocaleTimeString());
          }
        }
      } catch {
        if (active) setIsLiveFeed(false);
      }
    }

    loadInitialData();
    const interval = setInterval(loadInitialData, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const features = [
    {
      icon: TrendingUp,
      title: "Real-Time Analytics",
      description: "Track your portfolio performance with live market data and intelligent insights."
    },
    {
      icon: Shield,
      title: "Bank-Grade Security",
      description: "Enterprise encryption and multi-factor authentication protect every transaction."
    },
    {
      icon: Zap,
      title: "Lightning Execution",
      description: "Execute trades in milliseconds with our optimized trading infrastructure."
    },
    {
      icon: BarChart3,
      title: "Advanced Charts",
      description: "Professional-grade charting tools with 100+ technical indicators."
    },
    {
      icon: Globe,
      title: "Global Markets",
      description: "Access stocks, ETFs, crypto, and forex across 50+ international exchanges."
    },
    {
      icon: Clock,
      title: "24/7 Support",
      description: "Expert support team available around the clock to assist you."
    }
  ];

  const steps = [
    { number: "01", title: "Create Account", description: "Sign up in seconds with just your email and broker key." },
    { number: "02", title: "Fund Your Portfolio", description: "Deposit funds securely through your preferred payment method." },
    { number: "03", title: "Start Trading", description: "Access global markets and start building your investment portfolio." }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Portfolio Manager",
      content: "Momentum Investment transformed how I manage client portfolios. The real-time analytics are game-changing.",
      rating: 5
    },
    {
      name: "Michael Rodriguez",
      role: "Independent Trader",
      content: "The execution speed is incredible. I've never experienced such seamless trading on any platform.",
      rating: 5
    },
    {
      name: "Emily Thompson",
      role: "Financial Advisor",
      content: "The security features give my clients peace of mind. It's the most professional platform I've used.",
      rating: 5
    }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F2EA] font-sans text-slate-900 antialiased transition-colors duration-700 dark:bg-[#07080F] dark:text-white">
      
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <SceneryBackground dark={dark} />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-stone-200/50 bg-white/80 backdrop-blur-lg transition-colors duration-700 dark:border-stone-800/50 dark:bg-stone-900/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#F0867C] to-[#6E3559] shadow-md">
                <Zap className="h-5 w-5 text-white" fill="currentColor" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">Momentum Investment</span>
            </div>

            {/* Desktop Menu with hover underlines */}
            <div className="hidden items-center gap-8 md:flex">
              <a href="#features" className="relative text-sm font-medium text-stone-700 transition-colors hover:text-[#6E3559] after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-[#6E3559] after:transition-transform after:duration-300 hover:after:scale-x-100 dark:text-stone-300 dark:after:bg-[#F0867C] dark:hover:text-[#F0867C]">
                Features
              </a>
              <a href="#how-it-works" className="relative text-sm font-medium text-stone-700 transition-colors hover:text-[#6E3559] after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-[#6E3559] after:transition-transform after:duration-300 hover:after:scale-x-100 dark:text-stone-300 dark:after:bg-[#F0867C] dark:hover:text-[#F0867C]">
                How It Works
              </a>
              <a href="#testimonials" className="relative text-sm font-medium text-stone-700 transition-colors hover:text-[#6E3559] after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-[#6E3559] after:transition-transform after:duration-300 hover:after:scale-x-100 dark:text-stone-300 dark:after:bg-[#F0867C] dark:hover:text-[#F0867C]">
                Testimonials
              </a>
              <button
                onClick={() => setDark(!dark)}
                aria-label="Toggle theme"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 transition-all hover:scale-105 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link
                to="/login"
                className="rounded-full bg-[#6E3559] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#6E3559]/30 transition-all hover:scale-105 hover:bg-[#5D2C4B] dark:bg-[#8C4570] dark:shadow-[#8C4570]/30 dark:hover:bg-[#7A3B61]"
              >
                Sign In
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-stone-200 py-4 dark:border-stone-800"
            >
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-sm font-medium text-stone-700 dark:text-stone-300">Features</a>
                <a href="#how-it-works" className="text-sm font-medium text-stone-700 dark:text-stone-300">How It Works</a>
                <a href="#testimonials" className="text-sm font-medium text-stone-700 dark:text-stone-300">Testimonials</a>
                <button
                  onClick={() => setDark(!dark)}
                  className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {dark ? "Light Mode" : "Dark Mode"}
                </button>
                <Link
                  to="/login"
                  className="rounded-full bg-[#6E3559] px-5 py-2 text-center text-sm font-semibold text-white dark:bg-[#8C4570]"
                >
                  Sign In
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-4xl text-center"
          >
            <motion.div variants={fadeIn} className="mb-6 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/80 px-4 py-1.5 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-800/80">
              <span className="flex h-2 w-2 rounded-full bg-[#F0867C]" />
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Trusted by 10,000+ investors</span>
            </motion.div>

            <motion.h1 variants={fadeIn} className="mb-6 font-display text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Invest Smarter with{" "}
              <span className="bg-gradient-to-r from-[#F0867C] via-[#E3C87D] to-[#6E3559] bg-clip-text text-transparent">
                Momentum
              </span>
            </motion.h1>

            <motion.p variants={fadeIn} className="mx-auto mb-10 max-w-2xl text-lg text-stone-800 dark:text-stone-300">
              The professional investment platform built for serious traders. Real-time analytics, lightning-fast execution, and bank-grade security.
            </motion.p>

            <motion.div variants={fadeIn} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/login"
                className="group flex items-center gap-2 rounded-full bg-[#6E3559] px-8 py-4 text-base font-semibold text-white shadow-xl shadow-[#6E3559]/30 transition-all hover:scale-105 hover:bg-[#5D2C4B] dark:bg-[#8C4570] dark:shadow-[#8C4570]/30 dark:hover:bg-[#7A3B61]"
              >
                Start Trading Now
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 rounded-full border-2 border-stone-300 bg-white/80 px-8 py-4 text-base font-semibold text-stone-700 backdrop-blur-sm transition-all hover:scale-105 hover:border-[#6E3559] dark:border-stone-700 dark:bg-stone-800/80 dark:text-stone-300 dark:hover:border-[#F0867C]"
              >
                Learn More
              </a>
            </motion.div>

            <motion.div variants={fadeIn} className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-stone-700 dark:text-stone-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#F0867C]" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#E3C87D]" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#6E3559]" />
                <span>24/7 support</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ Nifty 500 Market Insights ═══════════ */}
      <section id="market-insights" className="relative z-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-10 max-w-3xl text-center"
          >
            <div className="mb-4 inline-flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                isLiveFeed 
                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
              }`}>
                <span className={`h-2 w-2 rounded-full ${isLiveFeed ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                {isLiveFeed ? "Live NSE Feed" : "NSE Market Data"}
              </span>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh market data"
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white/80 px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur-sm transition-all hover:scale-105 hover:border-[#6E3559] dark:border-stone-700 dark:bg-stone-800/80 dark:text-stone-300 dark:hover:border-[#F0867C]"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-[#6E3559] dark:text-[#F0867C]" : ""}`} />
                <span>{isRefreshing ? "Updating..." : "Refresh"}</span>
              </button>
            </div>

            <h2 className="mb-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Nifty 500 Market Insights
            </h2>
            <p className="text-base text-stone-700 dark:text-stone-300 sm:text-lg">
              Live index overview and top market movers from the National Stock Exchange (NSE)
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            {/* Index Summary Card */}
            <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white/85 p-8 shadow-xl backdrop-blur-md transition-all duration-300 hover:shadow-2xl dark:border-stone-800 dark:bg-stone-900/85">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  {marketDetails.index?.name || "NIFTY 500"}
                </span>
                <span className="text-xs text-stone-600 dark:text-stone-400">
                  Updated: {lastUpdated}
                </span>
              </div>

              <p className="mt-4 font-display text-4xl font-bold tracking-tight text-stone-900 dark:text-white">
                ₹{formatINR(marketDetails.index?.last)}
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    Number(marketDetails.index?.change || 0) >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {Number(marketDetails.index?.change || 0) >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(Number(marketDetails.index?.change || 0)).toFixed(2)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    Number(marketDetails.index?.pChange || 0) >= 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                  }`}
                >
                  {formatPercent(marketDetails.index?.pChange)}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-stone-200/80 pt-6 dark:border-stone-700/80">
                <div>
                  <p className="text-xs font-medium text-stone-600 dark:text-stone-400">Open</p>
                  <p className="text-sm font-bold text-stone-900 dark:text-white">
                    ₹{formatINR(marketDetails.index?.open)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-stone-600 dark:text-stone-400">Prev Close</p>
                  <p className="text-sm font-bold text-stone-900 dark:text-white">
                    ₹{formatINR(marketDetails.index?.previousClose)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-stone-600 dark:text-stone-400">Day High</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{formatINR(marketDetails.index?.high)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-stone-600 dark:text-stone-400">Day Low</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">
                    ₹{formatINR(marketDetails.index?.low)}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Gainers */}
            <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white/85 p-8 shadow-xl backdrop-blur-md transition-all duration-300 hover:shadow-2xl dark:border-stone-800 dark:bg-stone-900/85">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl font-bold">Top Gainers</h3>
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">NSE Top 5</span>
              </div>

              <div className="space-y-4">
                {(marketDetails.topGainers || []).map((stock) => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between rounded-xl p-2.5 transition hover:bg-stone-100/70 dark:hover:bg-stone-800/60"
                  >
                    <div>
                      <p className="font-semibold text-stone-900 dark:text-white">{stock.symbol}</p>
                      <p className="text-xs text-stone-600 dark:text-stone-400">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-stone-900 dark:text-white">₹{formatINR(stock.last)}</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPercent(stock.pChange)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Losers */}
            <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white/85 p-8 shadow-xl backdrop-blur-md transition-all duration-300 hover:shadow-2xl dark:border-stone-800 dark:bg-stone-900/85">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl font-bold">Top Losers</h3>
                </div>
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">NSE Top 5</span>
              </div>

              <div className="space-y-4">
                {(marketDetails.topLosers || []).map((stock) => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between rounded-xl p-2.5 transition hover:bg-stone-100/70 dark:hover:bg-stone-800/60"
                  >
                    <div>
                      <p className="font-semibold text-stone-900 dark:text-white">{stock.symbol}</p>
                      <p className="text-xs text-stone-600 dark:text-stone-400">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-stone-900 dark:text-white">₹{formatINR(stock.last)}</p>
                      <p className="text-xs font-bold text-red-600 dark:text-red-400">
                        {formatPercent(stock.pChange)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-16 max-w-3xl text-center"
          >
            <h2 className="mb-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-stone-800 dark:text-stone-300">
              Professional-grade tools designed for modern investors
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="group rounded-2xl border border-stone-200 bg-white/80 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl dark:border-stone-800 dark:bg-stone-900/80"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#F0867C] to-[#6E3559] shadow-md transition-transform group-hover:scale-110">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 font-display text-xl font-bold">{feature.title}</h3>
                <p className="text-stone-800 dark:text-stone-300">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-16 max-w-3xl text-center"
          >
            <h2 className="mb-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Get Started in Minutes
            </h2>
            <p className="text-lg text-stone-800 dark:text-stone-300">
              Three simple steps to start your investment journey
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-8 md:grid-cols-3"
          >
            {steps.map((step, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="relative"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F0867C] to-[#6E3559] text-3xl font-bold text-white shadow-lg">
                  {step.number}
                </div>
                <h3 className="mb-2 font-display text-2xl font-bold">{step.title}</h3>
                <p className="text-stone-800 dark:text-stone-300">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-16 max-w-3xl text-center"
          >
            <h2 className="mb-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Trusted by Professionals
            </h2>
            <p className="text-lg text-stone-800 dark:text-stone-300">
              See what our users are saying
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-6 md:grid-cols-3"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="rounded-2xl border border-stone-200 bg-white/80 p-8 shadow-lg backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/80"
              >
                <div className="mb-4 flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-[#E3C87D] text-[#E3C87D]" />
                  ))}
                </div>
                <p className="mb-6 text-stone-700 dark:text-stone-300">"{testimonial.content}"</p>
                <div>
                  <p className="font-display font-bold">{testimonial.name}</p>
                  <p className="text-sm text-stone-600 dark:text-stone-400">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-stone-200 bg-white/80 p-12 text-center shadow-2xl backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/80"
          >
            <h2 className="mb-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Ready to Build Your Portfolio?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-stone-800 dark:text-stone-300">
              Join thousands of investors who trust Momentum Investment to grow their wealth.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-[#6E3559] px-8 py-4 text-base font-semibold text-white shadow-xl shadow-[#6E3559]/30 transition-all hover:scale-105 hover:bg-[#5D2C4B] dark:bg-[#8C4570] dark:shadow-[#8C4570]/30 dark:hover:bg-[#7A3B61]"
            >
              Get Started Now
              <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-200 bg-white/80 px-4 py-12 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/80 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#F0867C] to-[#6E3559] shadow-md">
                <Zap className="h-4 w-4 text-white" fill="currentColor" />
              </div>
              <span className="font-display text-sm font-bold">Momentum Investment</span>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              © 2026 Momentum Investment. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}