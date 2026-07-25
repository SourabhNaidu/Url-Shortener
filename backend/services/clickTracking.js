const crypto = require("crypto");
const { UAParser } = require("ua-parser-js");
const geoip = require("geoip-lite");

/**
 * Anonymizes IP address using SHA256 hash for privacy regulation compliance (GDPR)
 */
function hashIp(ip) {
  if (!ip) return "unknown";
  return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
}

/**
 * Extracts rich metadata from HTTP request
 */
function extractClickMetadata(req) {
  const userAgentString = req.headers["user-agent"] || "";
  const referrer = req.headers["referer"] || req.headers["referrer"] || "Direct";
  
  // IP Extraction supporting reverse proxies (Nginx / Cloudflare)
  const rawIp =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket.remoteAddress ||
    "127.0.0.1";

  // Parse User Agent
  const parser = new UAParser(userAgentString);
  const uaResult = parser.getResult();

  // GeoIP Lookup
  let country = "Unknown";
  let city = "Unknown";

  if (rawIp && rawIp !== "127.0.0.1" && rawIp !== "::1") {
    const geo = geoip.lookup(rawIp);
    if (geo) {
      country = geo.country || "Unknown";
      city = geo.city || "Unknown";
    }
  }

  return {
    referrer,
    userAgent: userAgentString,
    browser: uaResult.browser.name || "Unknown",
    os: uaResult.os.name || "Unknown",
    deviceType: uaResult.device.type || "desktop",
    ipHash: hashIp(rawIp),
    country,
    city,
    isQr: req.query.qr === "true" || req.query.src === "qr",
  };
}

module.exports = {
  extractClickMetadata,
  hashIp,
};
