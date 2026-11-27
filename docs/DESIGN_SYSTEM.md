# Momentum Investment — Design System Specification

Extracted directly from `frontend/src/pages/LandingPage.jsx`, `frontend/src/pages/LoginPage.jsx`, `frontend/src/components/SceneryBackground.jsx`, `frontend/tailwind.config.js`, and `frontend/src/index.css`.

---

## 1. Theme Architecture (Light & Dark Modes)

- **Strategy**: Class-based dark mode (`darkMode: "class"` in `tailwind.config.js`) toggled on `document.documentElement` (`html.dark`).
- **Default**: Light mode (`dark = false`) on both `LandingPage` and `LoginPage`, with a persistent Sun/Moon theme toggle button.
- **Transition**: Smooth surface and canvas color transitions (`transition-colors duration-700` on canvases/cards; `duration-300` on interactive controls).

---

## 2. Color Palette

### 2.1 Canvas & Surface Backgrounds

| Token | Light Value | Dark Value | Usage |
|---|---|---|---|
| Canvas Base | `#F5F2EA` (warm parchment) | `#07080F` (deep space) | Page background |
| Elevated Surface / Sidebar | `#FFFFFF` / `bg-white/80` | `#0B0D17` / `bg-stone-900/80` | Navigation bar, sidebar, header |
| Glass Card | `bg-white/80` – `bg-white/85` | `bg-stone-900/80` – `bg-stone-900/85` | Primary content cards |
| Auth / Warm Surface | `#F5F2EA` | `#1E1723` (plum-tinted dark) | Auth card & warm containers |
| Subtle Inset / Well | `bg-stone-100` / `bg-stone-100/70` | `bg-stone-800/80` / `bg-white/[0.04]` | Nested wells, hover rows, tags |
| Overlay / Scrim | `bg-black/40` – `bg-black/65` | `bg-black/45` – `bg-black/70` | Dark modal scrims, shader readability overlay |

### 2.2 Borders

| Token | Light Value | Dark Value | Usage |
|---|---|---|---|
| Hairline Nav / Divider | `border-stone-200/50` – `border-stone-200/80` | `border-stone-800/50` – `border-stone-700/80` | Header, footer, card section dividers |
| Card Border | `border-stone-200` | `border-stone-800` | Standard cards and panels |
| Control / Pill Border | `border-stone-300` / `border-stone-300/80` | `border-stone-700` / `border-stone-600` | Buttons, badges, selects, toggles |
| Input Underline | `border-stone-400/60` | `border-stone-600/60` | Minimal inputs |

### 2.3 Brand & Accent Colors

| Token | Light Value | Dark Value | Usage |
|---|---|---|---|
| Primary Plum | `#6E3559` | `#8C4570` | Primary CTAs, active pills, brand gradient end |
| Primary Plum Hover | `#5D2C4B` | `#7A3B61` | Primary CTA hover state |
| Coral / Terracotta | `#F0867C` | `#F0867C` | Brand gradient start, live dots, focus rings, highlight scores |
| Warm Gold | `#E3C87D` | `#E3C87D` | Gradient midpoint, quote attribution, planet accent |
| Pale Gold | `#F5DFA0` | `#5E7FB3` (dark starlight) | Ambient glow & ring highlights |
| Soft Orchid | `#C77FB0` | `#C77FB0` | Secondary feature accent |

### 2.4 Brand Gradients

- **Logo / Icon Tile / Step Badge**: `bg-gradient-to-br from-[#F0867C] to-[#6E3559]`
- **Hero Display Text**: `bg-gradient-to-r from-[#F0867C] via-[#E3C87D] to-[#6E3559] bg-clip-text text-transparent`
- **Dark Panel Text Gradient**: `bg-gradient-to-r from-[#F0867C] via-[#E3C87D] to-[#F5F2EA] bg-clip-text text-transparent`
- **Text Selection (`index.css`)**: `bg-indigo-500/30`

### 2.5 Text Hierarchy

| Role | Light Mode | Dark Mode |
|---|---|---|
| Primary Ink | `text-slate-900` / `text-stone-900` / `text-stone-800` | `text-white` / `text-stone-50` / `text-stone-100` |
| Secondary Body | `text-stone-700` / `text-stone-600` | `text-stone-300` |
| Muted / Caption | `text-stone-500` / `text-stone-400` | `text-stone-400` / `text-stone-500` |
| Input Placeholder | `placeholder:text-stone-300` / `stone-400` | `placeholder:text-stone-600` / `stone-500` |

### 2.6 Semantic & Market Status Colors

| State | Light Mode | Dark Mode |
|---|---|---|
| Positive / Gain | Text: `text-emerald-600` · Pill: `bg-emerald-50 text-emerald-700` · Tile: `bg-emerald-500/10 text-emerald-600` | Text: `text-emerald-400` · Pill: `bg-emerald-950/60 text-emerald-300` · Tile: `bg-emerald-500/20 text-emerald-400` |
| Negative / Loss | Text: `text-red-600` · Pill: `bg-red-50 text-red-700` · Tile: `bg-red-500/10 text-red-600` | Text: `text-red-400` · Pill: `bg-red-950/60 text-red-300` · Tile: `bg-red-500/20 text-red-400` |
| Warning / Info | Pill: `bg-amber-500/10 text-amber-700` / `text-amber-600` | Pill: `bg-amber-500/20 text-amber-400` |

---

## 3. Typography & Type Scale

- **Body Font (`font-sans`)**: `"Inter", system-ui, sans-serif` (weights: `400`, `500`, `600`, `700`)
- **Display Font (`font-display`)**: `"'Plus Jakarta Sans'", "Inter", sans-serif` (weights: `500`, `600`, `700`, `800`)
- **Rendering**: `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;`
- **Numeric Figures**: `tabular-nums` for prices, percentages, scores, ranks, and tables.

| Level | Classes | Usage |
|---|---|---|
| Hero H1 | `font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight` | Landing hero |
| Panel Display | `font-display text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight` | Auth hero panel |
| Section H2 | `font-display text-4xl sm:text-5xl font-bold tracking-tight` | Landing sections |
| Card Stat / Index | `font-display text-4xl font-bold tracking-tight` / `text-2xl font-bold` | StatCard & KPIs |
| Auth Title | `font-display text-[32px] font-bold leading-[1.15]` | Auth card header |
| Card Title | `font-display text-xl font-bold` / `text-base font-bold` | Section & feature cards |
| Body Lead | `text-lg` | Hero & CTA subtitles |
| Body / Control | `text-sm` (`14px`) / `text-base` (`16px`) | Nav items, buttons, descriptions |
| Caption / Label | `text-xs` (`12px`) | Metadata, table headers, badges |
| Eyebrow / Tag | `text-[10px]` – `text-[11px] font-semibold uppercase tracking-[0.16em]` | Micro labels |

---

## 4. Spacing, Radius & Glass Surfaces

- **Container**: `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` (app shell supports `max-w-[1440px]`)
- **Navbar / Topbar Height**: `h-16` (`64px`)
- **Card Padding**: `p-5` – `p-8` (standard cards), `p-10` – `p-12` (CTA / empty panels)
- **Grid Gaps**: `gap-4` (`16px`) for compact KPI/filter grids, `gap-6` (`24px`) for primary sections

### Border Radii

| Element | Radius |
|---|---|
| Pills, Primary/Secondary Buttons, Theme Toggle, Status Badges | `rounded-full` |
| Feature / CTA / Auth Cards | `rounded-3xl` / `rounded-[24px]` / `rounded-[28px]` |
| Standard Cards, Tables, Panels | `rounded-2xl` (`16px`) |
| OAuth / Secondary Rectangular Buttons | `rounded-[14px]` |
| Logo Tiles, Inset Controls, Inputs, Selects, List Hover Items | `rounded-xl` (`12px`) |
| Small Icon Boxes, Sub-badges | `rounded-lg` (`8px`) / `rounded-md` (`6px`) |

### Glass & Blur

- Navigation & Topbar: `bg-white/80 backdrop-blur-lg dark:bg-stone-900/80`
- Standard Glass Cards: `bg-white/85 backdrop-blur-md dark:bg-stone-900/85` (or `/80` + `backdrop-blur-sm`)
- Quote / Floating Overlay: `backdrop-blur-xl`

---

## 5. Shadows & Elevation

- **Primary Plum CTA Glow**: `shadow-lg shadow-[#6E3559]/30 dark:shadow-[#8C4570]/30` (Hero CTA uses `shadow-xl`; circular submit uses `shadow-[#6E3559]/40`)
- **Standard Card Shadow**: `shadow-lg` / `shadow-xl` (`hover:shadow-2xl` on interactive insight cards)
- **Deep Auth Card Shadow**: `shadow-[0_30px_90px_-30px_rgba(0,0,0,0.8)]`
- **Floating Control Shadow**: `shadow-[0_8px_24px_rgba(0,0,0,0.14)]`
- **Logo / Step Tile Shadow**: `shadow-md` / `shadow-lg`

---

## 6. Interactive Controls & Badges

- **Primary Button**: Pill (`rounded-full`) or workspace action (`rounded-xl`), `bg-[#6E3559] hover:bg-[#5D2C4B] dark:bg-[#8C4570] dark:hover:bg-[#7A3B61] text-white font-semibold shadow-lg shadow-[#6E3559]/30 dark:shadow-[#8C4570]/30`, subtle hover lift/scale.
- **Secondary Button**: `border border-stone-300 bg-white/80 text-stone-700 backdrop-blur-sm hover:border-[#6E3559] dark:border-stone-700 dark:bg-stone-800/80 dark:text-stone-300 dark:hover:border-[#F0867C]`.
- **Nav Link Underline**: `after:h-[2px] after:bg-[#6E3559] dark:after:bg-[#F0867C] after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300`.
- **Brand Mark**: `h-9 w-9 rounded-xl bg-gradient-to-br from-[#F0867C] to-[#6E3559] shadow-md` with white filled `<Zap />` icon + `font-display font-bold tracking-tight`.

---

## 7. Background & Motion

- **Landing & Login Background**: `<SceneryBackground dark={dark} />` (sky, stars, ringed planet, comets, clouds, mountains) + `<Grainient />` WebGL shader in Login right panel.
- **Data Workspace ("Momentum Lab") Background**: Calmer static ambient wash on `#F5F2EA` (light) / `#07080F` (dark) using subtle radial gradients from `#F0867C`, `#E3C87D`, and `#6E3559`/`#8C4570` so dense tables and Recharts remain legible and fast.
- **Motion System (`framer-motion`)**:
  - Signature easing: `[0.22, 1, 0.36, 1]`
  - Entrance fade-up: `opacity: 0, y: 12–20` → `opacity: 1, y: 0` (`duration: 0.35–0.6`)
  - Stagger containers: `staggerChildren: 0.07–0.1`
  - Respects `prefers-reduced-motion: reduce` (disables transforms and long transitions).
