"use client";

import { useRef, useState } from "react";
import type { AccountantDashboardCharts } from "@/lib/types";
import { formatGhc } from "@/lib/format";

const SOURCE_COLORS = {
  productOrders: "#2d6a4f",
  farmAccess: "#40916c",
  research: "#52b788",
  legacyAccess: "#95d5b2",
} as const;

const DONUT_COLORS = ["#2d6a4f", "#40916c", "#52b788", "#74c69d", "#d4a853"];

type TooltipState = {
  content: React.ReactNode;
  x: number;
  y: number;
} | null;

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
      <div className="mb-4">
        <h3 className="text-base font-bold text-brand-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ChartTooltip({ tooltip }: { tooltip: TooltipState }) {
  if (!tooltip) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-brand-100 bg-white px-2.5 py-1.5 text-xs shadow-md"
      style={{ left: tooltip.x, top: tooltip.y - 8 }}
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
  height = 180,
}: {
  data: { label: string; revenue: number }[];
  height?: number;
}) {
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const width = 480;
  const pad = { top: 12, right: 12, bottom: 32, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const baselineY = pad.top + innerH;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const points = data.map((d, i) => {
    const x = pad.left + (i / Math.max(data.length - 1, 1)) * innerW;
    const y = pad.top + innerH - (d.revenue / max) * innerH;
    return { x, y, ...d, index: i };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? pad.left} ${baselineY} L ${points[0]?.x ?? pad.left} ${baselineY} Z`;

  return (
    <div ref={containerRef} className="relative" onMouseLeave={hideTooltip}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full cursor-crosshair" role="img" aria-label="Monthly revenue trend">
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-gray-400 text-[9px]">
                {formatGhc(max * t).replace("GHC ", "")}
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#accountantRevenueGradient)" opacity={0.35} />
        <path d={linePath} fill="none" stroke="#2d6a4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => {
          const active = hoveredIndex === p.index;
          return (
            <g key={p.label}>
              <circle
                cx={p.x}
                cy={p.y}
                r="16"
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
              <circle cx={p.x} cy={p.y} r={active ? 5.5 : 3.5} fill={active ? "#1b4332" : "#2d6a4f"} pointerEvents="none" />
            </g>
          );
        })}
        {points.map((p) => (
          <text key={`${p.label}-x`} x={p.x} y={height - 8} textAnchor="middle" className="fill-gray-500 text-[9px]">
            {p.label}
          </text>
        ))}
        <defs>
          <linearGradient id="accountantRevenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#40916c" />
            <stop offset="100%" stopColor="#d8f3dc" />
          </linearGradient>
        </defs>
      </svg>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

function StackedSourceChart({
  data,
  height = 200,
}: {
  data: AccountantDashboardCharts["revenueBySource"];
  height?: number;
}) {
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const width = 480;
  const pad = { top: 20, right: 12, bottom: 32, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(
    ...data.map((d) => d.productOrders + d.farmAccess + d.research + d.legacyAccess),
    1
  );
  const barGroupW = innerW / Math.max(data.length, 1);
  const barW = Math.min(barGroupW * 0.55, 36);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const segments = [
    { key: "productOrders" as const, label: "Product orders", color: SOURCE_COLORS.productOrders },
    { key: "farmAccess" as const, label: "Farm access", color: SOURCE_COLORS.farmAccess },
    { key: "research" as const, label: "Research", color: SOURCE_COLORS.research },
    { key: "legacyAccess" as const, label: "Legacy access", color: SOURCE_COLORS.legacyAccess },
  ];

  return (
    <div ref={containerRef} className="relative" onMouseLeave={hideTooltip}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full cursor-crosshair" role="img" aria-label="Revenue by source">
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-gray-400 text-[9px]">
                {formatGhc(max * t).replace("GHC ", "")}
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
                const segH = (value / max) * innerH;
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
              <text x={cx} y={height - 8} textAnchor="middle" className="fill-gray-500 text-[9px]">
                {d.label}
              </text>
            </g>
          );
        })}
        <g transform={`translate(${pad.left}, 8)`}>
          {segments.map((seg, i) => (
            <g key={seg.key} transform={`translate(${i * 88}, 0)`}>
              <rect width="8" height="8" rx="2" fill={seg.color} />
              <text x="12" y="7" className="fill-gray-600 text-[8px]">
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
  size = 160,
}: {
  segments: { label: string; amount: number; color: string }[];
  size?: number;
}) {
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const total = segments.reduce((sum, s) => sum + s.amount, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const stroke = size * 0.14;
  let angle = -Math.PI / 2;

  const arcs = segments.map((seg, i) => {
    const slice = (seg.amount / total) * Math.PI * 2;
    const start = angle;
    angle += slice;
    const end = angle;
    const large = slice > Math.PI ? 1 : 0;
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
    return { ...seg, path, color: seg.color || DONUT_COLORS[i % DONUT_COLORS.length], index: i };
  });

  return (
    <div ref={containerRef} className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-40 w-40 shrink-0" role="img" aria-label="Revenue source breakdown">
        {arcs.map((arc) => (
          <path
            key={arc.label}
            d={arc.path}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
            onMouseEnter={(event) =>
              showTooltip(
                event,
                <>
                  <p className="font-semibold text-brand-900">{arc.label}</p>
                  <p className="tabular-nums text-green-700">{formatGhc(arc.amount)}</p>
                  <p className="text-gray-500">{Math.round((arc.amount / total) * 100)}%</p>
                </>
              )
            }
            onMouseMove={(event) =>
              showTooltip(
                event,
                <>
                  <p className="font-semibold text-brand-900">{arc.label}</p>
                  <p className="tabular-nums text-green-700">{formatGhc(arc.amount)}</p>
                  <p className="text-gray-500">{Math.round((arc.amount / total) * 100)}%</p>
                </>
              )
            }
            onMouseLeave={hideTooltip}
          />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-brand-900 text-[11px] font-bold">
          {formatGhc(total).replace("GHC ", "GHC\n")}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-gray-500 text-[8px]">
          total
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2">
        {arcs.map((arc) => (
          <li key={arc.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: arc.color }} />
              <span className="truncate text-gray-700">{arc.label}</span>
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-brand-900">{formatGhc(arc.amount)}</span>
          </li>
        ))}
      </ul>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

function VolumeBarChart({
  data,
  height = 160,
}: {
  data: { label: string; count: number }[];
  height?: number;
}) {
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const width = 320;
  const pad = { top: 8, right: 8, bottom: 28, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.count), 1);
  const barGroupW = innerW / Math.max(data.length, 1);
  const barW = Math.min(barGroupW * 0.5, 28);

  return (
    <div ref={containerRef} className="relative" onMouseLeave={hideTooltip}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full cursor-crosshair" role="img" aria-label="Transaction volume">
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <line key={t} x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
          );
        })}
        {data.map((d, i) => {
          const cx = pad.left + barGroupW * i + barGroupW / 2;
          const barH = (d.count / max) * innerH;
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
                      <p className="tabular-nums text-brand-700">{d.count.toLocaleString()} payments</p>
                    </>
                  )
                }
                onMouseMove={(event) =>
                  showTooltip(
                    event,
                    <>
                      <p className="font-semibold text-brand-900">{d.label}</p>
                      <p className="tabular-nums text-brand-700">{d.count.toLocaleString()} payments</p>
                    </>
                  )
                }
              />
              <rect
                x={cx - barW / 2}
                y={pad.top + innerH - barH}
                width={barW}
                height={barH}
                rx="3"
                fill="#357a5b"
                pointerEvents="none"
              />
              <text x={cx} y={height - 6} textAnchor="middle" className="fill-gray-500 text-[9px]">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

function CashFlowChart({
  data,
  height = 180,
}: {
  data: { label: string; income: number; withdrawals: number }[];
  height?: number;
}) {
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const width = 320;
  const pad = { top: 20, right: 8, bottom: 28, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.flatMap((d) => [d.income, d.withdrawals]), 1);
  const barGroupW = innerW / Math.max(data.length, 1);
  const barW = Math.min(barGroupW * 0.32, 18);

  return (
    <div ref={containerRef} className="relative" onMouseLeave={hideTooltip}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full cursor-crosshair" role="img" aria-label="Income versus withdrawals">
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-gray-400 text-[9px]">
                {formatGhc(max * t).replace("GHC ", "")}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const cx = pad.left + barGroupW * i + barGroupW / 2;
          const incomeH = (d.income / max) * innerH;
          const withdrawalH = (d.withdrawals / max) * innerH;
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
              <rect x={cx - barW - 2} y={pad.top + innerH - incomeH} width={barW} height={incomeH} rx="3" fill="#40916c" pointerEvents="none" />
              <rect x={cx + 2} y={pad.top + innerH - withdrawalH} width={barW} height={withdrawalH} rx="3" fill="#d4a853" pointerEvents="none" />
              <text x={cx} y={height - 6} textAnchor="middle" className="fill-gray-500 text-[9px]">
                {d.label}
              </text>
            </g>
          );
        })}
        <text x={pad.left} y={12} className="fill-brand-700 text-[9px] font-semibold">
          ● Income
        </text>
        <text x={pad.left + 48} y={12} className="fill-amber-600 text-[9px] font-semibold">
          ● Withdrawals
        </text>
      </svg>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

export function AccountantDashboardChartsPanel({ charts }: { charts: AccountantDashboardCharts }) {
  const donutSegments = charts.revenueSourceTotals.map((row, i) => ({
    label: row.label,
    amount: row.amount,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <ChartPanel title="Monthly revenue trend" subtitle="Total platform income by month (last 6 months)">
        <RevenueAreaChart data={charts.monthlyRevenue} />
      </ChartPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel title="Revenue by source" subtitle="Stacked monthly breakdown by income type">
          <StackedSourceChart data={charts.revenueBySource} />
        </ChartPanel>

        <ChartPanel title="Revenue mix" subtitle="All-time share by income source">
          {donutSegments.length === 0 ? (
            <p className="text-sm text-gray-500">No revenue recorded yet.</p>
          ) : (
            <DonutChart segments={donutSegments} />
          )}
        </ChartPanel>

        <ChartPanel title="Transaction volume" subtitle="Number of completed payments by month">
          <VolumeBarChart data={charts.transactionVolume} />
        </ChartPanel>

        <ChartPanel title="Income vs withdrawals" subtitle="Cash received compared to completed withdrawals">
          <CashFlowChart data={charts.cashFlow} />
        </ChartPanel>
      </div>
    </div>
  );
}
