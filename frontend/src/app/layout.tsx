import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "ANI Agricultural Exchange Platform",
  description: "Connect farmers, buyers, and agents across Ghana",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
        <footer className="mt-auto border-t border-brand-200 bg-brand-900 py-6 text-center text-sm text-brand-100">
          ANI Agricultural Exchange Platform — Connecting verified producers with buyers
        </footer>
      </body>
    </html>
  );
}
