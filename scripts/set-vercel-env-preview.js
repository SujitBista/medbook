#!/usr/bin/env node

/**
 * Script to set NEXT_PUBLIC_API_URL for Preview environment in Vercel
 * Usage: VERCEL_TOKEN=your_token node scripts/set-vercel-env-preview.js
 */

const https = require("https");

const PROJECT_ID = "prj_07KaCMgV1oaSLLUrPDr7cKJZrPU7";
const ORG_ID = "team_fNFelOIvv1SlJZQVv6Fxljuy";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const API_URL = "https://medbook-s5g5.onrender.com/api/v1";
const ENV_KEY = "NEXT_PUBLIC_API_URL";

if (!VERCEL_TOKEN) {
  console.error("Error: VERCEL_TOKEN environment variable is required");
  console.error("Get your token from: https://vercel.com/account/tokens");
  process.exit(1);
}

const data = JSON.stringify({
  key: ENV_KEY,
  value: API_URL,
  type: "plain", // NEXT_PUBLIC_* variables are public, so plain is fine
  target: ["preview"], // Add for Preview environment
});

const options = {
  hostname: "api.vercel.com",
  port: 443,
  path: `/v10/projects/${PROJECT_ID}/env?teamId=${ORG_ID}`,
  method: "POST",
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
      console.log(`✅ Successfully set ${ENV_KEY} for Preview environment`);
      const result = JSON.parse(responseData);
      console.log(`Key: ${result.key}`);
      console.log(`Target: ${result.target?.join(", ") || "preview"}`);
      console.log(`Value: ${result.value || "Encrypted"}`);
      console.log(
        "\n⚠️  Note: You may need to redeploy preview deployments for the change to take effect"
      );
    } else {
      // Check if variable already exists (409 Conflict)
      if (res.statusCode === 409) {
        console.log(`⚠️  ${ENV_KEY} already exists. Attempting to update...`);
        // Try to update instead
        updateExistingEnvVar();
      } else {
        console.error(`❌ Error setting environment variable`);
        console.error("Status:", res.statusCode);
        console.error("Response:", responseData);
        process.exit(1);
      }
    }
  });
});

req.on("error", (error) => {
  console.error("❌ Request error:", error.message);
  process.exit(1);
});

req.write(data);
req.end();

// Function to update existing environment variable
function updateExistingEnvVar() {
  // First, we need to get the environment variable ID
  // List all env vars and find the one we need
  const listOptions = {
    hostname: "api.vercel.com",
    port: 443,
    path: `/v10/projects/${PROJECT_ID}/env?teamId=${ORG_ID}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
    },
  };

  const listReq = https.request(listOptions, (listRes) => {
    let listData = "";

    listRes.on("data", (chunk) => {
      listData += chunk;
    });

    listRes.on("end", () => {
      if (listRes.statusCode >= 200 && listRes.statusCode < 300) {
        const envVars = JSON.parse(listData);
        const existingVar = envVars.envs?.find((env) => env.key === ENV_KEY);

        if (existingVar) {
          // Update the existing variable to include preview
          const updateData = JSON.stringify({
            value: API_URL,
            target: [...(existingVar.target || []), "preview"], // Add preview to existing targets
            type: existingVar.type || "plain",
          });

          const updateOptions = {
            hostname: "api.vercel.com",
            port: 443,
            path: `/v10/projects/${PROJECT_ID}/env/${existingVar.id}?teamId=${ORG_ID}`,
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${VERCEL_TOKEN}`,
              "Content-Type": "application/json",
              "Content-Length": updateData.length,
            },
          };

          const updateReq = https.request(updateOptions, (updateRes) => {
            let updateResponseData = "";

            updateRes.on("data", (chunk) => {
              updateResponseData += chunk;
            });

            updateRes.on("end", () => {
              if (updateRes.statusCode >= 200 && updateRes.statusCode < 300) {
                console.log(
                  `✅ Successfully updated ${ENV_KEY} to include Preview environment`
                );
                const result = JSON.parse(updateResponseData);
                console.log(`Key: ${result.key}`);
                console.log(
                  `Target: ${result.target?.join(", ") || "preview"}`
                );
                console.log(
                  "\n⚠️  Note: You may need to redeploy preview deployments for the change to take effect"
                );
              } else {
                console.error(`❌ Error updating environment variable`);
                console.error("Status:", updateRes.statusCode);
                console.error("Response:", updateResponseData);
                process.exit(1);
              }
            });
          });

          updateReq.on("error", (error) => {
            console.error("❌ Request error:", error.message);
            process.exit(1);
          });

          updateReq.write(updateData);
          updateReq.end();
        } else {
          console.error(`❌ Could not find existing ${ENV_KEY} variable`);
          process.exit(1);
        }
      } else {
        console.error(`❌ Error listing environment variables`);
        console.error("Status:", listRes.statusCode);
        console.error("Response:", listData);
        process.exit(1);
      }
    });
  });

  listReq.on("error", (error) => {
    console.error("❌ Request error:", error.message);
    process.exit(1);
  });

  listReq.end();
}
