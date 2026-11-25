import { BookOpen, ShieldAlert } from "lucide-react";
import AppLayout from "../components/AppLayout";
import MathFormula from "../components/MathFormula";
import TrendBadge from "../components/TrendBadge";

export default function Learn() {
  return (
    <AppLayout
      title="Quantitative Methodology"
      subtitle="Mathematical definitions, trend classification rules, and backtesting assumptions"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-6 shadow-lg">
          <div className="mb-3 flex items-center gap-2 text-[#F0867C]">
            <BookOpen className="h-4 w-4" />
            <h2 className="font-display text-lg font-bold text-white">
              12-1 Month Momentum Formula
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-stone-300">
            Classic cross-sectional momentum measures trailing return over approximately
            one year (<MathFormula math="252" /> trading days) while skipping the most recent
            month (<MathFormula math="21" /> trading days):
          </p>
          <div className="my-4 rounded-xl border border-white/10 bg-[#07080F] p-4">
            <MathFormula
              display
              math="R_{12-1}(t) = \frac{P_{t-21}}{P_{t-252}} - 1"
            />
          </div>
          <p className="text-sm leading-relaxed text-stone-400">
            Skipping the final 21 trading days removes short-term microstructure reversal
            and post-earnings mean reversion noise, isolating intermediate-term trend continuation.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-6 shadow-lg">
          <h2 className="font-display text-lg font-bold text-white">
            Volatility-Adjusted Scoring
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">
            To avoid ranking erratic high-beta spikes above steady compounders, raw momentum
            is divided by annualised daily return volatility:
          </p>
          <div className="my-4 rounded-xl border border-white/10 bg-[#07080F] p-4">
            <MathFormula
              display
              math="\sigma_{\text{ann}} = \sqrt{252} \cdot \text{std}(r_d), \qquad \text{Score} = \frac{R_{12-1}}{\sigma_{\text{ann}}}"
            />
          </div>
          <p className="text-sm leading-relaxed text-stone-400">
            Stocks with fewer than <MathFormula math="252 + 21 = 273" /> prior trading days
            or missing prices at <MathFormula math="t-21" /> or <MathFormula math="t-252" /> are
            excluded rather than forward-filled.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-6 shadow-lg">
          <h2 className="font-display text-lg font-bold text-white">
            Moving-Average Trend Regimes
          </h2>
          <p className="mt-2 text-sm text-stone-400">
            Every stock is assigned a rule-based regime comparing its latest close against
            its 50-day and 200-day simple moving averages:
          </p>
          <div className="mt-4 space-y-3">
            {[
              { trend: "Strong uptrend", rule: "P > \\text{SMA}_{50} > \\text{SMA}_{200}" },
              { trend: "Pullback", rule: "\\text{SMA}_{200} < P < \\text{SMA}_{50}" },
              { trend: "Weakening", rule: "P < \\text{SMA}_{200} < \\text{SMA}_{50}" },
              { trend: "Downtrend", rule: "P < \\text{SMA}_{50} < \\text{SMA}_{200}" },
            ].map((item) => (
              <div
                key={item.trend}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#07080F] px-4 py-2.5"
              >
                <TrendBadge trend={item.trend} size="md" />
                <MathFormula math={item.rule} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-6 shadow-lg">
          <h2 className="font-display text-lg font-bold text-white">
            Backtesting Rules &amp; Risk Metrics
          </h2>
          <div className="mt-3 space-y-3 text-sm text-stone-300">
            <div className="rounded-xl border border-white/10 bg-[#07080F] p-3.5">
              <MathFormula
                display
                math="\text{Sharpe} = \frac{\mathbb{E}[r_d - r_f/252]}{\sigma(r_d)} \sqrt{252}, \quad r_f = 6.5\%"
              />
              <p className="mt-1 text-xs text-stone-400">
                Signals computed on month-end close <MathFormula math="T" /> execute at the
                close of <MathFormula math="T+1" /> with <MathFormula math="20\text{ bps}" /> one-way cost per rupee traded.
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5 text-xs text-amber-200/90">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>Research Caveats:</strong> Subject to survivorship bias (current Nifty 200
                constituents), ~6 years of price history, and simplified cost assumptions excluding
                STCG/LTCG taxes and market-impact slippage. Not investment advice.
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
