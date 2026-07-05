import type { NextConfig } from "next";

const backend = process.env.BACKEND_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "3001" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
    unoptimized: true,
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/uploads/:path*", destination: `${backend}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
