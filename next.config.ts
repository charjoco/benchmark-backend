import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "cdn.shopify.com" },
      { hostname: "images.lululemon.com" },
      { hostname: "cdn.vuoriclothing.com" },
      { hostname: "**.shopify.com" },
      { hostname: "**.cloudfront.net" },
      { hostname: "**.imgix.net" },
    ],
  },
};

export default nextConfig;
