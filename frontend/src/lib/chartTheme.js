import { useMemo } from "react";
import { useTheme } from "../context/ThemeContext";

export function getChartTheme(dark) {
  return {
    dark,
    colors: {
      main: dark ? "#F0867C" : "#6E3559",
      second: dark ? "#E3C87D" : "#C98B20",
      third: "#C77FB0",
      benchmark: dark ? "#A8A29E" : "#8C7284",
      coral: "#F0867C",
      plum: dark ? "#C77FB0" : "#6E3559",
      gold: dark ? "#E3C87D" : "#C98B20",
      mauve: "#C77FB0",
      positive: dark ? "#34D399" : "#059669",
      negative: dark ? "#F87171" : "#DC2626",
      volume: dark ? "#8C4570" : "#6E3559",
      sma20: "#C77FB0",
      sma50: dark ? "#E3C87D" : "#C98B20",
      sma200: dark ? "#F0867C" : "#6E3559",
      series: [
        dark ? "#F0867C" : "#6E3559",
        dark ? "#E3C87D" : "#C98B20",
        "#C77FB0",
        dark ? "#34D399" : "#059669",
      ],
    },
    gridStroke: dark ? "rgba(240, 134, 124, 0.14)" : "rgba(110, 53, 89, 0.13)",
    axisTick: {
      fill: dark ? "#CBB7C3" : "#6A495F",
      fontSize: 11,
    },
    axisTickSm: {
      fill: dark ? "#CBB7C3" : "#6A495F",
      fontSize: 10,
    },
    axisLine: {
      stroke: dark ? "rgba(240, 134, 124, 0.22)" : "rgba(110, 53, 89, 0.22)",
    },
    referenceLine: dark ? "rgba(227, 200, 125, 0.35)" : "rgba(110, 53, 89, 0.32)",
    tooltipStyle: {
      backgroundColor: dark ? "rgba(43, 23, 64, 0.94)" : "rgba(255, 252, 248, 0.95)",
      backdropFilter: "blur(10px)",
      borderColor: dark ? "rgba(240, 134, 124, 0.35)" : "rgba(110, 53, 89, 0.25)",
      borderRadius: "14px",
      fontSize: "12px",
      color: dark ? "#F5F2EA" : "#2D153B",
      boxShadow: dark
        ? "0 16px 36px -8px rgba(140, 69, 112, 0.65)"
        : "0 12px 32px -8px rgba(110, 53, 89, 0.3)",
    },
    tooltipLabelStyle: {
      color: dark ? "#E3C87D" : "#6E3559",
      fontWeight: 700,
      marginBottom: "4px",
    },
    legendStyle: {
      fontSize: "12px",
      color: dark ? "#E7DCE2" : "#4D2B45",
      paddingTop: "8px",
    },
  };
}

export function useChartTheme() {
  const { dark } = useTheme();
  return useMemo(() => getChartTheme(dark), [dark]);
}
