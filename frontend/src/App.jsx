import { MotionConfig } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppBackground from "./components/AppBackground";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { PipelineProvider } from "./context/PipelineContext";
import { ThemeProvider } from "./context/ThemeContext";
import Backtest from "./pages/Backtest";
import Compare from "./pages/Compare";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import Learn from "./pages/Learn";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import Screener from "./pages/Screener";
import StockDetail from "./pages/StockDetail";
import StrategyLab from "./pages/StrategyLab";
import TodaysPicks from "./pages/TodaysPicks";
import Watchlist from "./pages/Watchlist";

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function AppShell() {
  const { pathname } = useLocation();
  const isPublicHeroRoute = pathname === "/" || pathname === "/login";

  return (
    <>
      {!isPublicHeroRoute && <AppBackground />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/picks" element={<Protected><TodaysPicks /></Protected>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/screener" element={<Protected><Screener /></Protected>} />
        <Route path="/stock/:symbol" element={<Protected><StockDetail /></Protected>} />
        <Route path="/compare" element={<Protected><Compare /></Protected>} />
        <Route path="/strategy" element={<Protected><StrategyLab /></Protected>} />
        <Route path="/strategy-lab" element={<Navigate to="/strategy" replace />} />
        <Route path="/backtest" element={<Protected><Backtest /></Protected>} />
        <Route path="/learn" element={<Protected><Learn /></Protected>} />
        <Route path="/watchlist" element={<Protected><Watchlist /></Protected>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AuthProvider>
          <PipelineProvider>
            <BrowserRouter>
              <AppShell />
            </BrowserRouter>
          </PipelineProvider>
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
