const request = require("supertest");
const { encode, decode } = require("./base62");
const { checkUrlSafety } = require("./services/maliciousUrl");

describe("Base62 Encoding Unit Tests", () => {
  it("should encode numbers correctly", () => {
    expect(encode(1)).toBe("1");
    expect(encode(62)).toBe("10");
  });

  it("should decode base62 strings back to original numbers", () => {
    expect(decode("1")).toBe(1);
    expect(decode("10")).toBe(62);
  });
});

describe("Malicious URL & SSRF Prevention Unit Tests", () => {
  it("should allow valid https URLs", () => {
    const res = checkUrlSafety("https://github.com/facebook/react");
    expect(res.safe).toBe(true);
  });

  it("should block localhost and internal IP SSRF attempts", () => {
    const res1 = checkUrlSafety("http://localhost:5000/secret");
    expect(res1.safe).toBe(false);

    const res2 = checkUrlSafety("http://169.254.169.254/latest/meta-data/");
    expect(res2.safe).toBe(false);
  });

  it("should block executable files and malware patterns", () => {
    const res = checkUrlSafety("https://example.com/malware.exe");
    expect(res.safe).toBe(false);
  });
});
