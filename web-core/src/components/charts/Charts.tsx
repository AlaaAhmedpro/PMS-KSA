import { useEffect, useRef } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../../store/ThemeContext";
import { formatNumber } from "../../lib/format";

const PIE_COLORS = ["#7cb342", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

function useAxis() {
  const { theme } = useTheme();
  const tick = theme === "dark" ? "#94a3b8" : "#64748b";
  const grid = theme === "dark" ? "#334155" : "#e2e8f0";
  const tooltipBg = theme === "dark" ? "#1e2430" : "#ffffff";
  const tooltipBorder = theme === "dark" ? "#334155" : "#e2e8f0";
  return { tick, grid, tooltipBg, tooltipBorder };
}

const tooltipStyle = (bg: string, border: string) => ({
  contentStyle: {
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 12,
    fontSize: 12,
    fontFamily: "Cairo, sans-serif",
    direction: "rtl" as const,
  },
  labelStyle: { color: "#94a3b8" },
});

const PERF_BAR_WIDTH = 88;
const PERF_CHART_HEIGHT = 288;

export function BranchPerformanceChart({
  data,
}: {
  data: { name: string; منجز: number; متأخر: number }[];
}) {
  const { tick, grid, tooltipBg, tooltipBorder } = useAxis();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollMinWidth = Math.max(data.length * PERF_BAR_WIDTH, 1);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = 0;
  }, [data]);

  return (
    <div className="perf-chart">
      <div className="perf-chart__legend" aria-hidden={false}>
        <PerfLegendItem color="#7cb342" label="منجز" />
        <PerfLegendItem color="#ef4444" label="متأخر" />
      </div>

      <div
        ref={scrollRef}
        className="perf-chart__scroll chart-scroll-x"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className="perf-chart__canvas"
          style={{
            width: `max(100%, ${scrollMinWidth}px)`,
            height: PERF_CHART_HEIGHT,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              barGap={6}
              barCategoryGap="18%"
              margin={{
                top: 12,
                right: 20,
                left: 8,
                bottom: 8,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                tick={{
                  fill: tick,
                  fontSize: 11,
                  fontFamily: "Cairo",
                }}
                tickMargin={8}
                tickLine={false}
                axisLine={{ stroke: grid }}
              />
              <YAxis
                width={44}
                tick={{ fill: tick, fontSize: 11, fontFamily: "Cairo" }}
                tickLine={false}
                axisLine={{ stroke: grid }}
                tickMargin={6}
              />
              <Tooltip
                cursor={{ fill: "rgba(124,179,66,0.08)" }}
                {...tooltipStyle(tooltipBg, tooltipBorder)}
              />
              <Bar
                dataKey="منجز"
                name="منجز"
                fill="#7cb342"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="متأخر"
                name="متأخر"
                fill="#ef4444"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function PerfLegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="perf-chart__legend-item">
      <span
        className="perf-chart__legend-swatch"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

export function CategoryPieChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const { tooltipBg, tooltipBorder } = useAxis();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={3}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle(tooltipBg, tooltipBorder)} />
        <Legend wrapperStyle={{ fontFamily: "Cairo", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function FlowLineChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const { tick, grid, tooltipBg, tooltipBorder } = useAxis();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7cb342" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#7cb342" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: tick, fontSize: 12, fontFamily: "Cairo" }} tickLine={false} axisLine={{ stroke: grid }} />
        <YAxis tick={{ fill: tick, fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ stroke: "#7cb342" }} {...tooltipStyle(tooltipBg, tooltipBorder)} />
        <Line
          type="monotone"
          dataKey="value"
          name="المسجّل"
          stroke="#7cb342"
          strokeWidth={3}
          dot={{ r: 4, fill: "#7cb342" }}
          activeDot={{ r: 6 }}
          fill="url(#flowGrad)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Modern ranked bar list with white labels overlaid on colored bars. */
export function RankedBars({
  data,
  color = "#7cb342",
}: {
  data: { name: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5 py-1">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div
            key={d.name}
            className="relative flex h-11 items-center overflow-hidden rounded-xl bg-steel-800 shadow-soft dark:bg-steel-800/80"
          >
            <div
              className="absolute inset-y-0 right-0 transition-[width] duration-500 ease-out"
              style={{
                width: `${Math.max(pct, 7)}%`,
                background: `linear-gradient(270deg, ${color}, ${color}b3)`,
              }}
            />
            <div className="relative z-10 flex w-full items-center justify-between px-3.5">
              <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-white">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/25 text-[11px] font-extrabold">
                  {i + 1}
                </span>
                <span className="truncate drop-shadow-sm">{d.name}</span>
              </span>
              <span className="shrink-0 text-sm font-extrabold tabular-nums text-white drop-shadow-sm">
                {formatNumber(d.value)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HorizontalBarChart({
  data,
  color = "#0ea5e9",
}: {
  data: { name: string; value: number }[];
  color?: string;
}) {
  const { tick, grid, tooltipBg, tooltipBorder } = useAxis();
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: tick, fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fill: tick, fontSize: 12, fontFamily: "Cairo" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip cursor={{ fill: "rgba(124,179,66,0.08)" }} {...tooltipStyle(tooltipBg, tooltipBorder)} />
        <Bar dataKey="value" name="العدد" fill={color} radius={[0, 6, 6, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** مقارنة بسيطة: الميزانية مقابل المنصرف لمشاريع مختارة */
export function BudgetCompareChart({
  data,
}: {
  data: { name: string; ميزانية: number; منصرف: number }[];
}) {
  const { tick, grid, tooltipBg, tooltipBorder } = useAxis();
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 48)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        barGap={4}
        barCategoryGap="22%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: tick, fontSize: 11, fontFamily: "Cairo" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatNumber(v)}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={112}
          tick={{ fill: tick, fontSize: 11, fontFamily: "Cairo" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(14,165,233,0.06)" }}
          {...tooltipStyle(tooltipBg, tooltipBorder)}
          formatter={(value) =>
            `${formatNumber(typeof value === "number" ? value : Number(value) || 0)} ر.س`
          }
        />
        <Legend wrapperStyle={{ fontFamily: "Cairo", fontSize: 12 }} />
        <Bar
          dataKey="ميزانية"
          name="ميزانية"
          fill="#0ea5e9"
          radius={[0, 4, 4, 0]}
          maxBarSize={14}
        />
        <Bar
          dataKey="منصرف"
          name="منصرف"
          fill="#7cb342"
          radius={[0, 4, 4, 0]}
          maxBarSize={14}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
