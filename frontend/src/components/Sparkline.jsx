import { useId, useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

export default function Sparkline({ data = [], positive, height = 34 }) {
  const gradId = useId();

  const chartData = useMemo(
    () => (Array.isArray(data) ? data.map((v, idx) => ({ idx, v })) : []),
    [data]
  );

  if (chartData.length < 2) {
    return <span className="text-xs text-stone-500">—</span>;
  }

  const isUp =
    positive !== undefined
      ? positive
      : chartData[chartData.length - 1].v >= chartData[0].v;
  const stroke = isUp ? "#34d399" : "#fb7185";

  return (
    <div style={{ width: "100%", height }} className="min-w-[84px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 3, right: 2, bottom: 3, left: 2 }}>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Line
            key={gradId}
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
