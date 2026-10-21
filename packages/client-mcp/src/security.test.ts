import { describe, expect, it } from "vitest";

import { isAllowedHost, isAllowedOrigin } from "./security.js";

describe("isAllowedOrigin", () => {
  const allowed = ["https://fanoflix.github.io", "http://localhost:5173"];

  it("accepts listed origins, with or without a trailing slash", () => {
    expect(isAllowedOrigin("https://fanoflix.github.io", allowed)).toBe(true);
    expect(isAllowedOrigin("https://fanoflix.github.io/", allowed)).toBe(true);
  });

  it("rejects other sites, look-alikes and missing origins", () => {
    expect(isAllowedOrigin("https://evil.example", allowed)).toBe(false);
    expect(isAllowedOrigin("https://fanoflix.github.io.evil.example", allowed)).toBe(false);
    expect(isAllowedOrigin("http://localhost:5174", allowed)).toBe(false);
    expect(isAllowedOrigin(undefined, allowed)).toBe(false);
  });
});

describe("isAllowedHost", () => {
  it("accepts loopback names on the listening port", () => {
    expect(isAllowedHost("127.0.0.1:47821", 47821)).toBe(true);
    expect(isAllowedHost("localhost:47821", 47821)).toBe(true);
  });

  it("rejects rebound domains, other ports and missing hosts", () => {
    expect(isAllowedHost("attacker.example:47821", 47821)).toBe(false);
    expect(isAllowedHost("127.0.0.1:47822", 47821)).toBe(false);
    expect(isAllowedHost(undefined, 47821)).toBe(false);
  });
});
