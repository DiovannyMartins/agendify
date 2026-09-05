import { describe, expect, it } from "vitest";
import {
  PUBLIC_CODE_ALPHABET,
  PUBLIC_CODE_LENGTH,
  formatPublicCode,
  isValidPublicCode,
  normalizePublicCode,
} from "@/lib/bookings/public-code";

describe("normalizePublicCode", () => {
  it("strips hyphens and whitespace", () => {
    expect(normalizePublicCode(" ab12-cd34 ")).toBe("AB12CD34");
  });

  it("uppercases", () => {
    expect(normalizePublicCode("ab12cd34")).toBe("AB12CD34");
  });

  it("is idempotent", () => {
    expect(normalizePublicCode(normalizePublicCode("ab12-cd34"))).toBe("AB12CD34");
  });
});

describe("formatPublicCode", () => {
  it("groups an 8-char code as XXXX-XXXX", () => {
    expect(formatPublicCode("AB12CD34")).toBe("AB12-CD34");
  });

  it("normalizes before grouping", () => {
    expect(formatPublicCode("ab12-cd34")).toBe("AB12-CD34");
  });

  it("returns the input as-is when not 8 chars", () => {
    expect(formatPublicCode("AB12")).toBe("AB12");
    expect(formatPublicCode("")).toBe("");
  });
});

describe("isValidPublicCode", () => {
  it("accepts a valid code with or without separators", () => {
    expect(isValidPublicCode("AB12CD34")).toBe(true);
    expect(isValidPublicCode("ab12-cd34")).toBe(true);
  });

  it("rejects characters outside the Crockford alphabet", () => {
    // 0/O, 1/I/L are deliberately excluded.
    expect(isValidPublicCode("AB12CD0O")).toBe(false);
    expect(isValidPublicCode("AB12CD1I")).toBe(false);
    expect(isValidPublicCode("AB12CDEL")).toBe(false);
  });

  it("rejects wrong lengths", () => {
    expect(isValidPublicCode("AB12CD")).toBe(false);
    expect(isValidPublicCode("AB12CD34XX")).toBe(false);
  });

  it("rejects empty", () => {
    expect(isValidPublicCode("")).toBe(false);
  });
});

describe("constants", () => {
  it("alphabet has 32 unambiguous symbols", () => {
    expect(PUBLIC_CODE_ALPHABET).toHaveLength(32);
    expect(PUBLIC_CODE_LENGTH).toBe(8);
    expect(new Set(PUBLIC_CODE_ALPHABET).size).toBe(32);
  });
});
