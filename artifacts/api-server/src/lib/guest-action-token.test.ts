import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGuestActionToken, guestOrderUrl, verifyGuestActionToken } from "./guest-action-token.js";

describe("guest action tokens", () => {
  beforeEach(() => {
    process.env.GUEST_ACTION_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("authorizes only the intended order, bakery and scope", () => {
    const token = createGuestActionToken({ orderId: 42, bakerId: 7, scopes: ["quote"], expiresAt: new Date("2026-08-16T12:00:00Z") });
    expect(verifyGuestActionToken(token, { orderId: 42, bakerId: 7, scope: "quote" }))?.toMatchObject({ orderId: 42, bakerId: 7 });
    expect(verifyGuestActionToken(token, { orderId: 43, scope: "quote" })).toBeNull();
    expect(verifyGuestActionToken(token, { orderId: 42, bakerId: 8, scope: "quote" })).toBeNull();
    expect(verifyGuestActionToken(token, { orderId: 42, scope: "receipt" })).toBeNull();
  });

  it("rejects tampering and expiration", () => {
    const token = createGuestActionToken({ orderId: 42, bakerId: 7, scopes: ["receipt"], expiresAt: new Date("2026-08-15T13:00:00Z") });
    expect(verifyGuestActionToken(`${token.slice(0, -1)}x`, { orderId: 42, scope: "receipt" })).toBeNull();
    vi.setSystemTime(new Date("2026-08-15T13:00:01Z"));
    expect(verifyGuestActionToken(token, { orderId: 42, scope: "receipt" })).toBeNull();
  });

  it("keeps bearer credentials out of server-visible query strings", () => {
    const url = guestOrderUrl({ orderId: 42, bakerId: 7, scopes: ["receipt"], expiresAt: new Date("2026-08-16T12:00:00Z"), action: "receipt" });
    expect(url).toContain("/orders/42?action=receipt#token=");
    expect(new URL(url).searchParams.has("token")).toBe(false);
  });
});
