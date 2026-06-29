import { getEnv } from "@/config/env";

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: { message?: string };
};

/**
 * Server-side signed upload to Cloudinary (MMS receipt path).
 * Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
 */
export async function uploadBufferToCloudinary(
  buffer: ArrayBuffer,
  options: { folder: string; mimeType?: string },
): Promise<string> {
  const env = getEnv();
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary server credentials are not configured.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options.folder;
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-1", encoder.encode(paramsToSign));
  const signature = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const body = new FormData();
  const blob = new Blob([buffer], {
    type: options.mimeType ?? "application/octet-stream",
  });
  body.append("file", blob, "receipt");
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("signature", signature);
  body.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    { method: "POST", body },
  );

  const data = (await res.json()) as CloudinaryUploadResponse;
  if (!res.ok || !data.secure_url) {
    throw new Error(
      data.error?.message ?? "Failed to upload receipt to Cloudinary.",
    );
  }

  return data.secure_url;
}
