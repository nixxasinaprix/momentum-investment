import { useState } from "react";
import { BookOpen, Calculator, ShieldAlert } from "lucide-react";
import AppLayout from "../components/AppLayout";
import MathFormula from "../components/MathFormula";
import TrendBadge from "../components/TrendBadge";

export default function Learn() {
  const [price252, setPrice252] = useState("1000");
  const [price21, setPrice21] = useState("1350");
  const [annVol, setAnnVol] = useState("25");

  const pStart = Number(price252);
  const pEnd = Number(price21);
  const volDec = Number(annVol) / 100;
  const validInputs =
    Number.isFinite(pStart) &&
    Number.isFinite(pEnd) &&
    pStart > 0 &&
    pEnd > 0;
  const rawMom = validInputs ? pEnd / pStart - 1 : null;
  const adjScore =
    rawMom !== null && Number.isFinite(volDec) && volDec > 0
      ? rawMom / volDec
      : null;

  return (
    <AppLayout
      title="Momentum 101"
      subtitle="Plain-English intuition and KaTeX mathematics behind every indicator and backtest rule"
    >
      <div className="space-y-6">
        {/* Interactive Calculator */}
        <section className="rounded-2xl border border-[#F0867C]/30 bg-gradient-to-br from-[#161425] to-[#12131F] p-6 shadow-lg">
          <div className="mb-3 flex items-center gap-2 text-[#F0867C]">
            <Calculator className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-white">
              Interactive Momentum Calculator
            </h2>
          </div>
          <p className="text-sm text-stone-300">
            Enter a stock&apos;s adjusted price 252 trading days ago, its price 21 trading days ago, and its annualised volatility to see the 12-1M momentum formula computed live:
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-5">
              <label className="text-xs text-stone-400">
                Price 252d ago (₹)
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={price252}
                  onChange={(e) => setPrice252(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
                />
              </label>
              <label className="text-xs text-stone-400">
                Price 21d ago (₹)
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={price21}
                  onChange={(e) => setPrice21(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
                />
              </label>
              <label className="text-xs text-stone-400">
                Volatility (% p.a.)
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={annVol}
                  onChange={(e) => setAnnVol(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
                />
              </label>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07080F] p-4 lg:col-span-7">
              {!validInputs ? (
                <p className="text-sm text-rose-300">
                  Enter positive numbers for both prices to compute momentum.
                </p>
              ) : (
                <div className="space-y-2">
                  <MathFormula
                    display
                    math={`R_{12-1} = \\frac{${pEnd.toFixed(2)}}{${pStart.toFixed(
                      2
                    )}} - 1 = ${(rawMom * 100).toFixed(2)}\\%`}
                  />
                  {adjScore !== null && (
                    <MathFormula
                      display
                      math={`\\text{Score} = \\frac{${rawMom.toFixed(
                        4
                      )}}{${volDec.toFixed(4)}} = ${adjScore.toFixed(3)}`}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Core concept cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-6 shadow-lg">
            <div className="mb-2 flex items-center gap-2 text-[#F0867C]">
              <BookOpen className="h-4 w-4" />
              <h2 className="font-display text-lg font-bold text-white">
                1. What Is Momentum Investing?
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-stone-300">
              Cross-sectional momentum ranks stocks against peers by recent medium-term
              performance, systematically holding the strongest winners and avoiding laggards.
              Academic research (Jegadeesh &amp; Titman) attributes this persistence to investor
              underreaction to fundamentals, gradual institutional accumulation, and behavioral
              anchoring.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-6 shadow-lg">
            <h2 className="font-display text-lg font-bold text-white">
              2. The 12-1 Formula &amp; Why Latest Month Is Skipped
            </h2>
            <div className="my-3 rounded-xl border border-white/10 bg-[#07080F] p-3">
              <MathFormula display math="R_{12-1}(t) = \frac{P_{t-21}}{P_{t-252}} - 1" />
            </div>
            <p className="text-sm leading-relaxed text-stone-400">
              Over ~252 trading days (12 months), trends persist—but the most recent ~21 trading
              days (1 month) often exhibit short-term mean reversion from liquidity swings and
              earnings overreactions. Skipping the last month removes that noise.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-6 shadow-lg">
            <h2 className="font-display text-lg font-bold text-white">
              3. Volatility &amp; Volatility-Adjusted Score
            </h2>
            <div className="my-3 rounded-xl border border-white/10 bg-[#07080F] p-3">
              <MathFormula
                display
                math="\sigma_{\text{ann}} = \sqrt{252} \cdot \text{std}(r_d), \qquad \text{Score} = \frac{R_{12-1}}{\sigma_{\text{ann}}}"
              />
            </div>
            <p className="text-sm leading-relaxed text-stone-400">
              Dividing return by annualised daily volatility rewards stocks that compound
              steadily (a high return-to-risk ratio) over erratic high-beta spikes that carry
              larger drawdown risk.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-6 shadow-lg">
            <h2 className="font-display text-lg font-bold text-white">
              4. Moving Averages &amp; Trend Regimes
            </h2>
            <p className="mt-1 text-sm text-stone-400">
              Simple moving averages (<MathFormula math="\text{SMA}_{50}" /> and{" "}
              <MathFormula math="\text{SMA}_{200}" />) classify market structure:
            </p>
            <div className="mt-3 space-y-2">
              {[
                { trend: "Strong uptrend", rule: "P > \\text{SMA}_{50} > \\text{SMA}_{200}" },
                { trend: "Pullback", rule: "\\text{SMA}_{200} < P < \\text{SMA}_{50}" },
                { trend: "Weakening", rule: "P < \\text{SMA}_{200} < \\text{SMA}_{50}" },
                { trend: "Downtrend", rule: "P < \\text{SMA}_{50} < \\text{SMA}_{200}" },
              ].map((item) => (
                <div
                  key={item.trend}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#07080F] px-3.5 py-2"
                >
                  <TrendBadge trend={item.trend} />
                  <MathFormula math={item.rule} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-6 shadow-lg">
            <h2 className="font-display text-lg font-bold text-white">
              5. Relative Strength Index — RSI(14)
            </h2>
            <div className="my-3 rounded-xl border border-white/10 bg-[#07080F] p-3">
              <MathFormula
                display
                math="\text{RSI} = 100 - \frac{100}{1 + RS}, \qquad RS = \frac{\text{EMA}_{14}(\text{Gain})}{\text{EMA}_{14}(\text{Loss})}"
              />
            </div>
            <p className="text-sm leading-relaxed text-stone-400">
              Bounded between 0 and 100. Readings above 70 suggest short-term overbought
              conditions; readings below 30 suggest oversold pressure. In strong uptrends, RSI
              often stays between 40 and 80.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-6 shadow-lg">
            <h2 className="font-display text-lg font-bold text-white">
              6. Relative Strength vs Benchmark
            </h2>
            <div className="my-3 rounded-xl border border-white/10 bg-[#07080F] p-3">
              <MathFormula
                display
                math="\text{RS}_t = 100 \times \frac{P_t / B_t}{P_0 / B_0}"
              />
            </div>
            <p className="text-sm leading-relaxed text-stone-400">
              Measures whether a stock is outperforming the Nifty 200 index (<MathFormula math="B_t" />).
              A rising RS line confirms genuine sector/stock leadership rather than simply
              drifting upward with a rising market.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-6 shadow-lg">
            <h2 className="font-display text-lg font-bold text-white">
              7. Monthly Rebalancing &amp; T+1 Execution Lag
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-300">
              Signals are computed using only data available at month-end close{" "}
              <MathFormula math="T" />, and trades execute at the close of the next trading day{" "}
              <MathFormula math="T+1" />. Between rebalances, positions drift naturally with
              market prices without daily churn, keeping turnover and costs realistic.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-6 shadow-lg">
            <h2 className="font-display text-lg font-bold text-white">
              8. Sharpe Ratio &amp; Maximum Drawdown
            </h2>
            <div className="my-3 rounded-xl border border-white/10 bg-[#07080F] p-3">
              <MathFormula
                display
                math="\text{Sharpe} = \frac{\mathbb{E}[r_d - r_f/252]}{\sigma(r_d)}\sqrt{252}, \qquad \text{MDD} = \min_t \left(\frac{V_t}{\max_{s \le t} V_s} - 1\right)"
              />
            </div>
            <p className="text-sm leading-relaxed text-stone-400">
              Sharpe measures excess return above the 6.5% annual risk-free rate per unit of
              volatility; Maximum Drawdown captures the worst peak-to-trough equity decline.
            </p>
          </section>
        </div>

        {/* Risks section */}
        <section className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-6">
          <div className="mb-3 flex items-center gap-2 text-amber-200">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-white">
              9. Key Risks: Momentum Crashes, Survivorship Bias &amp; Costs
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 text-sm text-stone-300 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-[#07080F]/70 p-4">
              <h3 className="font-semibold text-white">Momentum Crashes</h3>
              <p className="mt-1 text-xs leading-relaxed text-stone-400">
                During sharp market reversals (e.g., sudden macro recoveries or rate shocks),
                former laggards can rally violently while recent leaders sell off simultaneously.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#07080F]/70 p-4">
              <h3 className="font-semibold text-white">Survivorship Bias</h3>
              <p className="mt-1 text-xs leading-relaxed text-stone-400">
                Using today&apos;s Nifty 200 constituent list excludes stocks that dropped out of the
                index in prior years, which can bias simulated historical returns upward.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#07080F]/70 p-4">
              <h3 className="font-semibold text-white">Costs &amp; Taxes</h3>
              <p className="mt-1 text-xs leading-relaxed text-stone-400">
                High annual turnover (~350–440%/yr) incurs brokerage, STT, slippage, and short-term
                capital gains taxes that materially affect real-world net returns.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
