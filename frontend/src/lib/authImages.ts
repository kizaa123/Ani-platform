/**
 * Auth page side-panel backgrounds (login vs register).
 *
 * Use with inline `backgroundImage` style — do not use Tailwind arbitrary
 * background-url classes; they fail for public assets with spaces in filenames.
 *
 * Filenames with spaces are encoded via `authPanelBackgroundUrl`.
 */

/** Home page hero image — shared by login and register side panels. */
export const AUTH_HERO_BACKGROUND =
  "/comprehensive-world-flags-collection-stunning-national-flag-images-every-project-showcase-beauty-diversity-global-360726791.webp";

/** Focal point aligned with the home page hero (`object-[center_25%]`). */
export const AUTH_HERO_BACKGROUND_POSITION = "center 25%";

/** @deprecated Use AUTH_HERO_BACKGROUND */
export const LOGIN_PANEL_BACKGROUND = AUTH_HERO_BACKGROUND;

/** @deprecated Use AUTH_HERO_BACKGROUND */
export const REGISTER_PANEL_BACKGROUND = AUTH_HERO_BACKGROUND;

/** @deprecated Use AUTH_HERO_BACKGROUND_POSITION */
export const REGISTER_PANEL_BACKGROUND_POSITION = AUTH_HERO_BACKGROUND_POSITION;

/** CSS `url(...)` value safe for public paths that may contain spaces. */
export function authPanelBackgroundUrl(path: string): string {
  return `url('${encodeURI(path)}')`;
}

/** Inline styles for auth side-panel background images (cover + centered). */
export function authPanelBackgroundStyle(
  path: string,
  position = "center center",
): {
  backgroundImage: string;
  backgroundSize: "cover";
  backgroundPosition: string;
  backgroundRepeat: "no-repeat";
} {
  return {
    backgroundImage: authPanelBackgroundUrl(path),
    backgroundSize: "cover",
    backgroundPosition: position,
    backgroundRepeat: "no-repeat",
  };
}
