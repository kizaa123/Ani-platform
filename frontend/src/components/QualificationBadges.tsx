interface QualificationBadgesProps {
  qualifications?: string[] | null;
  className?: string;
  size?: "sm" | "md";
}

export function QualificationBadges({
  qualifications,
  className = "",
  size = "sm",
}: QualificationBadgesProps) {
  if (!qualifications?.length) return null;

  const badgeClass =
    size === "md"
      ? "rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800"
      : "rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800";

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {qualifications.map((qualification) => (
        <span key={qualification} className={badgeClass}>
          {qualification}
        </span>
      ))}
    </div>
  );
}
