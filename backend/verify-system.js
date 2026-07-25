const pool = require("./db");
const { ensureSchema } = require("./db");
const app = require("./server");

let server;
const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}`;

async function runSystemVerification() {
  console.log("\n==================================================");
  console.log("🚀 STARTING STREAMLINED CORE SYSTEM VERIFICATION");
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
    console.log("✅ User Registration PASSED!\n");

    // 5. Test Link Shortening
    console.log("Step 5: Testing Link Shortening POST /api/shorten...");
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

    // 6. Test 302 Redirect & Click Tracking (3 visits)
    console.log(`Step 6: Testing 302 Redirect & Consecutive Clicks GET /${shortCode}...`);
    await fetch(`${BASE_URL}/${shortCode}`, { redirect: "manual" });
    await fetch(`${BASE_URL}/${shortCode}`, { redirect: "manual" });
    await fetch(`${BASE_URL}/${shortCode}`, { redirect: "manual" });

    const statsRes = await fetchJson(`${BASE_URL}/api/stats/${shortCode}`);
    if (statsRes.status !== 200 || statsRes.data.clicks !== 3) {
      throw new Error(`Click count verification failed! Expected 3 clicks, got ${statsRes.data.clicks}`);
    }
    console.log("Verified stats count in PostgreSQL:", statsRes.data.clicks, "clicks");
    console.log("✅ 302 Redirect & Click Counter PASSED!\n");

    // 7. Test Analytics Retrieval
    console.log(`Step 7: Testing Analytics GET /api/stats/${shortCode}/analytics...`);
    const analyticsRes = await fetchJson(`${BASE_URL}/api/stats/${shortCode}/analytics`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (analyticsRes.status !== 200) {
      throw new Error(`Analytics failed: ${JSON.stringify(analyticsRes.data)}`);
    }
    console.log("✅ Analytics API PASSED!\n");

    // 8. Test Bulk CSV Endpoint
    console.log("Step 8: Testing Bulk Link Import POST /api/links/bulk...");
    const bulkRes = await fetchJson(`${BASE_URL}/api/links/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        links: [
          { url: "https://nodejs.org" },
          { url: "https://expressjs.com" },
        ],
      }),
    });

    if (bulkRes.status !== 200 || bulkRes.data.created_count !== 2) {
      throw new Error(`Bulk import failed: ${JSON.stringify(bulkRes.data)}`);
    }
    console.log("✅ Bulk Link Creation PASSED!\n");

    console.log("==================================================");
    console.log("🎉 ALL CORE SYSTEM INTEGRATION CHECKS PASSED!");
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
