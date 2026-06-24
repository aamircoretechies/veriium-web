/**
 * Client-side unsigned upload to Cloudinary.
 * Requires NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.
 */
export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error("File uploads are not configured.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    { method: "POST", body },
  );

  if (!res.ok) {
    throw new Error("Failed to upload file. Please try again.");
  }

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) {
    throw new Error("Failed to upload file. Please try again.");
  }
  return data.secure_url;
}
