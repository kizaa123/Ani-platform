/**

 * Portal dashboard navigation card images.

 *

 * HOW TO CHANGE IMAGES:

 * 1. Place replacement files under `frontend/public/` or `frontend/public/portal/`.

 * 2. Update the matching path in the role section below (paths start with `/`).

 * 3. Keys must match the card `href` values in `frontend/src/app/dashboard/page.tsx`.

 * 4. Crop vs livestock farmers have separate sections — edit the one that matches your role.
 *    Buyers have their own section (`PORTAL_NAV_IMAGES_BUYER`), including a distinct Marketplace image.

 * 5. For custom portal paths (e.g. `/portal/crop-marketplace.jpg`), add the file under

 *    `public/portal/` then remove its entry from `PORTAL_CUSTOM_PATH_FALLBACKS` so the

 *    custom file is used instead of the stock fallback.

 * 6. Unknown hrefs fall back to `PORTAL_NAV_IMAGE_FALLBACK` via `getPortalNavImage()`.

 *

 * Homepage role card images live separately in `frontend/src/app/page.tsx` (`ROLE_CARD_IMAGES`).

 */



import { ROLES } from "./types";



/** Shared cards shown on buyer, handler, staff, and researcher dashboards */

export const PORTAL_NAV_IMAGES_SHARED = {

  /** Change image here: Marketplace card (handler, staff — buyers use PORTAL_NAV_IMAGES_BUYER; farmers use crop/livestock sections) */

  "/marketplace": "/farmer market place.png",

  /** Change image here: Research Library card (farmer, buyer, handler, staff) */

  "/library": "/Research Library.jpg",

  /** Change image here: Connections card (all roles that see it) */

  "/connections": "/connections.avif",

} as const;



/**

 * Crop farmer portal dashboard (role 1).

 * Edit images in this section for crop farmer cards only.

 */

export const PORTAL_NAV_IMAGES_CROP_FARMER = {

  /** CROP: Marketplace */

  "/marketplace": "/marketplace-friendly-exchange-stockcake.jpg",

  /** CROP: My Farm */

  "/farm": "/young-farmer-is-writing-notes-in-his-growing-corn-field-2XCDAWT.jpg",

  /** CROP: Financial Statement card */

  "/farm/financials": "/accountant-filing-invoice.webp",

  /** CROP: Profile card */

  "/farm/settings": "/happy-couple-agriculturists-using-touchpad-260nw-2667020919.webp",

} as const;



/**

 * Livestock farmer portal dashboard (role 2).

 * Edit images in this section for livestock farmer cards only.

 */

export const PORTAL_NAV_IMAGES_LIVESTOCK_FARMER = {

  /** LIVESTOCK: Marketplace */

  "/marketplace": "/poultry.webp",

  /** LIVESTOCK: My Farm */

  "/farm": "/live stock farm.jpg",

  /** LIVESTOCK: Financial Statement card */

  "/farm/financials": "/accountant-filing-invoice.webp",

  /** LIVESTOCK: Profile card */

  "/farm/settings": "/happy-couple-agriculturists-using-touchpad-260nw-2667020919.webp",

} as const;



/** Buyer portal dashboard cards */

export const PORTAL_NAV_IMAGES_BUYER = {

  /** Change image here: Buyer Marketplace card (distinct from crop/livestock farmer marketplace images) */

  "/marketplace": "/farmer market place.png",

  /** Change image here: Buyer Access card */

  "/access": "/Acess card farm.jpg",

  /** Change image here: Buyer Financial Statement card */

  "/financials": "/accountant-filing-invoice.webp",

  /** Change image here: My Orders card */

  "/orders": "/stock-photo-couple-of-male-and-female-farmers-harvest-crop-of-green-lettuce-on-a-plantation-1978085750.jpg",

  /** Change image here: Buyer Profile card */

  "/settings": "/happy-couple-agriculturists-using-touchpad-260nw-2667020919.webp",

} as const;



/** Researcher portal dashboard cards */

export const PORTAL_NAV_IMAGES_RESEARCHER = {

  /** Change image here: My Publications card */

  "/researcher/publications": "/Agric researchers.jpg",

  /** Change image here: Researcher Profile card */

  "/researcher/settings": "/happy-couple-agriculturists-using-touchpad-260nw-2667020919.webp",

} as const;



/** Handler portal dashboard cards (farmer handler + buyer handler) */

export const PORTAL_NAV_IMAGES_HANDLER = {

  /** Change image here: My Clients / My Buyers card */

  "/agents": "/farmer and her agent.webp",

  /** Change image here: Handler Financial Statement card */

  "/agents/financials": "/accountant-filing-invoice.webp",

  /** Change image here: Handler Profile card */

  "/agents/settings": "/happy-couple-agriculturists-using-touchpad-260nw-2667020919.webp",

} as const;



/** Staff / admin portal dashboard cards */

export const PORTAL_NAV_IMAGES_STAFF = {

  /** Change image here: Admin Panel card */

  "/admin": "/team_1.png",

  /** Change image here: Platform Financial Statement card */

  "/admin/financials": "/accountant-filing-invoice.webp",

  /** Change image here: Staff Profile card */

  "/profile": "/team_2.png",

} as const;



/**

 * Stock fallbacks for custom `/portal/...` paths until files are added under `public/portal/`.

 * Remove an entry here once the matching portal file exists.

 */

export const PORTAL_CUSTOM_PATH_FALLBACKS: Record<string, string> = {};



/** Buyer-only hrefs resolved via `getPortalNavImage(..., ROLES.BUYER)` — omitted from flat lookup so handlers/staff keep SHARED paths. */

const { "/marketplace": _buyerMarketplace, ...PORTAL_NAV_IMAGES_BUYER_FLAT } = PORTAL_NAV_IMAGES_BUYER;



/** Flat lookup for non-farmer roles — do not edit paths here; edit the role sections above. */

export const PORTAL_NAV_IMAGES: Record<string, string> = {

  ...PORTAL_NAV_IMAGES_SHARED,

  ...PORTAL_NAV_IMAGES_BUYER_FLAT,

  ...PORTAL_NAV_IMAGES_RESEARCHER,

  ...PORTAL_NAV_IMAGES_HANDLER,

  ...PORTAL_NAV_IMAGES_STAFF,

};



/** Fallback when a card href has no configured image yet */

export const PORTAL_NAV_IMAGE_FALLBACK = "/login_cover.png";



type RoleNavImages =

  | typeof PORTAL_NAV_IMAGES_CROP_FARMER

  | typeof PORTAL_NAV_IMAGES_LIVESTOCK_FARMER

  | typeof PORTAL_NAV_IMAGES_BUYER;



function resolvePortalNavImagePath(path: string): string {

  return PORTAL_CUSTOM_PATH_FALLBACKS[path] ?? path;

}



function roleNavImage(config: RoleNavImages, href: string): string | undefined {

  if (!(href in config)) return undefined;

  return resolvePortalNavImagePath(config[href as keyof typeof config]);

}



/** Returns the dashboard card image for `href`, using role-specific configs when `roleId` matches. */

export function getPortalNavImage(href: string, roleId?: number): string {

  if (roleId === ROLES.CROP_FARMER) {

    const crop = roleNavImage(PORTAL_NAV_IMAGES_CROP_FARMER, href);

    if (crop) return crop;

  }

  if (roleId === ROLES.LIVESTOCK_FARMER) {

    const livestock = roleNavImage(PORTAL_NAV_IMAGES_LIVESTOCK_FARMER, href);

    if (livestock) return livestock;

  }

  if (roleId === ROLES.BUYER) {

    const buyer = roleNavImage(PORTAL_NAV_IMAGES_BUYER, href);

    if (buyer) return buyer;

  }

  return PORTAL_NAV_IMAGES[href] ?? PORTAL_NAV_IMAGE_FALLBACK;

}


