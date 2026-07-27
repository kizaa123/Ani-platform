import { Icon, type IconName } from "@/components/icons";

type AdminStatCardProps = {
  label: string;
  value: number | string;
  icon: IconName;
  accent: "green" | "gold" | "teal" | "emerald" | "forest";
  hint?: string;
};

const accentStyles = {
  green: {
    iconBg: "bg-brand-100",
    iconText: "text-brand-700",
    value: "text-brand-800",
  },
  gold: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-700",
    value: "text-brand-900",
  },
  teal: {
    iconBg: "bg-teal-50",
    iconText: "text-teal-700",
    value: "text-teal-800",
  },
  emerald: {
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-700",
    value: "text-emerald-800",
  },
  forest: {
    iconBg: "bg-brand-50",
    iconText: "text-brand-600",
    value: "text-brand-900",
  },
} as const;

export function AdminStatCard({ label, value, icon, accent, hint }: AdminStatCardProps) {
  const styles = accentStyles[accent];

  return (
    <div className="card-elevated flex flex-col gap-3 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}>
          <Icon name={icon} className={`h-5 w-5 ${styles.iconText}`} />
        </div>
        {hint && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
            {hint}
          </span>
        )}
      </div>
      <div>
        <p className={`text-2xl font-bold tabular-nums sm:text-3xl ${styles.value}`}>{value}</p>
        <p className="mt-1 text-sm font-medium text-gray-500">{label}</p>
      </div>
    </div>
  );
}
