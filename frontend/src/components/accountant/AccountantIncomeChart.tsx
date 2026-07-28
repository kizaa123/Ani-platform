"use client";

import { useRef, useState } from "react";
import type { AccountantIncomeChart } from "@/lib/types";
import { formatGhc } from "@/lib/format";

type TooltipState = {
  content: React.ReactNode;
  x: number;
  y: number;
} | null;

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

function IncomeAreaChart({
  data,
  height = 200,
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
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full cursor-crosshair" role="img" aria-label="Platform income by month">
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
        <path d={areaPath} fill="url(#incomeGradient)" opacity={0.35} />
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
              <circle
                cx={p.x}
                cy={p.y}
                r={active ? 5.5 : 3.5}
                fill={active ? "#1b4332" : "#2d6a4f"}
                pointerEvents="none"
              />
            </g>
          );
        })}
        {points.map((p) => (
          <text key={`${p.label}-x`} x={p.x} y={height - 8} textAnchor="middle" className="fill-gray-500 text-[9px]">
            {p.label}
          </text>
        ))}
        <defs>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#40916c" />
            <stop offset="100%" stopColor="#d8f3dc" />
          </linearGradient>
        </defs>
      </svg>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

export function AccountantIncomeChartPanel({ chart }: { chart: AccountantIncomeChart }) {
  return (
    <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-base font-bold text-brand-900">Platform income growth</h3>
        <p className="mt-0.5 text-xs text-gray-500">Total revenue received by month (last 6 months)</p>
      </div>
      <IncomeAreaChart data={chart.monthlyIncome} />
    </section>
  );
}
