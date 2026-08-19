import crypto from "node:crypto";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
/** Compressed JPEG data URLs stay under this so they can be saved without Cloudinary. */
export const MAX_STORED_IMAGE_CHARS = 350_000;
const HOSTING_UNAVAILABLE =
  "Photo hosting is not available right now. Paste a public https image URL instead.";

function parseCloudinaryUrl(value?: string): { cloudName: string; apiKey: string; apiSecret: string } | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "cloudinary:") return null;
    const cloudName = url.hostname.trim();
    const apiKey = decodeURIComponent(url.username);
    const apiSecret = decodeURIComponent(url.password);
    if (!cloudName || !apiKey || !apiSecret) return null;
    return { cloudName, apiKey, apiSecret };
  } catch {
    return null;
  }
}

export function cloudinaryConfig(): { cloudName: string; apiKey: string; apiSecret: string } | null {
  const fromUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
  if (fromUrl) return fromUrl;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function storeCompressedImage(dataUrl: string): string {
  if (dataUrl.startsWith("data:image/") && dataUrl.length <= MAX_STORED_IMAGE_CHARS) {
    return dataUrl;
  }
  throw new Error(HOSTING_UNAVAILABLE);
}

export async function uploadBakerImage(file: string): Promise<string> {
  const trimmed = file.trim();
  if (!trimmed) throw new Error("Choose an image or paste a photo URL.");

  // Never send an already-hosted URL through Cloudinary — a bad cloud_name
  // would reject pasted Unsplash/Cloudinary links that bakers can otherwise save.
  if (isPublicHttpUrl(trimmed)) {
    return trimmed.slice(0, 2000);
  }

  if (!trimmed.startsWith("data:image/")) {
    throw new Error("Paste a public https image URL or upload a JPEG, PNG or WebP photo.");
  }

  const config = cloudinaryConfig();
  if (!config) {
    return storeCompressedImage(trimmed);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "sweet-tooth";
  const signature = crypto
    .createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${config.apiSecret}`)
    .digest("hex");

  const body = new URLSearchParams({
    file: trimmed,
    api_key: config.apiKey,
    timestamp: String(timestamp),
    signature,
    folder,
  });

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    return storeCompressedImage(trimmed);
  }

  const payload = await response.json() as { secure_url?: string; error?: { message?: string } };
  if (!response.ok || !payload.secure_url) {
    const detail = payload.error?.message || "";
    if (/invalid cloud_name|unknown api_key|invalid signature/i.test(detail)) {
      return storeCompressedImage(trimmed);
    }
    try {
      return storeCompressedImage(trimmed);
    } catch {
      throw new Error("Could not upload that image. Try a smaller JPEG or PNG, or paste a public photo URL.");
    }
  }
  return payload.secure_url;
}

export function assertImagePayloadSize(file: string): void {
  if (file.length > MAX_IMAGE_BYTES * 1.4) {
    throw new Error("Image must be under 4 MB.");
  }
}
