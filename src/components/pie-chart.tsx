"use client";

import { Pie, PieChart, Cell, Label } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { PieChartData } from "@/lib/helper";

// ── Props ──────────────────────────────────────────────────────────────────

interface AttackPieChartProps {
  data: PieChartData;
  /** Show a donut hole with total count in the center. Default: false */
  donut?: boolean;
  /** Height of the chart container. Default: 300 */
  height?: number;
  className?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a shadcn ChartConfig from PieChartData slices.
 * Each slice key is a sanitised version of its label used as the CSS variable
 * name: e.g. "XDR + Splunk" → "xdr_splunk" → var(--color-xdr_splunk)
 */
function toChartConfig(data: PieChartData): ChartConfig {
  return Object.fromEntries(
    data.slices.map((slice) => [
      slugify(slice.label),
      { label: slice.label, color: slice.color },
    ])
  ) satisfies ChartConfig;
}

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** Recharts-friendly array: each item needs `name`, `value`, and `fill`. */
function toRechartsData(data: PieChartData) {
  return data.slices.map((slice) => ({
    name: slice.label,
    value: slice.value,
    percentage: slice.percentage,
    fill: `var(--color-${slugify(slice.label)})`,
  }));
}

// ── Component ──────────────────────────────────────────────────────────────

export function AttackPieChart({
  data,
  donut = false,
  height = 300,
  className,
}: AttackPieChartProps) {
  const chartConfig = toChartConfig(data);
  const chartData = toRechartsData(data);

  const innerRadius = donut ? 60 : 0;
  const outerRadius = donut ? 100 : 110;

  return (
    <ChartContainer
      config={chartConfig}
      className={className}
      style={{ minHeight: height }}
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel={false}
              formatter={(value, name, item) =>
                `${item.payload.percentage}% (${value})`
              }
            />
          }
        />

        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          strokeWidth={1}
        >
          {/* Explicit Cell so Recharts picks up the fill CSS var correctly */}
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}

          {donut && (
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) return null;
                const { cx, cy } = viewBox as { cx: number; cy: number };
                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan
                      x={cx}
                      y={cy - 8}
                      className="fill-foreground text-2xl font-semibold"
                    >
                      {data.total.toLocaleString()}
                    </tspan>
                    <tspan
                      x={cx}
                      y={cy + 14}
                      className="fill-muted-foreground text-xs"
                    >
                      techniques
                    </tspan>
                  </text>
                );
              }}
            />
          )}
        </Pie>

        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
        />
      </PieChart>
    </ChartContainer>
  );
}