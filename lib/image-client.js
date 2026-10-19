// Browser-only image helpers: compress/resize before upload and make thumbnails.

import { TARGET_UPLOAD_BYTES, validateImageFile } from "./image-validation";

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));
}

async function decode(file) {
  if (typeof createImageBitmap === "function") {
    try {
      // Honors EXIF orientation in current browsers.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      try {
        return await createImageBitmap(file);
      } catch {
        // fall through to <img>
      }
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function drawScaled(source, maxDim) {
  const w = source.width;
  const h = source.height;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  // White background so transparent PNGs do not turn black as JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Validates, resizes and re-encodes an image as JPEG under the upload budget.
 * Returns { blob, previewUrl, width, height } or throws an Error with a
 * user-friendly message.
 */
export async function prepareImage(file, { maxDim = 1600 } = {}) {
  const check = validateImageFile(file);
  if (!check.ok) throw new Error(check.error);

  let source;
  try {
    source = await decode(file);
  } catch {
    throw new Error("That image could not be read. It may be corrupted. Please try another photo.");
  }

  let dim = maxDim;
  let blob = null;
  let canvas = null;
  for (let round = 0; round < 4; round += 1) {
    canvas = drawScaled(source, dim);
    for (const quality of [0.85, 0.75, 0.65, 0.55]) {
      blob = await canvasToBlob(canvas, quality);
      if (blob && blob.size <= TARGET_UPLOAD_BYTES) break;
    }
    if (blob && blob.size <= TARGET_UPLOAD_BYTES) break;
    dim = Math.round(dim * 0.8);
  }
  if (source.close) source.close();

  if (!blob) throw new Error("This browser could not process the image. Please try a different one.");
  if (blob.size > TARGET_UPLOAD_BYTES * 1.3) {
    throw new Error("That image is still too large after compression. Please try a smaller photo.");
  }

  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
  };
}

/** Small JPEG data URL (~5-15 KB) for scan history. The original is never stored. */
export async function makeThumbnail(blob, size = 180) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = drawScaled(img, size);
    return canvas.toDataURL("image/jpeg", 0.6);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
