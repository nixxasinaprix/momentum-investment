import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import Grainient from "./grainient";
import SceneryBackground from "./SceneryBackground";

function canRunWebGLWash() {
  if (typeof window === "undefined") return false;
  const isDesktop = window.matchMedia("(min-width: 768px)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 8 : 8;
  return isDesktop && !reducedMotion && cores > 2;
}

export default function AppBackground() {
  const { dark } = useTheme();
  const [enableGrainient, setEnableGrainient] = useState(() => canRunWebGLWash());
  const [tabVisible, setTabVisible] = useState(() =>
    typeof document !== "undefined" ? !document.hidden : true
  );

  useEffect(() => {
    const mqDesktop = window.matchMedia("(min-width: 768px)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateCapability = () => setEnableGrainient(canRunWebGLWash());
    const updateVisibility = () => setTabVisible(!document.hidden);

    mqDesktop.addEventListener("change", updateCapability);
    mqMotion.addEventListener("change", updateCapability);
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      mqDesktop.removeEventListener("change", updateCapability);
      mqMotion.removeEventListener("change", updateCapability);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const showShader = enableGrainient && tabVisible;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-surface-cream transition-colors duration-700 dark:bg-surface-night"
    >
      {/* Illustrated gradient sky, stars, ringed planet & mountains */}
      <SceneryBackground dark={dark} />

      {/* Soft Grainient shader wash on capable visible desktop; static CSS gradient fallback otherwise */}
      {showShader ? (
        <div className="absolute inset-0 opacity-25 transition-opacity duration-700 dark:opacity-35">
          {dark ? (
            <Grainient
              color1="#4F46E5"
              color2="#7C3AED"
              color3="#0B0D17"
              timeSpeed={0.14}
              warpStrength={0.85}
              grainAmount={0.05}
              contrast={1.2}
              saturation={1.05}
              zoom={1}
            />
          ) : (
            <Grainient
              color1="#e9b20b"
              color2="#EF4444"
              color3="#7C3AED"
              timeSpeed={0.15}
              colorBalance={0}
              warpStrength={0.9}
              warpFrequency={4}
              warpSpeed={1.5}
              warpAmplitude={50}
              grainAmount={0.05}
              contrast={1.25}
              saturation={0.95}
              zoom={0.95}
            />
          )}
        </div>
      ) : (
        <div
          className="absolute inset-0 opacity-35 transition-opacity duration-700 dark:opacity-45"
          style={{
            background: dark
              ? "radial-gradient(circle at 15% 15%, rgba(140,69,112,0.35), transparent 50%), radial-gradient(circle at 85% 25%, rgba(79,70,229,0.28), transparent 55%)"
              : "radial-gradient(circle at 15% 15%, rgba(240,134,124,0.28), transparent 50%), radial-gradient(circle at 85% 25%, rgba(227,200,125,0.28), transparent 55%)",
          }}
        />
      )}

      {/* Readability veil so glass cards, tables and charts stay high-contrast */}
      <div className="absolute inset-0 bg-surface-cream/80 backdrop-blur-[2px] transition-colors duration-700 dark:bg-surface-night/60" />
    </div>
  );
}
