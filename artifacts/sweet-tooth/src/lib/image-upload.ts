import { customFetch } from "@workspace/api-client-react";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_EDGE = 900;
const MAX_DATA_URL_CHARS = 320_000;

export async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a JPEG, PNG or WebP image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be under 4 MB.");
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

async function compressImageFile(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not read that image."));
      element.src = objectUrl;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return fileToDataUrl(file);
    }
    context.drawImage(image, 0, 0, width, height);
    let quality = 0.72;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > MAX_DATA_URL_CHARS && quality > 0.42) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
    if (dataUrl.length > MAX_DATA_URL_CHARS) {
      throw new Error("That photo is still too large after compressing. Paste a public https image URL instead.");
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadBakerImage(file: File): Promise<string> {
  const dataUrl = await compressImageFile(file);
  const result = await customFetch<{ url: string }>("/api/uploads/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file: dataUrl }),
    responseType: "json",
  });
  if (!result.url) {
    throw new Error("Could not upload that image.");
  }
  return result.url;
}

export function isPublicImageUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isStoredImageDataUrl(value: string): boolean {
  return value.trim().startsWith("data:image/");
}

export function photoUrlFieldValue(value: string): string {
  return isStoredImageDataUrl(value) ? "" : value;
}

export function photoUrlFieldPlaceholder(value: string): string {
  return isStoredImageDataUrl(value) ? "Uploaded photo attached" : "https://…";
}
