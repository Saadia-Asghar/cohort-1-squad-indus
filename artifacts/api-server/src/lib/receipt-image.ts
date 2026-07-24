const DEFAULT_MAX_RECEIPT_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function configuredReceiptHosts(): Set<string> {
  return new Set(
    (process.env.RECEIPT_IMAGE_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Direct baker uploads use data: URLs — no paid image host required. */
export function isDataImageUrl(imageUrl: string): boolean {
  return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(imageUrl.trim());
}

export function assertAllowedReceiptUrl(
  imageUrl: string,
  allowedHosts = configuredReceiptHosts(),
): URL {
  if (isDataImageUrl(imageUrl)) {
    return new URL(imageUrl);
  }
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    throw new Error("Receipt image URL is invalid.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Receipt images must use HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Receipt image URL credentials are not allowed.");
  }
  // Cloudinary free tier — auto-allow when configured.
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (cloudName) {
    allowedHosts = new Set([...allowedHosts, "res.cloudinary.com"]);
  }
  if (allowedHosts.size === 0 || !allowedHosts.has(parsed.hostname.toLowerCase())) {
    if (allowedHosts.size === 0) {
      throw new Error(
        "Receipt OCR needs an HTTPS image URL from an approved host, or upload the file directly in Payments (no host setup needed).",
      );
    }
    throw new Error(
      `Receipt images must come from an approved host (${[...allowedHosts].join(", ")}).`,
    );
  }
  return parsed;
}

export function decodeDataImageUrl(imageUrl: string): { bytes: Buffer; contentType: string } {
  const match = imageUrl.trim().match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
  if (!match) {
    throw new Error("Invalid data image URL.");
  }
  const contentType = match[1]!.toLowerCase() === "image/jpg" ? "image/jpeg" : match[1]!.toLowerCase();
  const bytes = Buffer.from(match[2]!, "base64");
  validateReceiptImageBytes(bytes, contentType);
  return { bytes, contentType };
}

function hasJpegSignature(bytes: Buffer): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function hasPngSignature(bytes: Buffer): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return bytes.length >= signature.length &&
    signature.every((value, index) => bytes[index] === value);
}

function hasWebpSignature(bytes: Buffer): boolean {
  return bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

export function validateReceiptImageBytes(
  bytes: Buffer,
  contentType: string,
  maxBytes = DEFAULT_MAX_RECEIPT_BYTES,
): string {
  if (bytes.length === 0) throw new Error("Receipt image is empty.");
  if (bytes.length > maxBytes) throw new Error("Receipt image is too large.");

  const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(mediaType)) {
    throw new Error("Receipt image type must be JPEG, PNG, or WebP.");
  }

  const signatureMatches =
    (mediaType === "image/jpeg" && hasJpegSignature(bytes)) ||
    (mediaType === "image/png" && hasPngSignature(bytes)) ||
    (mediaType === "image/webp" && hasWebpSignature(bytes));
  if (!signatureMatches) {
    throw new Error("Receipt image content does not match its declared type.");
  }
  return mediaType;
}

export async function downloadReceiptImage(imageUrl: string): Promise<Buffer> {
  if (isDataImageUrl(imageUrl)) {
    return decodeDataImageUrl(imageUrl).bytes;
  }
  const parsed = assertAllowedReceiptUrl(imageUrl);
  const response = await fetch(parsed, {
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "image/jpeg,image/png,image/webp" },
  });
  if (!response.ok) {
    throw new Error("Receipt image could not be downloaded from approved storage.");
  }

  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > DEFAULT_MAX_RECEIPT_BYTES) {
    throw new Error("Receipt image is too large.");
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  validateReceiptImageBytes(
    bytes,
    response.headers.get("content-type") ?? "application/octet-stream",
  );
  return bytes;
}

/** Build a compact data URL from an uploaded file (max 4MB). */
export function toReceiptDataUrl(bytes: Buffer, contentType: string): string {
  const mediaType = validateReceiptImageBytes(bytes, contentType);
  return `data:${mediaType};base64,${bytes.toString("base64")}`;
}
