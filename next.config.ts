import type { NextConfig } from "next";

const nextConfig = {
  output: "export",
  distDir: "out", // or '.out' - make sure this matches your frontendDist
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
