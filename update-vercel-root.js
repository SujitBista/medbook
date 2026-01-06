#!/usr/bin/env node

/**
 * Script to update Vercel project Root Directory via API
 * Usage: VERCEL_TOKEN=your_token node update-vercel-root.js
 */

const https = require("https");

const PROJECT_ID = "prj_07KaCMgV1oaSLLUrPDr7cKJZrPU7";
const ORG_ID = "team_fNFelOIvv1SlJZQVv6Fxljuy";
const ROOT_DIRECTORY = "apps/web";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

if (!VERCEL_TOKEN) {
  console.error("Error: VERCEL_TOKEN environment variable is required");
  console.error("Get your token from: https://vercel.com/account/tokens");
  process.exit(1);
}

const data = JSON.stringify({
  rootDirectory: ROOT_DIRECTORY,
});

const options = {
  hostname: "api.vercel.com",
  port: 443,
  path: `/v10/projects/${PROJECT_ID}`,
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
      console.log("✅ Successfully updated Root Directory to:", ROOT_DIRECTORY);
      const result = JSON.parse(responseData);
      console.log("Project:", result.name);
      console.log("Root Directory:", result.rootDirectory);
    } else {
      console.error("❌ Error updating Root Directory");
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
