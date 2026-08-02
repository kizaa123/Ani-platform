/**
 * Homepage "How It Works" step card images.
 *
 * HOW TO CHANGE IMAGES:
 * 1. Drop replacement files under `frontend/public/` or `frontend/public/how-it-works/`.
 * 2. Update the matching path below (paths start with `/`, e.g. `/how-it-works/step-1.jpg`).
 * 3. Used by the "How It Works" section in `frontend/src/app/page.tsx`.
 *
 * Role card images are configured separately in `ROLE_CARD_IMAGES` inside `page.tsx`.
 */

export const HOW_IT_WORKS_IMAGES = {
  /** Change image here: Step 1 - Farmers Register */
  farmersRegister: "/3d-render-secure-login-password-illustration_107791-16640.avif",
  /** Change image here: Step 2 - Buyers Pay for Access */
  buyersPay: "/Earned-Wage-Access-6.jpg",
  /** Change image here: Step 3 - Agents Represent */
  agentsRepresent: "/male-farmer-signs-insurance-policy-260nw-2468716255.webp",
  /** Change image here: Step 4 - Connect & Trade */
  connectTrade: "/istockphoto-466467985-612x612.jpg",
} as const;
