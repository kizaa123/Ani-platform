import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "home"
  | "store"
  | "wheat"
  | "chart"
  | "package"
  | "settings"
  | "user"
  | "users"
  | "handshake"
  | "credit-card"
  | "shield"
  | "search"
  | "camera"
  | "lock"
  | "calendar"
  | "bell"
  | "sprout"
  | "check"
  | "x"
  | "cart"
  | "truck"
  | "message"
  | "coins"
  | "leaf";

type IconProps = SVGProps<SVGSVGElement> & { name: IconName };

const paths: Record<IconName, ReactNode> = {
  home: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" />
    </>
  ),
  store: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1-4h16l1 4M5 9v11h14V9M9 21v-6h6v6" />
    </>
  ),
  wheat: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M8 7c0-2 1.5-3 4-3s4 1 4 3M8 12c0-2 1.5-3 4-3s4 1 4 3M8 17c0-2 1.5-3 4-3s4 1 4 3" />
    </>
  ),
  chart: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5M4 19h16M8 17V11M12 17V7M16 17v-4" />
    </>
  ),
  package: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5" />
    </>
  ),
  settings: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.2.65.77 1.12 1.44 1.12H21a2 2 0 010 4h-.09c-.67 0-1.24.47-1.44 1.12z" />
    </>
  ),
  user: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
    </>
  ),
  users: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </>
  ),
  handshake: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l2-2 3 3 5-5 2 2M4 14l3 3M20 14l-3 3M12 8V4M8 6l4-2 4 2" />
    </>
  ),
  "credit-card": (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h2M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" />
    </>
  ),
  shield: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7l8-4z" />
    </>
  ),
  search: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" />
    </>
  ),
  camera: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h3l2-2h6l2 2h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17a3 3 0 100-6 3 3 0 000 6z" />
    </>
  ),
  lock: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V8a5 5 0 0110 0v3M6 11h12v10H6V11z" />
    </>
  ),
  calendar: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v2M16 3v2M4 9h16M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
    </>
  ),
  bell: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </>
  ),
  sprout: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22V12M12 12C12 7 7 4 4 4c0 4 3 8 8 8M12 12c0-5 5-8 8-8 0 4-3 8-8 8" />
    </>
  ),
  check: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
    </>
  ),
  x: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
    </>
  ),
  cart: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h15l-1.5 9H7.5L6 6zM6 6L5 3H2M9 21a1 1 0 100-2 1 1 0 000 2zM18 21a1 1 0 100-2 1 1 0 000 2z" />
    </>
  ),
  truck: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v8H3V7zM14 10h4l2 3v2h-6v-5zM7 18a2 2 0 100-4 2 2 0 000 4zM17 18a2 2 0 100-4 2 2 0 000 4z" />
    </>
  ),
  message: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
    </>
  ),
  coins: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M8 7h8M8 12h8M8 17h8" />
    </>
  ),
  leaf: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22c-5-3-8-8-8-14 4 0 8 2 8 6 0-4 4-6 8-6 0 6-3 11-8 14z" />
    </>
  ),
};

export function Icon({ name, className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

export const NOTIFICATION_ICONS: Record<string, IconName> = {
  CHAT_MESSAGE: "message",
  NEW_ORDER: "package",
  PRODUCT_PURCHASE: "cart",
  ORDER_TRACKED: "truck",
  CONNECTION_REQUEST: "handshake",
  CONNECTION_APPROVED: "check",
  CONNECTION_DECLINED: "x",
  FARM_ACCESS_PAID: "coins",
};
