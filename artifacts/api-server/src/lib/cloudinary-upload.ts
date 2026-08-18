import crypto from "node:crypto";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export async function uploadBakerImage(file: string): Promise<string> {
  const config = cloudinaryConfig();
  const trimmed = file.trim();
  if (!trimmed) throw new Error("Choose an image or paste a photo URL.");

  if (!config) {
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new Error("Image upload is not configured. Paste a public https image URL instead.");
    }
    return trimmed.slice(0, 2000);
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

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json() as { secure_url?: string; error?: { message?: string } };
  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message || "Could not upload that image. Try a smaller JPEG or PNG.");
  }
  return payload.secure_url;
}

export function assertImagePayloadSize(file: string): void {
  if (file.length > MAX_IMAGE_BYTES * 1.4) {
    throw new Error("Image must be under 4 MB.");
  }
}
