/**
 * Phase 1: The Brain — Base62 Encoding
 * -------------------------------------
 * Converts a number (like a database auto-increment ID) into a short,
 * URL-safe string, and back again.
 */

const CHARSET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = CHARSET.length; // 62

/**
 * encode(id) -> short code string
 * Repeatedly divides the number by 62, using the remainder each time
 * to pick a character. This is the same idea as converting decimal
 * to binary/hex, just with a 62-character alphabet instead of 2 or 16.
 */
function encode(id) {
  if (id === 0) return CHARSET[0]; // handle zero explicitly

  let result = "";
  let num = id;

  while (num > 0) {
    const remainder = num % BASE;      // which character this digit maps to
    result = CHARSET[remainder] + result; // prepend (we build it backwards)
    num = Math.floor(num / BASE);      // move to the next "digit"
  }

  return result;
}

/**
 * decode(code) -> original number
 * Reverses the process: walk through the string left to right,
 * treating each character as a digit in base 62.
 */
function decode(code) {
  let num = 0;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const value = CHARSET.indexOf(char); // position of char in our alphabet
    num = num * BASE + value;
  }

  return num;
}

// --- Quick self-test ---
const testIds = [0, 1, 61, 62, 5000, 123456789];

testIds.forEach((id) => {
  const code = encode(id);
  const back = decode(code);
  console.log(
    `id=${id} -> encode -> "${code}" -> decode -> ${back} ${
      back === id ? "✅" : "❌ MISMATCH"
    }`
  );
});

module.exports = { encode, decode, CHARSET, BASE };
