/**
 * Auth page side-panel backgrounds (login vs register).
 *
 * Use with inline `backgroundImage` style — do not use Tailwind arbitrary
 * background-url classes; they fail for public assets with spaces in filenames.
 *
 * To change the login panel image, update `LOGIN_PANEL_BACKGROUND` below
 * (file must live under `frontend/public/`).
 *
 * To change the register panel image, update `REGISTER_PANEL_BACKGROUND` below.
 *
 * Filenames with spaces are encoded via `authPanelBackgroundUrl`.
 */

/** Login side panel — `frontend/public/login_cover.png` */
export const LOGIN_PANEL_BACKGROUND = "/login_cover.png";

/** Register side panel — `frontend/public/images (4).jpg` */
export const REGISTER_PANEL_BACKGROUND = "/images (4).jpg";

/**
 * Register panel focal point — seedling sits slightly above the image center;
 * nudge vertical position so it stays visible in the tall side panel.
 */
export const REGISTER_PANEL_BACKGROUND_POSITION = "center 42%";

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
