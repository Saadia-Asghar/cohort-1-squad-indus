import { describe, expect, it } from "vitest";
import { verifyReceiptText } from "./receipt-analyzer.js";

const genuineReceipt = `
  Easypaisa
  Money Transferred Successfully
  Transaction ID: EP24072026123456
  Date & Time: 20 Jul 2026 18:40
  Amount: PKR 1,500.00
  Sent to: Fatima's Cakery
  Account: 03001234567
`;

describe("verifyReceiptText", () => {
  it("accepts a receipt-like transfer only for manual review", () => {
    const result = verifyReceiptText(
      genuineReceipt,
      3_000,
      50,
      "+92 300 1234567",
      "Fatima's Cakery",
    );

    expect(result.receiptLike).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.decision).toBe("manual_review");
    expect(result.extractedAmount).toBe(1_500);
    expect(result.extractedTrxId).toBe("EP24072026123456");
    expect(result.message).toContain("manual");
  });

  it("rejects ordinary images and unrelated OCR text", () => {
    const result = verifyReceiptText(
      "Happy birthday! Chocolate cake with pink flowers.",
      3_000,
      50,
      "+92 300 1234567",
      "Fatima's Cakery",
    );

    expect(result.receiptLike).toBe(false);
    expect(result.verified).toBe(false);
    expect(result.decision).toBe("rejected");
    expect(result.message).not.toContain("Recipient account match");
  });

  it("rejects text containing only a matching amount", () => {
    const result = verifyReceiptText(
      "PKR 1,500 Fatima's Cakery",
      3_000,
      50,
      "+92 300 1234567",
      "Fatima's Cakery",
    );

    expect(result.receiptLike).toBe(false);
    expect(result.verified).toBe(false);
  });

  it("rejects a receipt for the wrong recipient", () => {
    const result = verifyReceiptText(
      genuineReceipt.replace("Fatima's Cakery", "Another Store").replace("03001234567", "03119999999"),
      3_000,
      50,
      "+92 300 1234567",
      "Fatima's Cakery",
    );

    expect(result.receiptLike).toBe(true);
    expect(result.recipientMatches).toBe(false);
    expect(result.verified).toBe(false);
    expect(result.decision).toBe("rejected");
  });

  it("rejects an amount below the required deposit", () => {
    const result = verifyReceiptText(
      genuineReceipt.replace("1,500.00", "1,000.00"),
      3_000,
      50,
      "+92 300 1234567",
      "Fatima's Cakery",
    );

    expect(result.amountMatches).toBe(false);
    expect(result.verified).toBe(false);
  });

  it("does not treat a hard-coded person name as the baker account", () => {
    const result = verifyReceiptText(
      genuineReceipt.replace("Fatima's Cakery", "Sana").replace("03001234567", "03119999999"),
      3_000,
      50,
      "+92 300 1234567",
      "Fatima's Cakery",
    );

    expect(result.recipientMatches).toBe(false);
    expect(result.verified).toBe(false);
  });
});
