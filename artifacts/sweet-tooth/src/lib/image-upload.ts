import { customFetch } from "@workspace/api-client-react";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

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

export async function uploadBakerImage(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
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
