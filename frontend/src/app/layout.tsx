import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ANI Agricultural Exchange Platform",
  description: "Connect fellows, clients, and liaison officers across Africa and beyond",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ANI",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1b4332" },
    { media: "(prefers-color-scheme: dark)", color: "#1b4332" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" style={{ colorScheme: "light" }}>
      <body className="flex h-full flex-col overflow-hidden font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
