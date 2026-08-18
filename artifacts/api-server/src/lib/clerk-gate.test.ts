import { afterEach, describe, expect, it } from "vitest";
import { isPublicApiWithoutClerk, shouldMountClerkMiddleware } from "./clerk-gate.js";

describe("clerk middleware gating", () => {
  afterEach(() => {
    delete process.env.AUTH_MODE;
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.CLERK_PUBLISHABLE_KEY;
  });

  it("skips Clerk when AUTH_MODE is legacy even if keys are set", () => {
    process.env.AUTH_MODE = "legacy";
    process.env.CLERK_SECRET_KEY = "sk_test_x";
    process.env.CLERK_PUBLISHABLE_KEY = "pk_test_x";
    expect(shouldMountClerkMiddleware()).toBe(false);
  });

  it("mounts Clerk only for clerk or clerk-only modes", () => {
    process.env.CLERK_SECRET_KEY = "sk_test_x";
    process.env.CLERK_PUBLISHABLE_KEY = "pk_test_x";
    process.env.AUTH_MODE = "clerk";
    expect(shouldMountClerkMiddleware()).toBe(true);
    process.env.AUTH_MODE = "clerk-only";
    expect(shouldMountClerkMiddleware()).toBe(true);
  });

  it("never runs Clerk handshake on demo baker login", () => {
    expect(isPublicApiWithoutClerk("/api/bakers/login")).toBe(true);
    expect(isPublicApiWithoutClerk("/api/admin/login")).toBe(true);
    expect(isPublicApiWithoutClerk("/api/bakers/1")).toBe(false);
  });
});
