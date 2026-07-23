import {
  isReceiptUploadMock,
  MOCK_RECEIPT_IMAGE_URL,
} from "@/lib/dev/flags";

export class InvalidAttachmentUrlError extends Error {
  constructor(message = "Invalid attachment URL.") {
    super(message);
    this.name = "InvalidAttachmentUrlError";
  }
}

function getCloudName(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
    process.env.CLOUDINARY_CLOUD_NAME
  )?.trim();
}

function isAllowedCloudinaryUrl(url: URL, cloudName: string): boolean {
  if (url.hostname !== "res.cloudinary.com") {
    return false;
  }
  const [cloudSegment] = url.pathname.split("/").filter(Boolean);
  return cloudSegment === cloudName;
}

function isAllowedMockUrl(url: URL): boolean {
  if (!isReceiptUploadMock()) {
    return false;
  }
  const mock = new URL(MOCK_RECEIPT_IMAGE_URL);
  return url.protocol === "https:" && url.hostname === mock.hostname;
}

/** Reject non-HTTPS or untrusted attachment URLs before writing to Airtable. */
export function validateIntakeAttachmentUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new InvalidAttachmentUrlError();
  }

  if (parsed.protocol !== "https:") {
    throw new InvalidAttachmentUrlError("Attachment URLs must use HTTPS.");
  }

  if (isAllowedMockUrl(parsed)) {
    return;
  }

  const cloudName = getCloudName();
  if (!cloudName || !isAllowedCloudinaryUrl(parsed, cloudName)) {
    throw new InvalidAttachmentUrlError(
      "Attachment URL is not from an allowed source.",
    );
  }
}

export function toAirtableAttachments(
  urls: string[],
): { url: string }[] {
  return urls.map((url) => {
    validateIntakeAttachmentUrl(url);
    return { url };
  });
}
