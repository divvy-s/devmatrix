import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Phaser needs this off to avoid double-init
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {
    // No special config needed - Phaser works fine with Turbopack
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
