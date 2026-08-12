import type { NextConfig } from "next";

const backend = process.env.BACKEND_URL || "http://localhost:3001";

function backendHostname(): string | null {
  try {
    return new URL(backend).hostname;
  } catch {
    return null;
  }
}

const apiHost = backendHostname();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "3001" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      ...(apiHost
        ? [{ protocol: "https" as const, hostname: apiHost }]
        : [{ protocol: "https" as const, hostname: "*.onrender.com" }]),
    ],
    unoptimized: true,
  },
  async redirects() {
    return [{ source: "/access", destination: "/marketplace", permanent: true }];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/uploads/:path*", destination: `${backend}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
