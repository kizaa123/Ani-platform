export const PLATFORM_NAME = "ConcordiaOrbis";
export const SITE_NAME = PLATFORM_NAME;
export const SITE_SHORT_NAME = PLATFORM_NAME;
export const PLATFORM_ACCOUNTANT_LABEL = `${PLATFORM_NAME} Accountant`;
export const PLATFORM_TEAM_LABEL = `${PLATFORM_NAME} Team`;
export const SITE_DESCRIPTION =
  "Connect fellows, clients, and liaison officers across Africa and beyond";

/** Absolute site origin for metadata (og:image, canonical URLs). */
export function getSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return new URL(configured.endsWith("/") ? configured : `${configured}/`);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return new URL(`https://${vercel.replace(/\/$/, "")}/`);
  }

  return new URL("http://localhost:3000/");
}
