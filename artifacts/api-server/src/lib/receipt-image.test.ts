import { describe, expect, it } from "vitest";
import {
  assertAllowedReceiptUrl,
  validateReceiptImageBytes,
} from "./receipt-image.js";

describe("receipt image input security", () => {
  it("allows only HTTPS URLs on configured storage hosts", () => {
    expect(
      assertAllowedReceiptUrl(
        "https://receipts.example.com/orders/123.jpg",
        new Set(["receipts.example.com"]),
      ).hostname,
    ).toBe("receipts.example.com");

    expect(() =>
      assertAllowedReceiptUrl("http://receipts.example.com/123.jpg", new Set(["receipts.example.com"])),
    ).toThrow(/HTTPS/);
    expect(() =>
      assertAllowedReceiptUrl("https://127.0.0.1/secret", new Set(["receipts.example.com"])),
    ).toThrow(/approved storage/);
    expect(() =>
      assertAllowedReceiptUrl("https://evil.example/123.jpg", new Set(["receipts.example.com"])),
    ).toThrow(/approved storage/);
  });

  it("checks MIME type, actual file signature, and size", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(validateReceiptImageBytes(jpeg, "image/jpeg", 1024)).toBe("image/jpeg");

    expect(() =>
      validateReceiptImageBytes(Buffer.from("<script>alert(1)</script>"), "image/jpeg", 1024),
    ).toThrow(/content/);
    expect(() => validateReceiptImageBytes(jpeg, "text/html", 1024)).toThrow(/type/);
    expect(() => validateReceiptImageBytes(jpeg, "image/jpeg", 2)).toThrow(/large/);
  });
});
