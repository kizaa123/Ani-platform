interface EmailTextProps {
  email: string;
  className?: string;
  /** Truncate long addresses; full value shown via title tooltip */
  truncate?: boolean;
  /** Render as a mailto link */
  link?: boolean;
  as?: "span" | "p";
}

function emailClass(truncate: boolean, className?: string) {
  return [truncate ? "email-display-truncate" : "email-display", className].filter(Boolean).join(" ");
}

export function EmailText({
  email,
  className,
  truncate = false,
  link = false,
  as: Tag = "span",
}: EmailTextProps) {
  const classes = emailClass(truncate, className);

  if (link) {
    return (
      <a href={`mailto:${email}`} className={classes} title={email}>
        {email}
      </a>
    );
  }

  return (
    <Tag className={classes} title={email}>
      {email}
    </Tag>
  );
}
