/**
 * Shared Tailwind CSS configuration for MedBook monorepo
 * Note: Apps should extend this config and add their own content paths
 */
const path = require("path");

module.exports = {
  content: [
    // Shared UI components - resolved relative to this config file
    path.resolve(__dirname, "../../ui/src/**/*.{js,ts,jsx,tsx,mdx}"),
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
      },
    },
  },
  plugins: [],
};
