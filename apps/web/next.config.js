/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Transpile packages from the monorepo
  transpilePackages: ["@medbook/types", "@medbook/ui"],
};

module.exports = nextConfig;
