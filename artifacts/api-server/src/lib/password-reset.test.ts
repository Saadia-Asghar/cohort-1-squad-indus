import { afterEach, describe, expect, it } from "vitest";
import {
  appPublicUrl,
  createPasswordResetToken,
  hashResetToken,
  isLocalDev,
  isMailerConfigured,
  passwordResetUrl,
} from "./password-reset.js";

describe("password reset helpers", () => {
  const keys = [
    "FRONTEND_URL",
    "NODE_ENV",
    "VERCEL",
    "RESEND_API_KEY",
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASS",
  ] as const;
  const previous = new Map<string, string | undefined>();

  afterEach(() => {
    for (const key of keys) {
      if (previous.has(key)) {
        const value = previous.get(key);
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
        previous.delete(key);
      }
    }
  });

  function setEnv(key: (typeof keys)[number], value: string | undefined) {
    if (!previous.has(key)) previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  it("uses FRONTEND_URL and the dashboard reset path", () => {
    setEnv("FRONTEND_URL", "https://cohort-1-squad-indus-sweet-tooth.vercel.app/");
    expect(passwordResetUrl("abc+token")).toBe(
      "https://cohort-1-squad-indus-sweet-tooth.vercel.app/dashboard/reset-password?token=abc%2Btoken",
    );
  });

  it("falls back to the live app on Vercel and local port 5180 in development", () => {
    setEnv("FRONTEND_URL", undefined);
    setEnv("VERCEL", "1");
    setEnv("NODE_ENV", "production");
    expect(appPublicUrl()).toBe("https://cohort-1-squad-indus-sweet-tooth.vercel.app");

    setEnv("VERCEL", undefined);
    setEnv("NODE_ENV", "development");
    expect(appPublicUrl()).toBe("http://localhost:5180");
  });

  it("hashes reset tokens and treats development as local when Vercel is unset", () => {
    setEnv("NODE_ENV", "development");
    setEnv("VERCEL", undefined);
    expect(isLocalDev()).toBe(true);

    const first = createPasswordResetToken();
    expect(first.token).toHaveLength(64);
    expect(first.tokenHash).toBe(hashResetToken(first.token));
    expect(first.tokenHash).not.toBe(first.token);
    expect(first.expires.getTime()).toBeGreaterThan(Date.now());
  });

  it("requires Resend or SMTP before sending production mail", () => {
    setEnv("RESEND_API_KEY", undefined);
    setEnv("SMTP_HOST", undefined);
    setEnv("SMTP_USER", undefined);
    setEnv("SMTP_PASS", undefined);
    expect(isMailerConfigured()).toBe(false);

    setEnv("RESEND_API_KEY", "re_test");
    expect(isMailerConfigured()).toBe(true);
  });
});
