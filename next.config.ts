import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [{ hostname: "t3.gstatic.com" }],
  },
  logging: { fetches: { fullUrl: true } },
};

export default nextConfig;
