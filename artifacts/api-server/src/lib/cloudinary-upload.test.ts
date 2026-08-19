import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudinaryConfig, isPublicHttpUrl, uploadBakerImage } from "./cloudinary-upload.js";

describe("cloudinary upload", () => {
  const keys = [
    "CLOUDINARY_URL",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ] as const;
  const previous = new Map<string, string | undefined>();

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of keys) {
      if (!previous.has(key)) continue;
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
      previous.delete(key);
    }
  });

  function setEnv(key: (typeof keys)[number], value: string | undefined) {
    if (!previous.has(key)) previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  it("accepts a public https URL without calling Cloudinary", async () => {
    setEnv("CLOUDINARY_CLOUD_NAME", "dqlqzecm9");
    setEnv("CLOUDINARY_API_KEY", "123");
    setEnv("CLOUDINARY_API_SECRET", "secret");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const url = "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600";
    await expect(uploadBakerImage(url)).resolves.toBe(url);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefers CLOUDINARY_URL over split env vars", () => {
    setEnv("CLOUDINARY_CLOUD_NAME", "wrong-name");
    setEnv("CLOUDINARY_API_KEY", "111");
    setEnv("CLOUDINARY_API_SECRET", "old");
    setEnv("CLOUDINARY_URL", "cloudinary://abc:def@good-cloud");
    expect(cloudinaryConfig()).toEqual({
      cloudName: "good-cloud",
      apiKey: "abc",
      apiSecret: "def",
    });
  });

  it("stores a compressed data URL when Cloudinary cloud_name is invalid", async () => {
    setEnv("CLOUDINARY_CLOUD_NAME", "dqlqzecm9");
    setEnv("CLOUDINARY_API_KEY", "123");
    setEnv("CLOUDINARY_API_SECRET", "secret");
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: { message: "Invalid cloud_name dqlqzecm9" } }),
    })));
    const dataUrl = "data:image/png;base64,aaaa";
    await expect(uploadBakerImage(dataUrl)).resolves.toBe(dataUrl);
  });

  it("stores a compressed data URL when Cloudinary is not configured", async () => {
    setEnv("CLOUDINARY_URL", undefined);
    setEnv("CLOUDINARY_CLOUD_NAME", undefined);
    setEnv("CLOUDINARY_API_KEY", undefined);
    setEnv("CLOUDINARY_API_SECRET", undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const dataUrl = "data:image/jpeg;base64,bbbb";
    await expect(uploadBakerImage(dataUrl)).resolves.toBe(dataUrl);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recognises http(s) image URLs", () => {
    expect(isPublicHttpUrl("https://res.cloudinary.com/demo/image.jpg")).toBe(true);
    expect(isPublicHttpUrl("data:image/png;base64,xx")).toBe(false);
  });
});
