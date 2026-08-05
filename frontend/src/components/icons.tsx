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
  | "leaf"
  | "chevron-left"
  | "chevron-right"
  | "eye"
  | "eye-off"
  | "book"
  | "plus"
  | "heart"
  | "share"
  | "download"
  | "thumbs-up"
  | "comment"
  | "user-plus"
  | "check-circle"
  | "clock"
  | "x-circle"
  | "logo"
  | "file"
  | "image"
  | "send"
  | "phone"
  | "refresh";

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
  "chevron-left": (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
    </>
  ),
  "chevron-right": (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </>
  ),
  eye: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    </>
  ),
  "eye-off": (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-10-8-10-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 10 8 10 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l22 22" />
    </>
  ),
  book: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </>
  ),
  plus: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </>
  ),
  heart: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
    </>
  ),
  share: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14" />
    </>
  ),
  download: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
    </>
  ),
  "thumbs-up": (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 001.99-1.7l1.38-9a2 2 0 00-1.99-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
    </>
  ),
  comment: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </>
  ),
  "user-plus": (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </>
  ),
  "check-circle": (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </>
  ),
  clock: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </>
  ),
  "x-circle": (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </>
  ),
  logo: (
    <svg viewBox="0 0 68 40" fill="none" className="h-full w-full">
      <polygon points="20 4, 34 12, 34 28, 20 36, 6 28, 6 12" fill="#1F9D68" stroke="#2C3238" strokeWidth="3.5" strokeLinejoin="round" />
      <polygon points="48 4, 62 12, 62 28, 48 36, 34 28, 34 12" fill="none" stroke="#2C3238" strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  ),
  file: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </>
  ),
  image: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </>
  ),
  send: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </>
  ),
  phone: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </>
  ),
  refresh: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
  RESEARCH_PURCHASE: "book",
  NEW_PRODUCT: "store",
  NEW_FARMER: "users",
  NEW_PUBLICATION: "book",
  FARM_PRODUCTS_AVAILABLE: "store",
  ORDER_PAYMENT_RELEASED: "coins",
  MONEY_DISTRIBUTED: "coins",
  HANDLER_DROPPED: "users",
  NEW_ACCOUNTANT_REGISTRATION: "users",
  ACCOUNTANT_REGISTRATION_SUBMITTED: "clock",
  ACCOUNTANT_APPROVED: "check-circle",
  ACCOUNTANT_REJECTED: "x",
  USER_VERIFIED: "check-circle",
  INTERNATIONAL_VERIFICATION: "check-circle",
};
