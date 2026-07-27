"use client";

import type { AdminDashboardCharts } from "@/lib/types";
import { formatDate, formatGhc } from "@/lib/format";
import { Icon } from "@/components/icons";

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

function AreaChart({
  data,
  height = 160,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const width = 320;
  const pad = { top: 8, right: 8, bottom: 28, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);

  const points = data.map((d, i) => {
    const x = pad.left + (i / Math.max(data.length - 1, 1)) * innerW;
    const y = pad.top + innerH - (d.value / max) * innerH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? pad.left} ${pad.top + innerH} L ${points[0]?.x ?? pad.left} ${pad.top + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Area chart">
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
      {points.map((p) => (
        <circle key={p.label} cx={p.x} cy={p.y} r="3.5" fill="#2d6a4f" />
      ))}
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
  );
}

function DualBarChart({
  data,
  height = 180,
}: {
  data: { label: string; orders: number; revenue: number }[];
  height?: number;
}) {
  const width = 320;
  const pad = { top: 8, right: 8, bottom: 28, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxOrders = Math.max(...data.map((d) => d.orders), 1);
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const barGroupW = innerW / Math.max(data.length, 1);
  const barW = Math.min(barGroupW * 0.32, 18);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Orders and revenue chart">
      {[0, 0.5, 1].map((t) => {
        const y = pad.top + innerH * (1 - t);
        return (
          <line key={t} x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
        );
      })}
      {data.map((d, i) => {
        const cx = pad.left + barGroupW * i + barGroupW / 2;
        const orderH = (d.orders / maxOrders) * innerH;
        const revH = (d.revenue / maxRevenue) * innerH;
        return (
          <g key={d.label}>
            <rect
              x={cx - barW - 2}
              y={pad.top + innerH - orderH}
              width={barW}
              height={orderH}
              rx="3"
              fill="#40916c"
            />
            <rect
              x={cx + 2}
              y={pad.top + innerH - revH}
              width={barW}
              height={revH}
              rx="3"
              fill="#d4a853"
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
  );
}

function DonutChart({
  segments,
}: {
  segments: { label: string; count: number; color: string }[];
}) {
  const total = segments.reduce((s, seg) => s + seg.count, 0) || 1;
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 52;
  const stroke = 22;
  const circumference = 2 * Math.PI * r;

  const arcs = segments.reduce<
    { label: string; count: number; color: string; dash: number; offset: number }[]
  >((acc, seg) => {
    const dash = (seg.count / total) * circumference;
    const offset = acc.reduce((sum, item) => sum + item.dash, 0);
    acc.push({ ...seg, dash, offset });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label="Role distribution">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        {arcs.map((seg) => (
          <circle
            key={seg.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
            strokeDashoffset={-seg.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-brand-900 text-lg font-bold">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-gray-500 text-[10px]">
          users
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="truncate text-gray-600">{seg.label}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-brand-900">{seg.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerificationBars({
  items,
}: {
  items: { status: string; count: number }[];
}) {
  const max = Math.max(...items.map((i) => i.count), 1);
  const labels: Record<string, string> = {
    PENDING: "Pending review",
    VERIFIED: "Verified",
    REJECTED: "Rejected",
  };

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.status}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-600">{labels[item.status] ?? item.status}</span>
            <span className="font-bold tabular-nums text-brand-900">{item.count}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(item.count / max) * 100}%`,
                backgroundColor: VERIFICATION_COLORS[item.status] ?? "#95d5b2",
              }}
            />
          </div>
        </div>
      ))}
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel title="Platform user growth" subtitle="Cumulative registered users (6 months)">
          <AreaChart data={userGrowthData} />
        </ChartPanel>

        <ChartPanel title="Orders & revenue" subtitle="Paid orders and platform revenue by month">
          <DualBarChart data={charts.ordersTrend} />
        </ChartPanel>

        <ChartPanel title="Role distribution" subtitle="All registered accounts by role">
          <DonutChart segments={roleSegments} />
        </ChartPanel>

        <ChartPanel title="Verification queue" subtitle="Verifiable roles by review status">
          <VerificationBars items={charts.verificationStatus} />
        </ChartPanel>
      </div>

      <ChartPanel title="Recent activity" subtitle="Latest registrations, orders, and connections">
        {charts.recentActivity.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity yet.</p>
        ) : (
          <ul className="divide-y divide-brand-50">
            {charts.recentActivity.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <Icon name={activityIcon(item.type)} className="h-4 w-4 text-brand-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-brand-900">{item.label}</p>
                  <p className="text-xs text-gray-400">{formatDate(item.date)}</p>
                </div>
                {item.amount != null && (
                  <span className="shrink-0 text-sm font-semibold text-brand-700">{formatGhc(item.amount)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </ChartPanel>
    </div>
  );
}
