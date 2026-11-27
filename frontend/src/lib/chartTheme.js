import { useMemo } from "react";
import { useTheme } from "../context/ThemeContext";

export function getChartTheme(dark) {
  return {
    dark,
    colors: {
      main: dark ? "#F0867C" : "#6E3559",
      second: "#E3C87D",
      third: "#C77FB0",
      benchmark: "#A8A29E", // Tailwind stone-400
      coral: "#F0867C",
      plum: dark ? "#C77FB0" : "#6E3559",
      gold: "#E3C87D",
      mauve: "#C77FB0",
      positive: dark ? "#34D399" : "#059669",
      negative: dark ? "#F87171" : "#DC2626",
      volume: dark ? "#8C4570" : "#6E3559",
      sma20: "#C77FB0",
      sma50: "#E3C87D",
      sma200: dark ? "#F0867C" : "#6E3559",
      series: [
        dark ? "#F0867C" : "#6E3559",
        "#E3C87D",
        "#C77FB0",
        dark ? "#34D399" : "#059669",
      ],
    },
    gridStroke: dark ? "rgba(168, 162, 158, 0.14)" : "rgba(120, 113, 108, 0.18)",
    axisTick: {
      fill: dark ? "#A8A29E" : "#57534E",
      fontSize: 11,
    },
    axisTickSm: {
      fill: dark ? "#A8A29E" : "#57534E",
      fontSize: 10,
    },
    axisLine: {
      stroke: dark ? "rgba(168, 162, 158, 0.18)" : "rgba(120, 113, 108, 0.25)",
    },
    referenceLine: dark ? "rgba(214, 211, 209, 0.25)" : "rgba(110, 53, 89, 0.28)",
    tooltipStyle: {
      backgroundColor: dark ? "rgba(28, 25, 23, 0.88)" : "rgba(255, 255, 255, 0.90)",
      backdropFilter: "blur(12px)",
      borderColor: dark ? "#292524" : "#E7E5E4",
      borderRadius: "12px",
      fontSize: "12px",
      color: dark ? "#F5F5F4" : "#1C1917",
      boxShadow: dark
        ? "0 16px 36px -8px rgba(0, 0, 0, 0.65)"
        : "0 12px 32px -8px rgba(28, 25, 23, 0.14)",
    },
    tooltipLabelStyle: {
      color: dark ? "#D6D3D1" : "#44403C",
      fontWeight: 600,
      marginBottom: "4px",
    },
    legendStyle: {
      fontSize: "12px",
      color: dark ? "#D6D3D1" : "#44403C",
      paddingTop: "8px",
    },
  };
}

export function useChartTheme() {
  const { dark } = useTheme();
  return useMemo(() => getChartTheme(dark), [dark]);
}
