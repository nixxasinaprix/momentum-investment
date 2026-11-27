import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import Grainient from "./grainient";
import SceneryBackground from "./SceneryBackground";

function canRunWebGLShader() {
  if (typeof window === "undefined") return false;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 8 : 8;
  return !reducedMotion && cores > 2;
}

export default function AppBackground() {
  const { dark } = useTheme();
  const [shaderAllowed, setShaderAllowed] = useState(() => canRunWebGLShader());
  const [tabVisible, setTabVisible] = useState(() =>
    typeof document !== "undefined" ? !document.hidden : true
  );

  useEffect(() => {
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateCapability = () => setShaderAllowed(canRunWebGLShader());
    const updateVisibility = () => setTabVisible(!document.hidden);

    mqMotion.addEventListener("change", updateCapability);
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      mqMotion.removeEventListener("change", updateCapability);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const showShader = shaderAllowed && tabVisible;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-surface-cream transition-colors duration-700 dark:bg-surface-night"
    >
      {/* Layer 1: Vivid Grainient shader at full opacity (or static gradient fallback when hidden / reduced-motion) */}
      {showShader ? (
        <div className="absolute inset-0">
          {dark ? (
            <Grainient
              color1="#4F46E5"
              color2="#7C3AED"
              color3="#0B0D17"
              timeSpeed={0.2}
              warpStrength={0.9}
              grainAmount={0.08}
              contrast={1.25}
              saturation={1.1}
              zoom={1}
            />
          ) : (
            <Grainient
              color1="#e9b20b"
              color2="#EF4444"
              color3="#7C3AED"
              timeSpeed={0.22}
              colorBalance={0}
              warpStrength={1}
              warpFrequency={5}
              warpSpeed={2}
              warpAmplitude={50}
              blendAngle={0}
              blendSoftness={0.05}
              rotationAmount={500}
              noiseScale={2}
              grainAmount={0.08}
              grainScale={2}
              grainAnimated={false}
              contrast={1.35}
              gamma={1}
              saturation={1.1}
              centerX={0}
              centerY={0}
              zoom={0.9}
            />
          )}
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: dark
              ? "linear-gradient(135deg, #0B0D17 0%, #4F46E5 50%, #7C3AED 100%)"
              : "linear-gradient(135deg, #e9b20b 0%, #EF4444 48%, #7C3AED 100%)",
          }}
        />
      )}

      {/* Layer 2: Crisp illustrated SceneryBackground with translucent sky & mountains so Grainient shines through */}
      <SceneryBackground
        dark={dark}
        skyOpacity={dark ? 0.42 : 0.25}
        mountainOpacity={dark ? 0.78 : 0.28}
      />

      {/* Layer 3 (dark mode only): soft coral & plum corner radial glows so corners stay rich, never flat black */}
      {dark && (
        <div className="absolute inset-0">
          <div
            className="absolute -left-24 -top-24 h-[460px] w-[460px] rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(240,134,124,0.25) 0%, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-24 -right-24 h-[520px] w-[520px] rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(140,69,112,0.28) 0%, transparent 70%)" }}
          />
        </div>
      )}
    </div>
  );
}
