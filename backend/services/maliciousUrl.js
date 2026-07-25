const logger = require("../logger");

// Blocked domain patterns for spam & malicious URL protection
const BLOCKED_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "169.254.169.254", // Cloud Metadata SSRF
  "test-phishing.com",
  "malware-example.org",
  "bad-actor-spam.net",
];

// Suspicious URL keywords / extensions
const BLOCKED_PATTERNS = [
  /\.exe$/i,
  /\.bat$/i,
  /\.cmd$/i,
  /\.sh$/i,
  /phishing/i,
  /malware/i,
];

/**
 * Validates whether a URL is safe to shorten.
 * Checks for HTTP/HTTPS protocol, SSRF targets, domain blocklists, and dangerous patterns.
 * @param {string} urlString 
 * @returns {{ safe: boolean, reason?: string }}
 */
function checkUrlSafety(urlString) {
  try {
    const parsed = new URL(urlString);

    // Protocol check
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, reason: "Only HTTP and HTTPS protocols are allowed" };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check blocked domains / IP addresses (SSRF prevention)
    for (const blocked of BLOCKED_DOMAINS) {
      if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
        return { safe: false, reason: `Destination domain '${hostname}' is restricted or blocked` };
      }
    }

    // Check dangerous file extensions & patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(parsed.pathname)) {
        return { safe: false, reason: "URL contains unsafe executable or suspicious patterns" };
      }
    }

    return { safe: true };
  } catch (err) {
    return { safe: false, reason: "Invalid URL string format" };
  }
}

module.exports = { checkUrlSafety, BLOCKED_DOMAINS };
