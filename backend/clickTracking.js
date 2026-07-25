const crypto = require("crypto");
const { UAParser } = require("ua-parser-js");

/**
 * Turns a raw IP address into a one-way hash instead of storing it as plain text.
 * This lets you still detect "is this the same visitor clicking repeatedly"
 * for abuse/analytics purposes, without permanently storing anyone's real IP —
 * a hash can't be reversed back into the original address.
 */
function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/**
 * Pulls out everything worth recording about a single click, from the
 * raw Express request object.
 */
function extractClickMetadata(req) {
  const userAgentString = req.headers["user-agent"] || "";
  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  // req.ip respects Express's "trust proxy" setting; falls back to the
  // raw socket address if nothing else is available.
  const rawIp = req.ip || req.connection?.remoteAddress || "";

  return {
    referrer: req.headers.referer || req.headers.referrer || null,
    userAgent: userAgentString || null,
    browser: result.browser.name || "Unknown",
    os: result.os.name || "Unknown",
    deviceType: result.device.type || "desktop", // ua-parser leaves this undefined for regular desktops
    ipHash: hashIp(rawIp),
  };
}

module.exports = { extractClickMetadata };
