// Shared image rules. Used in the browser (before upload) and on the server
// (after upload). The server never trusts the browser's checks.

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

// Raw file picked by the person (before compression).
export const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;
// What the browser tries to produce after compression.
export const TARGET_UPLOAD_BYTES = 1.5 * 1024 * 1024;
// Hard server limits. Vercel serverless functions accept request bodies of
// about 4.5 MB, so keep the total comfortably below that.
export const MAX_SERVER_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_SERVER_TOTAL_BYTES = 4 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 4.4 * 1024 * 1024;

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionOf(name = "") {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

/** Browser-side check of a File picked or captured by the person. */
export function validateImageFile(file) {
  if (!file) return { ok: false, error: "No image selected." };

  const type = (file.type || "").toLowerCase();
  const ext = extensionOf(file.name);
  const typeOk = ALLOWED_IMAGE_TYPES.includes(type);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);

  if (type === "image/heic" || type === "image/heif" || ext === "heic" || ext === "heif") {
    return {
      ok: false,
      error:
        "HEIC/HEIF photos are not supported. Please choose a JPG, PNG or WebP image (on iPhone, set Camera format to “Most Compatible”).",
    };
  }
  if (!typeOk && !(type === "" && extOk)) {
    return { ok: false, error: "Unsupported file type. Please use a JPG, JPEG, PNG or WebP image." };
  }
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  if (file.size > MAX_ORIGINAL_BYTES) {
    return {
      ok: false,
      error: `That image is too large (${formatBytes(file.size)}). The limit is ${formatBytes(MAX_ORIGINAL_BYTES)}.`,
    };
  }
  return { ok: true };
}

/**
 * Detect the real image type from the first bytes of a file.
 * Works with Uint8Array / Buffer, so it can run in the browser or on the server.
 */
export function sniffImageType(bytes) {
  if (!bytes || bytes.length < 12) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
