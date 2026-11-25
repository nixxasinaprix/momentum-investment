import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Zap, Eye, EyeOff, Check, ArrowRight, Loader2, ChevronLeft,
  Sun, Moon, ShieldCheck, KeyRound, TrendingUp, Clock,
} from "lucide-react";
import Grainient from "../components/grainient";
import SceneryBackground from "../components/SceneryBackground";
import { useAuth } from "../context/AuthContext";

/* ---------- animation variants ---------- */
const card = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.07, delayChildren: 0.2 },
  },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const panel = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.45 } } };
const panelItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

/* ---------- real quotes from legendary investors ---------- */
const quotes = [
  {
    text: "The stock market is a device for transferring money from the impatient to the patient.",
    author: "Warren Buffett",
  },
  {
    text: "Risk comes from not knowing what you're doing.",
    author: "Warren Buffett",
  },
  {
    text: "The four most dangerous words in investing are: 'This time it's different.'",
    author: "Sir John Templeton",
  },
  {
    text: "Know what you own, and know why you own it.",
    author: "Peter Lynch",
  },
];

/* ---------- feature promises (no fake stats) ---------- */
const panelFeatures = [
  { icon: TrendingUp, title: "Real-Time Data", sub: "Live market insights", color: "text-[#F0867C]" },
  { icon: Zap, title: "Instant Execution", sub: "Trades in milliseconds", color: "text-[#E3C87D]" },
  { icon: ShieldCheck, title: "Bank-Grade Security", sub: "Your assets, protected", color: "text-[#C77FB0]" },
  { icon: Clock, title: "24/7 Support", sub: "Always here for you", color: "text-white/80" },
];

/* ---------- Google icon ---------- */
const GoogleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 5.04c1.62 0 3.06.56 4.2 1.64l3.12-3.12C17.46 1.8 14.96.75 12 .75 7.55.75 3.72 3.3 1.82 7.02l3.66 2.84C6.4 7.02 8.98 5.04 12 5.04z"/>
    <path fill="#4285F4" d="M23.25 12.27c0-.9-.08-1.55-.25-2.23H12v4.26h6.44c-.13 1.07-.83 2.68-2.39 3.76l3.58 2.78c2.14-1.97 3.62-4.88 3.62-8.57z"/>
    <path fill="#FBBC05" d="M5.5 14.14a6.9 6.9 0 0 1 0-4.28L1.83 7.02A11.24 11.24 0 0 0 .63 12c0 1.78.44 3.45 1.2 4.98l3.67-2.84z"/>
    <path fill="#34A853" d="M12 23.25c2.97 0 5.46-.98 7.28-2.66l-3.58-2.78c-.95.64-2.23 1.09-3.7 1.09-3.02 0-5.6-1.98-6.5-4.82l-3.67 2.84c1.9 3.72 5.73 6.33 10.17 6.33z"/>
  </svg>
);

/* ---------- page ---------- */
export default function LoginPage() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [dark, setDark] = useState(false);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  /* rotate quotes every 5 seconds */
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const switchMode = (nextMode) => {
    if (status !== "idle") return;
    setMode(nextMode);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status !== "idle") return;
    setError("");
    setStatus("loading");
    try {
      if (mode === "signup") {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      setStatus("success");
      setTimeout(() => {
        navigate("/picks", { replace: true });
      }, 500);
    } catch (err) {
      setError(err.message || "Authentication failed");
      setStatus("idle");
    }
  };

  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#07080F] font-sans text-slate-900 antialiased transition-colors duration-300 md:flex-row dark:text-white">

      {/* 🎨 BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <SceneryBackground dark={dark} />
      </div>

      {/* Theme toggle */}
      <button
        onClick={() => setDark((d) => !d)}
        aria-label="Toggle theme"
        className="fixed right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white shadow-sm backdrop-blur-md transition-transform duration-300 hover:scale-105"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={dark ? "moon" : "sun"}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {dark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
          </motion.span>
        </AnimatePresence>
      </button>

      {/* ═══════════ LEFT — login card ═══════════ */}
      <section className="relative z-10 flex min-h-[100dvh] w-full items-center justify-center px-5 py-16 sm:px-10 md:w-[45%] md:flex-none lg:w-[40%]">
        <motion.div variants={card} initial="hidden" animate="show" className="w-full max-w-[400px]">

          <div className="relative overflow-hidden rounded-[24px] bg-[#F5F2EA] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.8)] transition-colors duration-700 dark:bg-[#1E1723]">

            {/* 🎨 organic blobs header */}
            <div aria-hidden="true" className="transition-opacity duration-700 dark:opacity-70">
              <div
                className="absolute -top-14 -left-14 h-56 w-56 bg-[#F0867C]"
                style={{ borderRadius: "55% 45% 50% 50% / 50% 55% 45% 50%" }}
              />
              <div
                className="absolute -top-6 -right-24 h-72 w-72 bg-[#E3C87D]"
                style={{ borderRadius: "50% 50% 45% 55% / 55% 45% 55% 45%" }}
              />
              <div
                className="absolute -top-10 -left-24 h-72 w-[30rem] bg-[#6E3559]"
                style={{ borderRadius: "45% 55% 52% 48% / 52% 48% 55% 45%" }}
              />
            </div>

            <motion.button
              variants={item}
              type="button"
              onClick={() => navigate("/")}
              aria-label="Go back"
              className="absolute left-5 top-5 z-10 text-white/90 transition-colors duration-300 hover:text-white"
            >
              <ChevronLeft className="h-6 w-6" />
            </motion.button>

            <motion.h1
              variants={item}
              className="absolute left-7 top-24 z-10 font-display text-[32px] font-bold leading-[1.15] text-white"
            >
              {mode === "signup" ? (
                <>
                  Create
                  <br />
                  Account
                </>
              ) : (
                <>
                  Welcome
                  <br />
                  Back
                </>
              )}
            </motion.h1>

            <form onSubmit={handleSubmit} className="relative z-10 px-7 pb-8 pt-72 sm:px-8">

              <motion.div variants={item} className="mb-5 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#F0867C] to-[#6E3559] shadow-md">
                    <Zap className="h-4 w-4 text-white" fill="currentColor" />
                  </div>
                  <span className="font-display text-sm font-bold tracking-tight text-stone-800 transition-colors duration-700 dark:text-stone-100">
                    Momentum Investment
                  </span>
                </div>

                <div className="inline-flex rounded-full border border-stone-300/80 bg-white/70 p-0.5 text-xs font-semibold dark:border-stone-700 dark:bg-stone-800/80">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className={`rounded-full px-2.5 py-1 transition-colors ${
                      mode === "login"
                        ? "bg-[#6E3559] text-white dark:bg-[#8C4570]"
                        : "text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
                    }`}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className={`rounded-full px-2.5 py-1 transition-colors ${
                      mode === "signup"
                        ? "bg-[#6E3559] text-white dark:bg-[#8C4570]"
                        : "text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
                    }`}
                  >
                    Sign up
                  </button>
                </div>
              </motion.div>

              <motion.div variants={item}>
                <label htmlFor="email" className="text-xs font-medium text-stone-400 transition-colors duration-700 dark:text-stone-500">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  className="mt-1 w-full border-b border-stone-400/60 bg-transparent py-2 text-[15px] font-semibold text-stone-800 outline-none transition-colors duration-300 placeholder:text-stone-300 focus:border-[#6E3559] dark:border-stone-600/60 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:border-[#F0867C]"
                />
              </motion.div>

              <motion.div variants={item} className="relative mt-7">
                <label htmlFor="password" className="text-xs font-medium text-stone-400 transition-colors duration-700 dark:text-stone-500">
                  Password
                </label>
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  className="mt-1 w-full border-b border-stone-400/60 bg-transparent py-2 pr-16 text-[15px] font-semibold text-stone-800 outline-none transition-colors duration-300 placeholder:text-stone-300 focus:border-[#6E3559] dark:border-stone-600/60 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:border-[#F0867C]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute -right-2 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-stone-500 shadow-[0_8px_24px_rgba(0,0,0,0.14)] transition-all duration-300 hover:scale-105 dark:bg-stone-800 dark:text-stone-300"
                >
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                {error && (
                  <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </motion.div>

              {/* 🔗 Google + Broker Key buttons */}
              <motion.div variants={item} className="mt-7">
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-px flex-1 bg-stone-300/60 transition-colors duration-700 dark:bg-stone-600/40" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400 transition-colors duration-700 dark:text-stone-500">
                    or continue with
                  </span>
                  <span className="h-px flex-1 bg-stone-300/60 transition-colors duration-700 dark:bg-stone-600/40" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex h-12 items-center justify-center gap-2 rounded-[14px] border border-stone-300 bg-white text-sm font-medium text-stone-700 shadow-sm transition-colors duration-300 hover:border-[#6E3559] hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:border-[#F0867C] dark:hover:bg-stone-700"
                  >
                    <GoogleIcon className="h-5 w-5" />
                    Google
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex h-12 items-center justify-center gap-2 rounded-[14px] border border-stone-300 bg-white text-sm font-medium text-stone-700 shadow-sm transition-colors duration-300 hover:border-[#6E3559] hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:border-[#F0867C] dark:hover:bg-stone-700"
                  >
                    <KeyRound className="h-5 w-5" />
                    Broker Key
                  </motion.button>
                </div>
              </motion.div>

              <motion.div variants={item} className="mt-7 flex items-center justify-between">
                <span className="font-display text-xl font-bold text-stone-900 transition-colors duration-700 dark:text-stone-50">
                  {mode === "signup" ? "Sign up" : "Sign in"}
                </span>
                <motion.button
                  type="submit"
                  disabled={status !== "idle"}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  aria-label={mode === "signup" ? "Sign up" : "Sign in"}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[#6E3559] text-white shadow-lg shadow-[#6E3559]/40 transition-colors duration-300 hover:bg-[#5D2C4B] disabled:opacity-80 dark:bg-[#8C4570] dark:shadow-[#8C4570]/40 dark:hover:bg-[#7A3B61]"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {status === "loading" ? (
                      <motion.span key="l" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </motion.span>
                    ) : status === "success" ? (
                      <motion.span key="s" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
                        <Check className="h-5 w-5" />
                      </motion.span>
                    ) : (
                      <motion.span key="i" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
                        <ArrowRight className="h-5 w-5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>

              <motion.div variants={item} className="mt-7 flex items-center justify-between text-sm font-bold text-stone-800 transition-colors duration-700 dark:text-stone-100">
                <button
                  type="button"
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                  className="underline decoration-stone-800/60 underline-offset-4 transition-colors duration-300 hover:decoration-[#6E3559] hover:text-[#6E3559] dark:decoration-stone-100/60 dark:hover:decoration-[#F0867C] dark:hover:text-[#F0867C]"
                >
                  {mode === "login" ? "Sign up" : "Log in"}
                </button>
                <a href="#" className="underline decoration-stone-800/60 underline-offset-4 transition-colors duration-300 hover:decoration-[#6E3559] hover:text-[#6E3559] dark:decoration-stone-100/60 dark:hover:decoration-[#F0867C] dark:hover:text-[#F0867C]">
                  Forgot Password
                </a>
              </motion.div>
            </form>
          </div>

          <motion.div variants={item} className="mt-6 flex items-center justify-center gap-1.5 text-xs text-white/80">
            <ShieldCheck className="h-3.5 w-3.5" />
            Protected by enterprise-grade security
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════ RIGHT — Grainient + rotating quotes + feature promises ═══════════ */}
      <section className="relative z-10 hidden flex-1 md:block md:py-6 md:pr-6">
        <div className="relative h-full w-full overflow-hidden rounded-[28px]">
          
          {/* Grainient Backgrounds */}
          <div className="absolute inset-0">
            <div className={`absolute inset-0 transition-opacity duration-700 ${dark ? "opacity-0" : "opacity-100"}`}>
              <Grainient
                color1="#e9b20b" color2="#EF4444" color3="#7C3AED"
                timeSpeed={0.25} colorBalance={0} warpStrength={1} warpFrequency={5}
                warpSpeed={2} warpAmplitude={50} blendAngle={0} blendSoftness={0.05}
                rotationAmount={500} noiseScale={2} grainAmount={0.1} grainScale={2}
                grainAnimated={false} contrast={1.5} gamma={1} saturation={1}
                centerX={0} centerY={0} zoom={0.9}
              />
            </div>
            <div className={`absolute inset-0 transition-opacity duration-700 ${dark ? "opacity-100" : "opacity-0"}`}>
              <Grainient
                color1="#4F46E5" color2="#7C3AED" color3="#0B0D17"
                timeSpeed={0.2} warpStrength={0.9} grainAmount={0.08}
                contrast={1.25} saturation={1.1} zoom={1}
              />
            </div>
          </div>
          
          {/* 🌑 dark gradient overlay for readability */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/65" />

          {/* Content */}
          <motion.div
            variants={panel}
            initial="hidden"
            animate="show"
            className="relative z-10 flex h-full flex-col items-center justify-center p-10 lg:p-14"
          >
            {/* Badge */}
            <motion.div variants={panelItem} className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-1.5 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-[#F0867C] animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-white">Precision tools for modern investors</span>
            </motion.div>

            {/* Headline */}
            <motion.h2
              variants={panelItem}
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.65)" }}
              className="max-w-2xl text-center font-display text-5xl font-black leading-[1.05] tracking-tight text-white lg:text-6xl"
            >
              Markets never sleep.
              <br />
              <span className="bg-gradient-to-r from-[#F0867C] via-[#E3C87D] to-[#F5F2EA] bg-clip-text text-transparent">
                Neither do we.
              </span>
            </motion.h2>

            {/* Sub-headline */}
            <motion.p
              variants={panelItem}
              style={{ textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}
              className="mt-6 max-w-lg text-center text-lg font-medium leading-relaxed text-white"
            >
              One unified workspace for real-time analytics, lightning-fast execution, and total peace of mind.
            </motion.p>

            {/* ✨ ROTATING QUOTE CARD — real words from legendary investors */}
            <motion.div
              variants={panelItem}
              className="mt-10 w-full max-w-xl rounded-2xl border border-white/15 bg-black/45 p-8 shadow-xl backdrop-blur-xl"
            >
              <div className="relative min-h-[130px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={quoteIndex}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.45 }}
                    className="text-center"
                  >
                    <p
                      className="text-lg italic leading-relaxed text-white"
                      style={{ textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}
                    >
                      "{quotes[quoteIndex].text}"
                    </p>
                    <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-[#E3C87D]">
                      — {quotes[quoteIndex].author}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* clickable dots */}
              <div className="mt-6 flex items-center justify-center gap-2">
                {quotes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setQuoteIndex(i)}
                    aria-label={`Show quote ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === quoteIndex ? "w-8 bg-[#F0867C]" : "w-2 bg-white/30 hover:bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </motion.div>

            {/* 🧩 2×2 FEATURE PROMISES */}
            <motion.div variants={panelItem} className="mt-8 grid w-full max-w-xl grid-cols-2 gap-4">
              {panelFeatures.map((f) => (
                <div
                  key={f.title}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-lg transition-transform duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <f.icon className={`h-5 w-5 ${f.color}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">{f.title}</p>
                    <p className="text-xs text-white/70">{f.sub}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}