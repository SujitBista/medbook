#!/usr/bin/env node

/**
 * Script to update Vercel project build settings via API
 * Usage: VERCEL_TOKEN=your_token node scripts/update-vercel-build-settings.js
 */

const https = require("https");

const PROJECT_ID = "prj_07KaCMgV1oaSLLUrPDr7cKJZrPU7";
const ORG_ID = "team_fNFelOIvv1SlJZQVv6Fxljuy";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

if (!VERCEL_TOKEN) {
  console.error("Error: VERCEL_TOKEN environment variable is required");
  console.error("Get your token from: https://vercel.com/account/tokens");
  process.exit(1);
}

const data = JSON.stringify({
  rootDirectory: "apps/web",
  installCommand: "cd ../.. && pnpm install --frozen-lockfile",
  buildCommand: "cd ../.. && pnpm build --filter=web",
  outputDirectory: ".next",
});

const options = {
  hostname: "api.vercel.com",
  port: 443,
  path: `/v10/projects/${PROJECT_ID}?teamId=${ORG_ID}`,
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    "Content-Type": "application/json",
    "Content-Length": data.length,
  },
};

const req = https.request(options, (res) => {
  let responseData = "";

  res.on("data", (chunk) => {
    responseData += chunk;
  });

  res.on("end", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log("✅ Successfully updated Vercel project build settings");
      const result = JSON.parse(responseData);
      console.log("Project:", result.name);
      console.log("Root Directory:", result.rootDirectory);
      console.log("Install Command:", result.installCommand);
      console.log("Build Command:", result.buildCommand);
      console.log("Output Directory:", result.outputDirectory);
    } else {
      console.error("❌ Error updating Vercel project settings");
      console.error("Status:", res.statusCode);
      console.error("Response:", responseData);
      process.exit(1);
    }
  });
});

req.on("error", (error) => {
  console.error("❌ Request error:", error.message);
  process.exit(1);
});

req.write(data);
req.end();
