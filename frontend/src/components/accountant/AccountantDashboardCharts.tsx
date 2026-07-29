"use client";

import { useRef, useState } from "react";
import type { AccountantDashboardCharts } from "@/lib/types";
import { formatGhc, formatGhcAxis } from "@/lib/format";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useAnimateOnView } from "@/hooks/useAnimateOnView";
import { scrollStagger } from "@/lib/scrollStagger";

const STREAM_COLORS = {
  access: "#40916c",
  orderShare: "#2d6a4f",
} as const;

const ACCESS_COLORS = {
  farmAccess: "#40916c",
  research: "#52b788",
  legacyAccess: "#95d5b2",
} as const;

const DONUT_COLORS = ["#40916c", "#2d6a4f", "#52b788", "#74c69d", "#d4a853"];

type TooltipState = {
  content: React.ReactNode;
  x: number;
  y: number;
} | null;

function mergeRefs<T>(...refs: (React.RefObject<T | null> | React.Ref<T | null>)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }
  };
}

function ChartPanel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-brand-100 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <div className="mb-3">
        <h3 className="text-sm font-bold text-brand-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[11px] text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ChartTooltip({ tooltip }: { tooltip: TooltipState }) {
  if (!tooltip) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-md border border-brand-100 bg-white px-2 py-1 text-[10px] leading-snug shadow-md"
      style={{ left: tooltip.x, top: tooltip.y - 6 }}
    >
      {tooltip.content}
    </div>
  );
}

function useChartTooltip() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const showTooltip = (event: React.MouseEvent, content: React.ReactNode) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      content,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  return { containerRef, tooltip, showTooltip, hideTooltip: () => setTooltip(null) };
}

function RevenueAreaChart({
  data,
  height = 140,
  strokeColor = "#2d6a4f",
  gradientId = "accountantRevenueGradient",
}: {
  data: { label: string; revenue: number }[];
  height?: number;
  strokeColor?: string;
  gradientId?: string;
}) {
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const { ref: viewRef, progress } = useAnimateOnView({ delay: 120, duration: 1400 });
  const width = 320;
  const pad = { top: 8, right: 8, bottom: 26, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const baselineY = pad.top + innerH;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const points = data.map((d, i) => {
    const x = pad.left + (i / Math.max(data.length - 1, 1)) * innerW;
    const finalY = pad.top + innerH - (d.revenue / max) * innerH;
    const y = baselineY - (baselineY - finalY) * progress;
    return { x, y, ...d, index: i };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? pad.left} ${baselineY} L ${points[0]?.x ?? pad.left} ${baselineY} Z`;

  return (
    <div ref={mergeRefs(containerRef, viewRef)} className="relative" onMouseLeave={hideTooltip}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full cursor-crosshair" role="img" aria-label="Monthly revenue trend">
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={pad.left - 5} y={y + 3} textAnchor="end" className="fill-gray-400 text-[8px]">
                {formatGhcAxis(max * t)}
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill={`url(#${gradientId})`} opacity={0.35} />
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => {
          const active = hoveredIndex === p.index;
          return (
            <g key={p.label}>
              <circle
                cx={p.x}
                cy={p.y}
                r="14"
                fill="transparent"
                onMouseEnter={(event) => {
                  setHoveredIndex(p.index);
                  showTooltip(
                    event,
                    <>
                      <p className="font-semibold text-brand-900">{p.label}</p>
                      <p className="tabular-nums text-green-700">{formatGhc(p.revenue)}</p>
                    </>
                  );
                }}
                onMouseMove={(event) => {
                  showTooltip(
                    event,
                    <>
                      <p className="font-semibold text-brand-900">{p.label}</p>
                      <p className="tabular-nums text-green-700">{formatGhc(p.revenue)}</p>
                    </>
                  );
                }}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              <circle cx={p.x} cy={p.y} r={active ? 4.5 : 3} fill={active ? "#1b4332" : strokeColor} pointerEvents="none" />
            </g>
          );
        })}
        {points.map((p) => (
          <text key={`${p.label}-x`} x={p.x} y={height - 6} textAnchor="middle" className="fill-gray-500 text-[8px]">
            {p.label}
          </text>
        ))}
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} />
            <stop offset="100%" stopColor="#d8f3dc" />
          </linearGradient>
        </defs>
      </svg>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

function StackedStreamChart({
  data,
  height = 160,
}: {
  data: AccountantDashboardCharts["revenueBySource"];
  height?: number;
}) {
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const { ref: viewRef, progress } = useAnimateOnView({ delay: 120, duration: 1200 });
  const width = 320;
  const pad = { top: 18, right: 8, bottom: 26, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.access + d.orderShare), 1);
  const barGroupW = innerW / Math.max(data.length, 1);
  const barW = Math.min(barGroupW * 0.55, 28);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const segments = [
    { key: "access" as const, label: "Access income", color: STREAM_COLORS.access },
    { key: "orderShare" as const, label: "Order share", color: STREAM_COLORS.orderShare },
  ];

  return (
    <div ref={mergeRefs(containerRef, viewRef)} className="relative" onMouseLeave={hideTooltip}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full cursor-crosshair" role="img" aria-label="Revenue by income stream">
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={pad.left - 5} y={y + 3} textAnchor="end" className="fill-gray-400 text-[8px]">
                {formatGhcAxis(max * t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const cx = pad.left + barGroupW * i + barGroupW / 2;
          let stackY = pad.top + innerH;
          const active = hoveredIndex === i;
          return (
            <g key={d.label}>
              <rect
                x={cx - barGroupW / 2}
                y={pad.top}
                width={barGroupW}
                height={innerH}
                fill="transparent"
                onMouseEnter={(event) => {
                  setHoveredIndex(i);
                  showTooltip(
                    event,
                    <>
                      <p className="font-semibold text-brand-900">{d.label}</p>
                      {segments.map((seg) =>
                        d[seg.key] > 0 ? (
                          <p key={seg.key} className="tabular-nums text-gray-600">
                            {seg.label}: {formatGhc(d[seg.key])}
                          </p>
                        ) : null
                      )}
                    </>
                  );
                }}
                onMouseMove={(event) => {
                  showTooltip(
                    event,
                    <>
                      <p className="font-semibold text-brand-900">{d.label}</p>
                      {segments.map((seg) =>
                        d[seg.key] > 0 ? (
                          <p key={seg.key} className="tabular-nums text-gray-600">
                            {seg.label}: {formatGhc(d[seg.key])}
                          </p>
                        ) : null
                      )}
                    </>
                  );
                }}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {segments.map((seg) => {
                const value = d[seg.key];
                if (value <= 0) return null;
                const segH = (value / max) * innerH * progress;
                stackY -= segH;
                return (
                  <rect
                    key={seg.key}
                    x={cx - barW / 2}
                    y={stackY}
                    width={barW}
                    height={segH}
                    fill={seg.color}
                    opacity={active || hoveredIndex === null ? 1 : 0.45}
                    pointerEvents="none"
                  />
                );
              })}
              <text x={cx} y={height - 6} textAnchor="middle" className="fill-gray-500 text-[8px]">
                {d.label}
              </text>
            </g>
          );
        })}
        <g transform={`translate(${pad.left}, 6)`}>
          {segments.map((seg, i) => (
            <g key={seg.key} transform={`translate(${i * 72}, 0)`}>
              <rect width="6" height="6" rx="1.5" fill={seg.color} />
              <text x="10" y="5.5" className="fill-gray-600 text-[7px]">
                {seg.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

function StackedAccessChart({
  data,
  height = 160,
}: {
  data: AccountantDashboardCharts["accessBreakdownByMonth"];
  height?: number;
}) {
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const { ref: viewRef, progress } = useAnimateOnView({ delay: 120, duration: 1200 });
  const width = 320;
  const pad = { top: 18, right: 8, bottom: 26, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(
    ...data.map((d) => d.farmAccess + d.research + d.legacyAccess),
    1
  );
  const barGroupW = innerW / Math.max(data.length, 1);
  const barW = Math.min(barGroupW * 0.55, 28);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const segments = [
    { key: "farmAccess" as const, label: "Farm access", color: ACCESS_COLORS.farmAccess },
    { key: "research" as const, label: "Publication access", color: ACCESS_COLORS.research },
    { key: "legacyAccess" as const, label: "Other access", color: ACCESS_COLORS.legacyAccess },
  ];

  return (
    <div ref={mergeRefs(containerRef, viewRef)} className="relative" onMouseLeave={hideTooltip}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full cursor-crosshair" role="img" aria-label="Access revenue breakdown">
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={pad.left - 5} y={y + 3} textAnchor="end" className="fill-gray-400 text-[8px]">
                {formatGhcAxis(max * t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const cx = pad.left + barGroupW * i + barGroupW / 2;
          let stackY = pad.top + innerH;
          const active = hoveredIndex === i;
          return (
            <g key={d.label}>
              <rect
                x={cx - barGroupW / 2}
                y={pad.top}
                width={barGroupW}
                height={innerH}
                fill="transparent"
                onMouseEnter={(event) => {
                  setHoveredIndex(i);
                  showTooltip(
                    event,
                    <>
                      <p className="font-semibold text-brand-900">{d.label}</p>
                      {segments.map((seg) =>
                        d[seg.key] > 0 ? (
                          <p key={seg.key} className="tabular-nums text-gray-600">
                            {seg.label}: {formatGhc(d[seg.key])}
                          </p>
                        ) : null
                      )}
                    </>
                  );
                }}
                onMouseMove={(event) => {
                  showTooltip(
                    event,
                    <>
                      <p className="font-semibold text-brand-900">{d.label}</p>
                      {segments.map((seg) =>
                        d[seg.key] > 0 ? (
                          <p key={seg.key} className="tabular-nums text-gray-600">
                            {seg.label}: {formatGhc(d[seg.key])}
                          </p>
                        ) : null
                      )}
                    </>
                  );
                }}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {segments.map((seg) => {
                const value = d[seg.key];
                if (value <= 0) return null;
                const segH = (value / max) * innerH * progress;
                stackY -= segH;
                return (
                  <rect
                    key={seg.key}
                    x={cx - barW / 2}
                    y={stackY}
                    width={barW}
                    height={segH}
                    fill={seg.color}
                    opacity={active || hoveredIndex === null ? 1 : 0.45}
                    pointerEvents="none"
                  />
                );
              })}
              <text x={cx} y={height - 6} textAnchor="middle" className="fill-gray-500 text-[8px]">
                {d.label}
              </text>
            </g>
          );
        })}
        <g transform={`translate(${pad.left}, 6)`}>
          {segments.map((seg, i) => (
            <g key={seg.key} transform={`translate(${i * 78}, 0)`}>
              <rect width="6" height="6" rx="1.5" fill={seg.color} />
              <text x="10" y="5.5" className="fill-gray-600 text-[7px]">
                {seg.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

function DonutChart({
  segments,
  size = 140,
}: {
  segments: { label: string; amount: number; color: string }[];
  size?: number;
}) {
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const { ref: viewRef, progress } = useAnimateOnView({ delay: 120, duration: 1300 });
  const total = segments.reduce((sum, s) => sum + s.amount, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.37;
  const stroke = size * 0.13;
  const circumference = 2 * Math.PI * r;
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const arcs = segments.reduce<
    { label: string; amount: number; color: string; dash: number; offset: number }[]
  >((acc, seg) => {
    const dash = (seg.amount / total) * circumference;
    const offset = acc.reduce((sum, item) => sum + item.dash, 0);
    acc.push({ ...seg, dash, offset });
    return acc;
  }, []);

  const showSegmentTooltip = (
    event: React.MouseEvent,
    seg: { label: string; amount: number; color: string }
  ) => {
    const pct = Math.round((seg.amount / total) * 100);
    showTooltip(
      event,
      <>
        <p className="font-semibold text-brand-900">{seg.label}</p>
        <p className="tabular-nums text-green-700">{formatGhc(seg.amount)}</p>
        <p className="text-gray-500">{pct}%</p>
      </>
    );
  };

  return (
    <div ref={mergeRefs(containerRef, viewRef)} className="relative flex flex-col items-center gap-3 sm:flex-row sm:items-start" onMouseLeave={hideTooltip}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="h-36 w-36 shrink-0" role="img" aria-label="Revenue stream breakdown">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        {arcs.map((seg) => {
          const active = hoveredLabel === seg.label;
          const animatedDash = seg.dash * progress;
          return (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={active ? stroke + 3 : stroke}
              strokeDasharray={`${animatedDash} ${circumference - animatedDash}`}
              strokeDashoffset={-seg.offset * progress}
              transform={`rotate(-90 ${cx} ${cy})`}
              opacity={hoveredLabel && !active ? 0.4 : 1}
              className="cursor-pointer transition-all"
              onMouseEnter={(event) => {
                setHoveredLabel(seg.label);
                showSegmentTooltip(event, seg);
              }}
              onMouseMove={(event) => showSegmentTooltip(event, seg)}
              onMouseLeave={() => setHoveredLabel(null)}
            />
          );
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" className="fill-brand-900 text-[10px] font-bold" pointerEvents="none">
          {formatGhcAxis(total * progress)}
        </text>
        <text x={cx} y={cy + 9} textAnchor="middle" className="fill-gray-500 text-[7px]" pointerEvents="none">
          total
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {arcs.map((arc) => {
          const active = hoveredLabel === arc.label;
          return (
            <li
              key={arc.label}
              className={`flex cursor-default items-center justify-between gap-2 rounded-md px-1 py-0.5 text-[11px] transition-colors ${active ? "bg-brand-50" : ""}`}
              onMouseEnter={(event) => {
                setHoveredLabel(arc.label);
                showSegmentTooltip(event, arc);
              }}
              onMouseMove={(event) => showSegmentTooltip(event, arc)}
              onMouseLeave={() => setHoveredLabel(null)}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: arc.color }} />
                <span className="truncate text-gray-700">{arc.label}</span>
              </span>
              <span className="shrink-0 tabular-nums font-semibold text-brand-900">{formatGhc(arc.amount)}</span>
            </li>
          );
        })}
      </ul>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

function CashFlowChart({
  data,
  height = 140,
}: {
  data: { label: string; income: number; withdrawals: number }[];
  height?: number;
}) {
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const { ref: viewRef, progress } = useAnimateOnView({ delay: 120, duration: 1200 });
  const width = 320;
  const pad = { top: 18, right: 8, bottom: 26, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.flatMap((d) => [d.income, d.withdrawals]), 1);
  const barGroupW = innerW / Math.max(data.length, 1);
  const barW = Math.min(barGroupW * 0.32, 16);

  return (
    <div ref={mergeRefs(containerRef, viewRef)} className="relative" onMouseLeave={hideTooltip}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full cursor-crosshair" role="img" aria-label="Income versus withdrawals">
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={pad.left - 5} y={y + 3} textAnchor="end" className="fill-gray-400 text-[8px]">
                {formatGhcAxis(max * t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const cx = pad.left + barGroupW * i + barGroupW / 2;
          const incomeH = (d.income / max) * innerH * progress;
          const withdrawalH = (d.withdrawals / max) * innerH * progress;
          return (
            <g key={d.label}>
              <rect
                x={cx - barGroupW / 2}
                y={pad.top}
                width={barGroupW}
                height={innerH}
                fill="transparent"
                onMouseEnter={(event) =>
                  showTooltip(
                    event,
                    <>
                      <p className="font-semibold text-brand-900">{d.label}</p>
                      <p className="tabular-nums text-green-700">Income: {formatGhc(d.income)}</p>
                      <p className="tabular-nums text-amber-700">Withdrawn: {formatGhc(d.withdrawals)}</p>
                    </>
                  )
                }
                onMouseMove={(event) =>
                  showTooltip(
                    event,
                    <>
                      <p className="font-semibold text-brand-900">{d.label}</p>
                      <p className="tabular-nums text-green-700">Income: {formatGhc(d.income)}</p>
                      <p className="tabular-nums text-amber-700">Withdrawn: {formatGhc(d.withdrawals)}</p>
                    </>
                  )
                }
              />
              <rect x={cx - barW - 2} y={pad.top + innerH - incomeH} width={barW} height={incomeH} rx="2" fill="#40916c" pointerEvents="none" />
              <rect x={cx + 2} y={pad.top + innerH - withdrawalH} width={barW} height={withdrawalH} rx="2" fill="#d4a853" pointerEvents="none" />
              <text x={cx} y={height - 6} textAnchor="middle" className="fill-gray-500 text-[8px]">
                {d.label}
              </text>
            </g>
          );
        })}
        <text x={pad.left} y={10} className="fill-brand-700 text-[8px] font-semibold">
          ● Income
        </text>
        <text x={pad.left + 44} y={10} className="fill-amber-600 text-[8px] font-semibold">
          ● Withdrawals
        </text>
      </svg>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

export function AccountantDashboardChartsPanel({ charts }: { charts: AccountantDashboardCharts }) {
  const streamSegments = charts.revenueStreamTotals.map((row, i) => ({
    label: row.label,
    amount: row.amount,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  const accessSegments = charts.accessBreakdownTotals.map((row, i) => ({
    label: row.label,
    amount: row.amount,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ScrollReveal delay={scrollStagger(0, 100)} duration={500} direction="fade-up">
          <ChartPanel title="Access income trend" subtitle="Farm access, publication access, and other access fees (last 6 months)">
            <RevenueAreaChart
              data={charts.monthlyAccessRevenue}
              strokeColor={STREAM_COLORS.access}
              gradientId="accessRevenueGradient"
            />
          </ChartPanel>
        </ScrollReveal>

        <ScrollReveal delay={scrollStagger(1, 100)} duration={500} direction="fade-up">
          <ChartPanel title="Order share trend" subtitle="ANI remainder from released buyer orders (~13.34% after splits)">
            <RevenueAreaChart
              data={charts.monthlyOrderShareRevenue}
              strokeColor={STREAM_COLORS.orderShare}
              gradientId="orderShareGradient"
            />
          </ChartPanel>
        </ScrollReveal>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ScrollReveal delay={scrollStagger(2, 100)} duration={500} direction="fade-up">
          <ChartPanel title="Income streams" subtitle="Access vs order share by month">
            <StackedStreamChart data={charts.revenueBySource} />
          </ChartPanel>
        </ScrollReveal>

        <ScrollReveal delay={scrollStagger(3, 100)} duration={500} direction="fade-up">
          <ChartPanel title="Platform revenue mix" subtitle="All-time share: access income vs order share">
            {streamSegments.length === 0 ? (
              <p className="text-xs text-gray-500">No revenue recorded yet.</p>
            ) : (
              <DonutChart segments={streamSegments} />
            )}
          </ChartPanel>
        </ScrollReveal>

        <ScrollReveal delay={scrollStagger(4, 100)} duration={500} direction="fade-up">
          <ChartPanel title="Access income breakdown" subtitle="Stacked monthly view of access fee types">
            <StackedAccessChart data={charts.accessBreakdownByMonth} />
          </ChartPanel>
        </ScrollReveal>

        <ScrollReveal delay={scrollStagger(5, 100)} duration={500} direction="fade-up">
          <ChartPanel title="Access fee mix" subtitle="All-time share within access income">
            {accessSegments.length === 0 ? (
              <p className="text-xs text-gray-500">No access revenue recorded yet.</p>
            ) : (
              <DonutChart segments={accessSegments} />
            )}
          </ChartPanel>
        </ScrollReveal>

        <ScrollReveal delay={scrollStagger(6, 100)} duration={500} direction="fade-up">
          <ChartPanel title="Total platform income" subtitle="Combined access + order share by month">
            <RevenueAreaChart data={charts.monthlyRevenue} />
          </ChartPanel>
        </ScrollReveal>

        <ScrollReveal delay={scrollStagger(7, 100)} duration={500} direction="fade-up">
          <ChartPanel title="Income vs withdrawals" subtitle="Cash received compared to completed withdrawals">
            <CashFlowChart data={charts.cashFlow} />
          </ChartPanel>
        </ScrollReveal>
      </div>
    </div>
  );
}
