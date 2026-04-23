"use client";

import { useState } from "react";
import { Pie, PieChart, Cell, Label, Sector } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import { cn } from "@/lib/utils";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import type { PieChartData, PieSlice } from "@/lib/helper";

// ── Props ──────────────────────────────────────────────────────────────────

interface AttackPieChartProps {
  data: PieChartData;
  donut?: boolean;
  height?: number;
  className?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function toChartConfig(data: PieChartData): ChartConfig {
  return Object.fromEntries(
    data.slices.map((s) => [slugify(s.label), { label: s.label, color: s.color }])
  ) satisfies ChartConfig;
}

function toRechartsData(data: PieChartData) {
  return data.slices.map((s) => ({
    name: s.label,
    value: s.value,
    percentage: s.percentage,
    color: s.color,
    fill: s.color,
  }));
}

type ChartEntry = ReturnType<typeof toRechartsData>[number];

// ── Active sector shape ────────────────────────────────────────────────────
// Recharts v3: active shape is rendered by passing a component to `shape`
// on the specific <Sector> — we handle this by rendering two layers manually
// inside a custom renderActiveShape function passed to <Pie shape=>.
// The cleanest v3 approach is to control opacity via Cell and skip activeShape.

// ── Custom tooltip ─────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartEntry }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border/50 bg-background/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-block h-2.5 w-2.5 rounded-sm flex-shrink-0"
          style={{ background: d.color }}
        />
        <span className="text-xs font-medium text-foreground">{d.name}</span>
      </div>
      <div className="flex items-baseline gap-2 pl-[18px]">
        <span className="text-lg font-semibold tabular-nums text-foreground">
          {d.value.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">
          {d.percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ── Legend row ─────────────────────────────────────────────────────────────

function LegendRow({
  slice,
  total,
  isActive,
  onClick,
}: {
  slice: PieSlice;
  total: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const barWidth = (slice.value / total) * 100;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full text-left rounded-md px-3 py-2 transition-all duration-150",
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        isActive ? "bg-muted/80" : "bg-transparent"
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-block h-2 w-2 rounded-[2px] flex-shrink-0 transition-transform duration-150 group-hover:scale-125"
            style={{ background: slice.color }}
          />
          <span
            className={cn(
              "text-xs truncate transition-colors",
              isActive
                ? "text-foreground font-medium"
                : "text-muted-foreground group-hover:text-foreground"
            )}
          >
            {slice.label}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {slice.value.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted-foreground w-9 text-right tabular-nums">
            {slice.percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${barWidth}%`,
            background: slice.color,
            opacity: isActive ? 1 : 0.5,
          }}
        />
      </div>
    </button>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function AttackPieChart({
  data,
  donut = false,
  height = 300,
  className,
}: AttackPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartConfig = toChartConfig(data);
  const chartData = toRechartsData(data);
  const nonZero = data.slices.filter((s) => s.value > 0);

  const innerRadius = donut ? 56 : 0;
  const outerRadius = donut ? 90 : 95;
  const activeSlice = activeIndex !== undefined ? data.slices[activeIndex] : null;

  return (
    <div className={cn("flex flex-col gap-0", className)}>
      <div className="mb-1">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {data.description}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* chart */}
        <div className="flex-shrink-0 w-full lg:w-auto" style={{ height }}>
          <ChartContainer
            config={chartConfig}
            style={{ height, width: height }}
            className="mx-auto"
          >
            <PieChart>
              <ChartTooltip cursor={false} content={<CustomTooltip />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                strokeWidth={0}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    opacity={
                      activeIndex === undefined || activeIndex === i ? 1 : 0.3
                    }
                    // v3: expand the active sector via r offset on the Cell
                    {...(activeIndex === i
                      ? { outerRadius: outerRadius + 8 }
                      : {})}
                  />
                ))}

                {donut && (
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox)) return null;
                      const { cx, cy } = viewBox as { cx: number; cy: number };
                      return (
                        <text
                          x={cx}
                          y={cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={cx}
                            y={cy - 10}
                            fontSize={activeSlice ? 20 : 26}
                            fontWeight={600}
                            className="fill-foreground"
                          >
                            {activeSlice
                              ? activeSlice.value.toLocaleString()
                              : data.total.toLocaleString()}
                          </tspan>
                          <tspan
                            x={cx}
                            y={cy + 12}
                            fontSize={10}
                            className="fill-muted-foreground"
                          >
                            {activeSlice
                              ? `${activeSlice.percentage.toFixed(1)}%`
                              : "techniques"}
                          </tspan>
                        </text>
                      );
                    }}
                  />
                )}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>

        {/* legend */}
        <div className="flex-1 w-full flex flex-col divide-y divide-border/40 min-w-0">
          {nonZero.map((slice) => {
            const globalIndex = data.slices.indexOf(slice);
            return (
              <LegendRow
                key={slice.label}
                slice={slice}
                total={data.total}
                isActive={activeIndex === globalIndex}
                onClick={() =>
                  setActiveIndex(
                    activeIndex === globalIndex ? undefined : globalIndex
                  )
                }
              />
            );
          })}

          <div className="flex items-center justify-between px-3 pt-2 mt-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Total
            </span>
            <span className="text-xs font-semibold tabular-nums">
              {data.total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}