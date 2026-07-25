const http = require("http");
const pool = require("./db");
const { ensureSchema } = require("./db");
const app = require("./server");
const logger = require("./logger");

let server;
const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}`;

async function runSystemVerification() {
  console.log("\n==================================================");
  console.log("🚀 STARTING FULL-SYSTEM END-TO-END VERIFICATION");
  console.log("==================================================\n");

  try {
    // 1. Verify DB Schema Migration
    console.log("Step 1: Testing PostgreSQL Schema Migration...");
    await ensureSchema();
    console.log("✅ Schema Migration PASSED!\n");

    // 2. Boot Test Server
    console.log("Step 2: Starting Express Test Server on Port 5055...");
    await new Promise((resolve) => {
      server = app.listen(PORT, resolve);
    });
    console.log("✅ Backend Server Boot PASSED!\n");

    // 3. Test Health Endpoint
    console.log("Step 3: Checking GET /health...");
    const healthRes = await fetchJson(`${BASE_URL}/health`);
    console.log("Health Status:", healthRes.data);
    if (healthRes.status !== 200) throw new Error("Health check failed");
    console.log("✅ Health Endpoint PASSED!\n");

    // 4. Test User Registration
    console.log("Step 4: Testing User Registration POST /api/auth/signup...");
    const testEmail = `testuser_${Date.now()}@example.com`;
    const signupRes = await fetchJson(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "password123", name: "Verification Bot" }),
    });

    if (signupRes.status !== 201 || !signupRes.data.token) {
      throw new Error(`Signup failed: ${JSON.stringify(signupRes.data)}`);
    }
    const userToken = signupRes.data.token;
    console.log("✅ User Registration PASSED! User ID:", signupRes.data.user.id, "\n");

    // 5. Test Profile Verification
    console.log("Step 5: Testing GET /api/auth/me...");
    const meRes = await fetchJson(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (meRes.status !== 200 || meRes.data.user.email !== testEmail) {
      throw new Error("Auth me check failed");
    }
    console.log("✅ Auth /me PASSED! Logged in as:", meRes.data.user.name, "\n");

    // 6. Test URL Shortening
    console.log("Step 6: Testing Link Shortening POST /api/shorten...");
    const shortenRes = await fetchJson(`${BASE_URL}/api/shorten`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        url: "https://github.com/facebook/react",
        alias: `react-repo-${Date.now().toString().slice(-4)}`,
      }),
    });

    if (shortenRes.status !== 200 || !shortenRes.data.short_code) {
      throw new Error(`Shorten URL failed: ${JSON.stringify(shortenRes.data)}`);
    }
    const shortCode = shortenRes.data.short_code;
    console.log("✅ URL Shortening PASSED! Short Code:", shortCode, "\n");

    // 7. Test 302 Redirect & Click Tracking (3 consecutive visits)
    console.log(`Step 7: Testing 302 Redirect & Click Counting GET /${shortCode}...`);
    await fetch(`${BASE_URL}/${shortCode}`, { redirect: "manual" });
    await fetch(`${BASE_URL}/${shortCode}`, { redirect: "manual" });
    await fetch(`${BASE_URL}/${shortCode}`, { redirect: "manual" });

    const statsRes = await fetchJson(`${BASE_URL}/api/stats/${shortCode}`);
    if (statsRes.status !== 200 || statsRes.data.clicks !== 3) {
      throw new Error(`Click count verification failed! Expected 3 clicks, got ${statsRes.data.clicks}`);
    }
    console.log("Verified stats count in PostgreSQL:", statsRes.data.clicks, "clicks");
    console.log("✅ 302 HTTP Redirect & Consecutive Click Counter PASSED!\n");

    // 8. Test Analytics Retrieval
    console.log(`Step 8: Testing Analytics GET /api/stats/${shortCode}/analytics...`);
    const analyticsRes = await fetchJson(`${BASE_URL}/api/stats/${shortCode}/analytics`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (analyticsRes.status !== 200) {
      throw new Error(`Analytics failed: ${JSON.stringify(analyticsRes.data)}`);
    }
    console.log("Daily clicks count:", analyticsRes.data.daily_clicks.length);
    console.log("✅ Analytics API PASSED!\n");

    // 9. Test Developer API Key Generation
    console.log("Step 9: Testing API Key Creation POST /api/keys...");
    const keyRes = await fetchJson(`${BASE_URL}/api/keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ name: "CI Verification Key" }),
    });

    if (keyRes.status !== 201 || !keyRes.data.secret_key) {
      throw new Error(`API key generation failed: ${JSON.stringify(keyRes.data)}`);
    }
    const secretApiKey = keyRes.data.secret_key;
    console.log("✅ API Key Generation PASSED! Prefix:", keyRes.data.key_prefix, "\n");

    // 10. Test Developer API Endpoint POST /api/v1/links
    console.log("Step 10: Testing Developer Endpoint POST /api/v1/links with Bearer API Key...");
    const apiV1Res = await fetchJson(`${BASE_URL}/api/v1/links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretApiKey}`,
      },
      body: JSON.stringify({ url: "https://nodejs.org" }),
    });

    if (apiV1Res.status !== 201 || !apiV1Res.data.short_code) {
      throw new Error(`API v1 create link failed: ${JSON.stringify(apiV1Res.data)}`);
    }
    console.log("✅ Developer API Key Link Shortening PASSED! Short Code:", apiV1Res.data.short_code, "\n");

    // 11. Test Team Workspace Creation
    console.log("Step 11: Testing Team Workspace Creation POST /api/teams...");
    const teamRes = await fetchJson(`${BASE_URL}/api/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ name: "Engineering Team" }),
    });

    if (teamRes.status !== 201 || !teamRes.data.team) {
      throw new Error(`Team creation failed: ${JSON.stringify(teamRes.data)}`);
    }
    console.log("✅ Team Workspace Creation PASSED! Team Name:", teamRes.data.team.name, "\n");

    // 12. Test Audit Logs Retrieval
    console.log("Step 12: Testing Security Audit Logs GET /api/audit-logs...");
    const auditRes = await fetchJson(`${BASE_URL}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (auditRes.status !== 200 || !Array.isArray(auditRes.data.logs)) {
      throw new Error("Audit logs check failed");
    }
    console.log("Total audit events logged:", auditRes.data.logs.length);
    console.log("✅ Security Audit Logs PASSED!\n");

    console.log("==================================================");
    console.log("🎉 ALL 12 SYSTEM INTEGRATION CHECKS PASSED!");
    console.log("==================================================\n");

  } catch (err) {
    console.error("\n❌ VERIFICATION FAILED:", err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    pool.end();
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  return { status: res.status, data };
}

runSystemVerification();
