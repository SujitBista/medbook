import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@medbook/types", "@medbook/ui"],
};

export default nextConfig;
