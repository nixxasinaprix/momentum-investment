export const DEFAULT_PIPELINE_PARAMS = {
  min_market_cap_cr: 5000,
  unknown_mcap_policy: "exclude",
  min_price: 50,
  min_avg_traded_value_cr: 5,
  min_history_days: 273,
  above_200dma: true,
  max_pct_below_52w_high: 25,
  excluded_sectors: [],
  method: "vol_adjusted",
  lookback_days: 252,
  skip_days: 21,
  top_n: 20,
};
