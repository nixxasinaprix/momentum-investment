import { BrowserRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import Backtest from "./pages/Backtest";
import Compare from "./pages/Compare";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import Learn from "./pages/Learn";
import LoginPage from "./pages/LoginPage";
import Screener from "./pages/Screener";
import StockDetail from "./pages/StockDetail";
import StrategyLab from "./pages/StrategyLab";
import Watchlist from "./pages/Watchlist";

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/screener" element={<Protected><Screener /></Protected>} />
          <Route path="/stock/:symbol" element={<Protected><StockDetail /></Protected>} />
          <Route path="/compare" element={<Protected><Compare /></Protected>} />
          <Route path="/strategy-lab" element={<Protected><StrategyLab /></Protected>} />
          <Route path="/backtest" element={<Protected><Backtest /></Protected>} />
          <Route path="/learn" element={<Protected><Learn /></Protected>} />
          <Route path="/watchlist" element={<Protected><Watchlist /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
