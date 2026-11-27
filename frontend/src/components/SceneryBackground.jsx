/* ---------- SceneryBackground ----------
   Illustrated gradient-sky backdrop: mountains, a ringed planet,
   drifting clouds, and two comet streaks (a quiet nod to "momentum").
   Pass `dark` to shift the whole scene into deep blues instead of
   fading opacity — the sky, mountains, and planet all recolor together.
------------------------------------------------------------------ */

const STARS = [
  [80, 60, 1.4], [140, 40, 1], [230, 90, 1.6], [320, 50, 1],
  [420, 30, 1.3], [520, 70, 1], [610, 40, 1.5], [700, 90, 1],
  [60, 180, 1], [180, 150, 1.2], [380, 170, 1], [480, 140, 1.4],
  [40, 320, 1], [740, 220, 1.3], [760, 340, 1], [260, 30, 1],
];

const EASE = "0.9s ease";

export default function SceneryBackground({
  dark = false,
  skyOpacity = 1,
  mountainOpacity = 1,
  className = "",
}) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 800 900"
        preserveAspectRatio="xMidYMax slice"
        className="h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sb-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: dark ? "#040611" : "#7c3aED", transition: `stop-color ${EASE}` }} />
            <stop offset="100%" style={{ stopColor: dark ? "#123A6B" : "#7c3aED", transition: `stop-color ${EASE}` }} />
          </linearGradient>

          <radialGradient id="sb-planet-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: dark ? "#5E7FB3" : "#F5DFA0", stopOpacity: 0.55, transition: `stop-color ${EASE}` }} />
            <stop offset="100%" style={{ stopColor: dark ? "#5E7FB3" : "#F5DFA0", stopOpacity: 0, transition: `stop-color ${EASE}` }} />
          </radialGradient>

          <linearGradient id="sb-mtn-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: dark ? "#0E2748" : "#99fc11", transition: `stop-color ${EASE}` }} />
            <stop offset="100%" style={{ stopColor: dark ? "#08182E" : "#99fc11", transition: `stop-color ${EASE}` }} />
          </linearGradient>

          <linearGradient id="sb-mtn-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: dark ? "#081A32" : "#d65656", transition: `stop-color ${EASE}` }} />
            <stop offset="100%" style={{ stopColor: dark ? "#040F1E" : "#d65656", transition: `stop-color ${EASE}` }} />
          </linearGradient>

          <linearGradient id="sb-comet" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: dark ? "#BFD4FF" : "#FFF3D6", stopOpacity: 0, transition: `stop-color ${EASE}` }} />
            <stop offset="100%" style={{ stopColor: dark ? "#BFD4FF" : "#FFF3D6", stopOpacity: 0.9, transition: `stop-color ${EASE}` }} />
          </linearGradient>
        </defs>

        {/* sky */}
        <rect x="0" y="0" width="800" height="900" fill="url(#sb-sky)" fillOpacity={skyOpacity} />

        {/* stars — only read in dark mode */}
        <g style={{ opacity: dark ? 0.9 : 0.12, transition: `opacity ${EASE}` }}>
          {STARS.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="#EAF1FF" />
          ))}
        </g>

        {/* ringed planet */}
        <circle cx="620" cy="150" r="130" fill="url(#sb-planet-glow)" />
        <circle
          cx="620" cy="150" r="46"
          style={{ fill: dark ? "#345580" : "#E3C87D", transition: `fill ${EASE}` }}
        />
        <ellipse
          cx="620" cy="150" rx="80" ry="14"
          fill="none" strokeWidth="3" opacity="0.55"
          transform="rotate(-18 620 150)"
          style={{ stroke: dark ? "#5E7FB3" : "#F5DFA0", transition: `stroke ${EASE}` }}
        />

        {/* comet streaks */}
        <line x1="90" y1="120" x2="235" y2="205" stroke="url(#sb-comet)" strokeWidth="3" strokeLinecap="round" />
        <line x1="500" y1="330" x2="600" y2="382" stroke="url(#sb-comet)" strokeWidth="2.5" strokeLinecap="round" />

        {/* clouds — fade out in dark mode */}
        <g style={{ opacity: dark ? 0.1 : 0.75, transition: `opacity ${EASE}` }} fill="#FBF3E9">
          <ellipse cx="150" cy="260" rx="95" ry="26" />
          <ellipse cx="212" cy="245" rx="60" ry="20" />
          <ellipse cx="660" cy="360" rx="80" ry="22" />
        </g>

        {/* mountains — back ridge */}
        <polygon
          points="0,620 120,430 260,560 360,380 480,560 620,410 760,560 800,520 800,900 0,900"
          fill="url(#sb-mtn-back)"
          fillOpacity={mountainOpacity}
        />

        {/* mountains — front ridge, drifting into a gentle uptrend */}
        <polygon
          points="0,720 150,650 300,690 420,540 560,610 700,470 800,530 800,900 0,900"
          fill="url(#sb-mtn-front)"
          fillOpacity={mountainOpacity}
        />

        {/* peak marker at the high point */}
        <circle cx="700" cy="470" r="6" style={{ fill: dark ? "#8FB3E8" : "#F5DFA0", transition: `fill ${EASE}` }} />
      </svg>
    </div>
  );
}