import { useState } from "react";
import { BookOpen, Calculator, ShieldAlert } from "lucide-react";
import AppLayout from "../components/AppLayout";
import MathFormula from "../components/MathFormula";
import {
  Card,
  DisclaimerBanner,
  GlassCard,
  Input,
  PageContainer,
  TrendBadge,
} from "../components/ui";

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
      <PageContainer>
        <DisclaimerBanner />

        {/* Interactive Calculator */}
        <Card as="section" variant="accent" padding="p-6">
          <div className="mb-3 flex items-center gap-2 text-brand-plum dark:text-brand-coral">
            <Calculator className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              Interactive Momentum Calculator
            </h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Enter a stock&apos;s adjusted price 252 trading days ago, its price 21 trading days ago, and its annualised volatility to see the 12-1M momentum formula computed live:
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-5">
              <Input
                label="Price 252d ago (₹)"
                type="number"
                min="0.01"
                step="any"
                value={price252}
                onChange={(e) => setPrice252(e.target.value)}
              />
              <Input
                label="Price 21d ago (₹)"
                type="number"
                min="0.01"
                step="any"
                value={price21}
                onChange={(e) => setPrice21(e.target.value)}
              />
              <Input
                label="Volatility (% p.a.)"
                type="number"
                min="0.1"
                step="any"
                value={annVol}
                onChange={(e) => setAnnVol(e.target.value)}
              />
            </div>

            <Card variant="well" padding="p-4" className="lg:col-span-7">
              {!validInputs ? (
                <p className="text-sm font-medium text-red-600 dark:text-red-300">
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
            </Card>
          </div>
        </Card>

        {/* Core concept cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GlassCard as="section" padding="p-6">
            <div className="mb-2 flex items-center gap-2 text-brand-plum dark:text-brand-coral">
              <BookOpen className="h-4 w-4" />
              <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
                1. What Is Momentum Investing?
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Cross-sectional momentum ranks stocks against peers by recent medium-term
              performance, systematically holding the strongest winners and avoiding laggards.
              Academic research (Jegadeesh &amp; Titman) attributes this persistence to investor
              underreaction to fundamentals, gradual institutional accumulation, and behavioral
              anchoring.
            </p>
          </GlassCard>

          <GlassCard as="section" padding="p-6">
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              2. The 12-1 Formula &amp; Why Latest Month Is Skipped
            </h2>
            <Card variant="well" padding="p-3" className="my-3">
              <MathFormula display math="R_{12-1}(t) = \frac{P_{t-21}}{P_{t-252}} - 1" />
            </Card>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              Over ~252 trading days (12 months), trends persist—but the most recent ~21 trading
              days (1 month) often exhibit short-term mean reversion from liquidity swings and
              earnings overreactions. Skipping the last month removes that noise.
            </p>
          </GlassCard>

          <GlassCard as="section" padding="p-6">
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              3. Volatility &amp; Volatility-Adjusted Score
            </h2>
            <Card variant="well" padding="p-3" className="my-3">
              <MathFormula
                display
                math="\sigma_{\text{ann}} = \sqrt{252} \cdot \text{std}(r_d), \qquad \text{Score} = \frac{R_{12-1}}{\sigma_{\text{ann}}}"
              />
            </Card>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              Dividing return by annualised daily volatility rewards stocks that compound
              steadily (a high return-to-risk ratio) over erratic high-beta spikes that carry
              larger drawdown risk.
            </p>
          </GlassCard>

          <GlassCard as="section" padding="p-6">
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              4. Moving Averages &amp; Trend Regimes
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
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
                <Card
                  key={item.trend}
                  variant="well"
                  padding="px-3.5 py-2"
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <TrendBadge trend={item.trend} />
                  <MathFormula math={item.rule} />
                </Card>
              ))}
            </div>
          </GlassCard>

          <GlassCard as="section" padding="p-6">
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              5. Relative Strength Index — RSI(14)
            </h2>
            <Card variant="well" padding="p-3" className="my-3">
              <MathFormula
                display
                math="\text{RSI} = 100 - \frac{100}{1 + RS}, \qquad RS = \frac{\text{EMA}_{14}(\text{Gain})}{\text{EMA}_{14}(\text{Loss})}"
              />
            </Card>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              Bounded between 0 and 100. Readings above 70 suggest short-term overbought
              conditions; readings below 30 suggest oversold pressure. In strong uptrends, RSI
              often stays between 40 and 80.
            </p>
          </GlassCard>

          <GlassCard as="section" padding="p-6">
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              6. Relative Strength vs Benchmark
            </h2>
            <Card variant="well" padding="p-3" className="my-3">
              <MathFormula
                display
                math="\text{RS}_t = 100 \times \frac{P_t / B_t}{P_0 / B_0}"
              />
            </Card>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              Measures whether a stock is outperforming the Nifty 200 index (<MathFormula math="B_t" />).
              A rising RS line confirms genuine sector/stock leadership rather than simply
              drifting upward with a rising market.
            </p>
          </GlassCard>

          <GlassCard as="section" padding="p-6">
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              7. Monthly Rebalancing &amp; T+1 Execution Lag
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              Signals are computed using only data available at month-end close{" "}
              <MathFormula math="T" />, and trades execute at the close of the next trading day{" "}
              <MathFormula math="T+1" />. Between rebalances, positions drift naturally with
              market prices without daily churn, keeping turnover and costs realistic.
            </p>
          </GlassCard>

          <GlassCard as="section" padding="p-6">
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              8. Sharpe Ratio &amp; Maximum Drawdown
            </h2>
            <Card variant="well" padding="p-3" className="my-3">
              <MathFormula
                display
                math="\text{Sharpe} = \frac{\mathbb{E}[r_d - r_f/252]}{\sigma(r_d)}\sqrt{252}, \qquad \text{MDD} = \min_t \left(\frac{V_t}{\max_{s \le t} V_s} - 1\right)"
              />
            </Card>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              Sharpe measures excess return above the 6.5% annual risk-free rate per unit of
              volatility; Maximum Drawdown captures the worst peak-to-trough equity decline.
            </p>
          </GlassCard>
        </div>

        {/* Risks section */}
        <GlassCard as="section" padding="p-6" className="relative overflow-hidden">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-brand-gold via-brand-coral to-brand-plum"
          />
          <div className="mb-3 flex items-center gap-2 pl-2 text-brand-plum dark:text-brand-gold">
            <ShieldAlert className="h-5 w-5 text-brand-coral dark:text-brand-gold" />
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              9. Key Risks: Momentum Crashes, Survivorship Bias &amp; Costs
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 pl-2 text-sm md:grid-cols-3">
            <Card variant="well" padding="p-4">
              <h3 className="font-semibold text-[var(--text-primary)]">
                Momentum Crashes
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                During sharp market reversals (e.g., sudden macro recoveries or rate shocks),
                former laggards can rally violently while recent leaders sell off simultaneously.
              </p>
            </Card>
            <Card variant="well" padding="p-4">
              <h3 className="font-semibold text-[var(--text-primary)]">
                Survivorship Bias
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                Using today&apos;s Nifty 200 constituent list excludes stocks that dropped out of the
                index in prior years, which can bias simulated historical returns upward.
              </p>
            </Card>
            <Card variant="well" padding="p-4">
              <h3 className="font-semibold text-[var(--text-primary)]">
                Costs &amp; Taxes
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                High annual turnover (~350–440%/yr) incurs brokerage, STT, slippage, and short-term
                capital gains taxes that materially affect real-world net returns.
              </p>
            </Card>
          </div>
        </GlassCard>
      </PageContainer>
    </AppLayout>
  );
}
