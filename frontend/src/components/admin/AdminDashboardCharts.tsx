"use client";

import { useRef, useState } from "react";
import type { AdminDashboardCharts } from "@/lib/types";
import { formatDate, formatGhc } from "@/lib/format";
import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useAnimateOnView } from "@/hooks/useAnimateOnView";
import { scrollStagger } from "@/lib/scrollStagger";

const CHART_COLORS = [
  "#2d6a4f",
  "#40916c",
  "#52b788",
  "#74c69d",
  "#95d5b2",
  "#d4a853",
  "#357a5b",
  "#1b4332",
  "#245843",
];

const VERIFICATION_COLORS: Record<string, string> = {
  PENDING: "#d4a853",
  VERIFIED: "#40916c",
  REJECTED: "#dc2626",
};

const MAX_RECENT_ACTIVITY = 10;

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
    <section className={`card-elevated flex flex-col rounded-2xl p-5 sm:p-6 ${className}`}>
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

  const hideTooltip = () => setTooltip(null);

  return { containerRef, tooltip, showTooltip, hideTooltip };
}

function AreaChart({
  data,
  height = 160,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const { ref: viewRef, progress } = useAnimateOnView({ delay: 120, duration: 1400 });
  const width = 320;
  const pad = { top: 8, right: 8, bottom: 28, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const baselineY = pad.top + innerH;

  const points = data.map((d, i) => {
    const x = pad.left + (i / Math.max(data.length - 1, 1)) * innerW;
    const finalY = pad.top + innerH - (d.value / max) * innerH;
    const y = baselineY - (baselineY - finalY) * progress;
    return { x, y, ...d, index: i };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? pad.left} ${baselineY} L ${points[0]?.x ?? pad.left} ${baselineY} Z`;

  return (
    <div ref={mergeRefs(containerRef, viewRef)} className="relative" onMouseLeave={hideTooltip}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full cursor-crosshair" role="img" aria-label="Area chart">
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={pad.left - 6} y={y + 4} textAnchor="end" className="fill-gray-400 text-[9px]">
                {Math.round(max * t)}
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#areaGradient)" opacity={0.35} />
        <path d={linePath} fill="none" stroke="#2d6a4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
                      <p className="tabular-nums text-gray-600">{p.value.toLocaleString()} users</p>
                    </>
                  );
                }}
                onMouseMove={(event) => {
                  showTooltip(
                    event,
                    <>
                      <p className="font-semibold text-brand-900">{p.label}</p>
                      <p className="tabular-nums text-gray-600">{p.value.toLocaleString()} users</p>
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
                className="transition-all"
                pointerEvents="none"
              />
            </g>
          );
        })}
        {points.map((p) => (
          <text key={`${p.label}-x`} x={p.x} y={height - 6} textAnchor="middle" className="fill-gray-500 text-[9px]">
            {p.label}
          </text>
        ))}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#40916c" />
            <stop offset="100%" stopColor="#d8f3dc" />
          </linearGradient>
        </defs>
      </svg>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

function DualBarChart({
  data,
  height = 180,
}: {
  data: { label: string; orders: number; revenue: number }[];
  height?: number;
}) {
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const { ref: viewRef, progress } = useAnimateOnView({ delay: 120, duration: 1200 });
  const width = 320;
  const pad = { top: 8, right: 8, bottom: 28, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxOrders = Math.max(...data.map((d) => d.orders), 1);
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const barGroupW = innerW / Math.max(data.length, 1);
  const barW = Math.min(barGroupW * 0.32, 18);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const tooltipContent = (d: { label: string; orders: number; revenue: number }) => (
    <>
      <p className="font-semibold text-brand-900">{d.label}</p>
      <p className="tabular-nums text-brand-700">{d.orders.toLocaleString()} orders</p>
      <p className="tabular-nums text-amber-700">{formatGhc(d.revenue)} revenue</p>
    </>
  );

  return (
    <div ref={mergeRefs(containerRef, viewRef)} className="relative" onMouseLeave={hideTooltip}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full cursor-crosshair" role="img" aria-label="Orders and revenue chart">
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <line key={t} x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
          );
        })}
        {data.map((d, i) => {
          const cx = pad.left + barGroupW * i + barGroupW / 2;
          const orderH = (d.orders / maxOrders) * innerH * progress;
          const revH = (d.revenue / maxRevenue) * innerH * progress;
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
                  showTooltip(event, tooltipContent(d));
                }}
                onMouseMove={(event) => showTooltip(event, tooltipContent(d))}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              <rect
                x={cx - barW - 2}
                y={pad.top + innerH - orderH}
                width={barW}
                height={orderH}
                rx="3"
                fill="#40916c"
                opacity={active || hoveredIndex === null ? 1 : 0.45}
                pointerEvents="none"
              />
              <rect
                x={cx + 2}
                y={pad.top + innerH - revH}
                width={barW}
                height={revH}
                rx="3"
                fill="#d4a853"
                opacity={active || hoveredIndex === null ? 1 : 0.45}
                pointerEvents="none"
              />
              <text x={cx} y={height - 6} textAnchor="middle" className="fill-gray-500 text-[9px]">
                {d.label}
              </text>
            </g>
          );
        })}
        <text x={pad.left} y={12} className="fill-brand-700 text-[9px] font-semibold">
          ● Orders
        </text>
        <text x={pad.left + 52} y={12} className="fill-amber-600 text-[9px] font-semibold">
          ● Revenue
        </text>
      </svg>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

function DonutChart({
  segments,
}: {
  segments: { label: string; count: number; color: string }[];
}) {
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const { ref: viewRef, progress } = useAnimateOnView({ delay: 120, duration: 1300 });
  const total = segments.reduce((s, seg) => s + seg.count, 0) || 1;
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 52;
  const stroke = 22;
  const circumference = 2 * Math.PI * r;
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const arcs = segments.reduce<
    { label: string; count: number; color: string; dash: number; offset: number }[]
  >((acc, seg) => {
    const dash = (seg.count / total) * circumference;
    const offset = acc.reduce((sum, item) => sum + item.dash, 0);
    acc.push({ ...seg, dash, offset });
    return acc;
  }, []);

  const showSegmentTooltip = (
    event: React.MouseEvent,
    seg: { label: string; count: number; color: string }
  ) => {
    const pct = Math.round((seg.count / total) * 100);
    showTooltip(
      event,
      <>
        <p className="font-semibold text-brand-900">{seg.label}</p>
        <p className="tabular-nums text-gray-600">
          {seg.count.toLocaleString()} ({pct}%)
        </p>
      </>
    );
  };

  return (
    <div ref={mergeRefs(containerRef, viewRef)} className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-start" onMouseLeave={hideTooltip}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 cursor-default" role="img" aria-label="Role distribution">
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
              strokeWidth={active ? stroke + 4 : stroke}
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
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-brand-900 text-lg font-bold" pointerEvents="none">
          {Math.round(total * progress)}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-gray-500 text-[10px]" pointerEvents="none">
          users
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {segments.map((seg) => {
          const active = hoveredLabel === seg.label;
          const pct = Math.round((seg.count / total) * 100);
          return (
            <li
              key={seg.label}
              className={`flex cursor-default items-center justify-between gap-2 rounded-md px-1 py-0.5 text-sm transition-colors ${active ? "bg-brand-50" : ""}`}
              onMouseEnter={(event) => {
                setHoveredLabel(seg.label);
                showSegmentTooltip(event, seg);
              }}
              onMouseMove={(event) => showSegmentTooltip(event, seg)}
              onMouseLeave={() => setHoveredLabel(null)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full transition-transform ${active ? "scale-125" : ""}`}
                  style={{ backgroundColor: seg.color }}
                />
                <span className="truncate text-gray-600">{seg.label}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-brand-900">
                {seg.count}
                <span className="ml-1 text-xs font-normal text-gray-400">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

function VerificationBars({
  items,
}: {
  items: { status: string; count: number }[];
}) {
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const { ref: viewRef, progress } = useAnimateOnView({ delay: 120, duration: 1100 });
  const max = Math.max(...items.map((i) => i.count), 1);
  const total = items.reduce((sum, item) => sum + item.count, 0) || 1;
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
  const labels: Record<string, string> = {
    PENDING: "Pending review",
    VERIFIED: "Verified",
    REJECTED: "Rejected",
  };

  return (
    <div ref={mergeRefs(containerRef, viewRef)} className="relative space-y-2" onMouseLeave={hideTooltip}>
      {items.map((item) => {
        const active = hoveredStatus === item.status;
        const pct = Math.round((item.count / total) * 100);
        const label = labels[item.status] ?? item.status;
        const animatedCount = Math.round(item.count * progress);
        return (
          <div
            key={item.status}
            className={`cursor-default rounded-lg px-1 py-0.5 transition-colors ${active ? "bg-brand-50" : ""}`}
            onMouseEnter={(event) => {
              setHoveredStatus(item.status);
              showTooltip(
                event,
                <>
                  <p className="font-semibold text-brand-900">{label}</p>
                  <p className="tabular-nums text-gray-600">
                    {item.count.toLocaleString()} accounts ({pct}%)
                  </p>
                </>
              );
            }}
            onMouseMove={(event) => {
              showTooltip(
                event,
                <>
                  <p className="font-semibold text-brand-900">{label}</p>
                  <p className="tabular-nums text-gray-600">
                    {item.count.toLocaleString()} accounts ({pct}%)
                  </p>
                </>
              );
            }}
            onMouseLeave={() => setHoveredStatus(null)}
          >
            <div className="mb-0.5 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-600">{label}</span>
              <span className="font-bold tabular-nums text-brand-900">{animatedCount}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(item.count / max) * 100 * progress}%`,
                  backgroundColor: VERIFICATION_COLORS[item.status] ?? "#95d5b2",
                  opacity: hoveredStatus && !active ? 0.45 : 1,
                }}
              />
            </div>
          </div>
        );
      })}
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

function activityIcon(type: AdminDashboardCharts["recentActivity"][number]["type"]) {
  switch (type) {
    case "USER_REGISTERED":
      return "user-plus";
    case "ORDER":
      return "package";
    case "CONNECTION":
      return "handshake";
    default:
      return "bell";
  }
}

export function AdminDashboardChartsPanel({ charts }: { charts: AdminDashboardCharts }) {
  const roleSegments = charts.roleDistribution.map((row, i) => ({
    label: row.label,
    count: row.count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const userGrowthData = charts.userGrowth.map((p) => ({
    label: p.label,
    value: p.cumulativeUsers,
  }));

  const recentActivity = charts.recentActivity.slice(0, MAX_RECENT_ACTIVITY);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <ScrollReveal delay={scrollStagger(0, 100)} duration={500} direction="fade-up">
          <ChartPanel title="Platform user growth" subtitle="Cumulative registered users (6 months)">
            <AreaChart data={userGrowthData} />
          </ChartPanel>
        </ScrollReveal>

        <ScrollReveal delay={scrollStagger(1, 100)} duration={500} direction="fade-up">
          <ChartPanel title="Orders & revenue" subtitle="Paid orders and platform revenue by month">
            <DualBarChart data={charts.ordersTrend} />
          </ChartPanel>
        </ScrollReveal>

        <ScrollReveal delay={scrollStagger(2, 100)} duration={500} direction="fade-up">
          <ChartPanel title="Role distribution" subtitle="All registered accounts by role">
            <DonutChart segments={roleSegments} />
          </ChartPanel>
        </ScrollReveal>

        <ScrollReveal delay={scrollStagger(3, 100)} duration={500} direction="fade-up">
          <ChartPanel title="Verification queue" subtitle="Verifiable roles by review status">
            <VerificationBars items={charts.verificationStatus} />
          </ChartPanel>
        </ScrollReveal>
      </div>

      <ScrollReveal delay={scrollStagger(4, 100)} duration={500} direction="fade-up">
        <ChartPanel
          title="Recent activity"
          subtitle="Latest registrations, orders, and connections"
          className="!p-4 sm:!p-5"
        >
        {recentActivity.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity yet.</p>
        ) : (
          <ul className="divide-y divide-brand-50">
            {recentActivity.map((item) => (
              <li key={item.id} className="flex items-center gap-2.5 py-1.5 first:pt-0 last:pb-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50">
                  <Icon name={activityIcon(item.type)} className="h-3.5 w-3.5 text-brand-700" />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-xs font-medium text-brand-900">{item.label}</p>
                  <p className="text-[10px] text-gray-400">{formatDate(item.date)}</p>
                </div>
                {item.amount != null && (
                  <span className="shrink-0 text-xs font-semibold text-brand-700">{formatGhc(item.amount)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        </ChartPanel>
      </ScrollReveal>
    </div>
  );
}
