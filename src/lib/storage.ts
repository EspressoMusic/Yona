import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Local-disk media storage for development. Works out of the box with no
// external credentials, but local disk is not persistent on Vercel.
//
// TODO (production): swap this for durable object storage (S3, Supabase
// Storage, Cloudinary, etc.) by implementing the same two functions against
// that provider and pointing UPLOAD_DIR-based logic at it instead. Keep the
// return shape ({ url, filename, size, mimeType }) so callers don't change.

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "public", "uploads");
const PUBLIC_PREFIX = "/uploads";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB

export interface SavedFile {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export async function saveUploadedFile(file: File): Promise<SavedFile> {
  const mimeType = file.type || "application/octet-stream";
  const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);
  if (!isImage && !isVideo) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File is too large (max 200MB)");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.name) || (isImage ? ".jpg" : ".mp4");
  const storedName = `${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, storedName), buffer);

  return {
    url: `${PUBLIC_PREFIX}/${storedName}`,
    filename: file.name,
    size: buffer.length,
    mimeType,
  };
}

export async function deleteUploadedFile(url: string): Promise<void> {
  if (!url.startsWith(PUBLIC_PREFIX)) return;
  const filePath = path.join(UPLOAD_DIR, url.slice(PUBLIC_PREFIX.length + 1));
  await unlink(filePath).catch(() => undefined);
}
