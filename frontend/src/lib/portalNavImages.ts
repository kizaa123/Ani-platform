/**
 * Portal dashboard navigation card images.
 *
 * HOW TO CHANGE IMAGES:
 * 1. Place replacement files under `frontend/public/` (same as homepage role cards), e.g.
 *    `frontend/public/marketplace.jpg`, or optionally under `frontend/public/portal/`.
 * 2. Update the matching path below for the card you want to change (paths start with `/`).
 * 3. Keys must match the card `href` values in `frontend/src/app/dashboard/page.tsx`.
 * 4. Unknown hrefs fall back to `PORTAL_NAV_IMAGE_FALLBACK` via `getPortalNavImage()`.
 *
 * Homepage role card images live separately in `frontend/src/app/page.tsx` (`ROLE_CARD_IMAGES`).
 */

/** Shared cards shown on multiple role dashboards */
export const PORTAL_NAV_IMAGES_SHARED = {
  /** Change image here: Marketplace card (farmer, buyer, handler, staff) */
  "/marketplace": "/truongdinhanh-agriculture-9939844_1920.jpg",
  /** Change image here: Research Library card (farmer, buyer, handler, staff) */
  "/library": "/Agric researchers.jpg",
  /** Change image here: Connections card (all roles that see it) */
  "/connections": "/farmer and her agent.webp",
} as const;

/** Farmer portal dashboard cards (crop / livestock / fruit farmers) */
export const PORTAL_NAV_IMAGES_FARMER = {
  /** Change image here: My Farm card */
  "/farm": "/famer on pitch.jpg",
  /** Change image here: Farmer Financial Statement card */
  "/farm/financials": "/images.jpg",
  /** Change image here: Farmer Profile card */
  "/farm/settings": "/happy-couple-agriculturists-using-touchpad-260nw-2667020919.webp",
} as const;

/** Buyer portal dashboard cards */
export const PORTAL_NAV_IMAGES_BUYER = {
  /** Change image here: Buyer Access card */
  "/access": "/farmer and buyer.jpg",
  /** Change image here: Buyer Financial Statement card */
  "/financials": "/istockphoto-1414242877-612x612.jpg",
  /** Change image here: My Orders card */
  "/orders": "/stock-photo-couple-of-male-and-female-farmers-harvest-crop-of-green-lettuce-on-a-plantation-1978085750.jpg",
  /** Change image here: Buyer Profile card */
  "/settings": "/happy-couple-agriculturists-using-touchpad-260nw-2667020919.webp",
} as const;

/** Researcher portal dashboard cards */
export const PORTAL_NAV_IMAGES_RESEARCHER = {
  /** Change image here: My Publications card */
  "/researcher/publications": "/Agric researchers.jpg",
  /** Change image here: Researcher Financial Statement card */
  "/researcher/financials": "/images.jpg",
  /** Change image here: Researcher Profile card */
  "/researcher/settings": "/happy-couple-agriculturists-using-touchpad-260nw-2667020919.webp",
} as const;

/** Handler portal dashboard cards (farmer handler + buyer handler) */
export const PORTAL_NAV_IMAGES_HANDLER = {
  /** Change image here: My Clients / My Buyers card */
  "/agents": "/farmer and her agent.webp",
  /** Change image here: Handler Profile card */
  "/agents/settings": "/happy-couple-agriculturists-using-touchpad-260nw-2667020919.webp",
} as const;

/** Staff / admin portal dashboard cards */
export const PORTAL_NAV_IMAGES_STAFF = {
  /** Change image here: Admin Panel card */
  "/admin": "/team_1.png",
  /** Change image here: Staff Profile card */
  "/profile": "/team_2.png",
} as const;

/** Flat lookup used by dashboard cards — do not edit paths here; edit the role sections above. */
export const PORTAL_NAV_IMAGES: Record<string, string> = {
  ...PORTAL_NAV_IMAGES_SHARED,
  ...PORTAL_NAV_IMAGES_FARMER,
  ...PORTAL_NAV_IMAGES_BUYER,
  ...PORTAL_NAV_IMAGES_RESEARCHER,
  ...PORTAL_NAV_IMAGES_HANDLER,
  ...PORTAL_NAV_IMAGES_STAFF,
};

/** Fallback when a card href has no configured image yet */
export const PORTAL_NAV_IMAGE_FALLBACK = "/login_cover.png";

export function getPortalNavImage(href: string): string {
  return PORTAL_NAV_IMAGES[href] ?? PORTAL_NAV_IMAGE_FALLBACK;
}
