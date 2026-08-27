import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_DIMENSION = 1600;
const THUMB_WIDTH = 480;

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function isAllowedImage(mime: string): boolean {
  return mime in ALLOWED_MIME;
}

export function extFor(mime: string): string {
  return ALLOWED_MIME[mime] ?? "bin";
}

function outputExt(mime: string): string {
  if (mime === "image/gif") return "gif";
  if (mime === "image/png") return "png";
  return "webp";
}

async function optimizeImage(buffer: Buffer, mime: string): Promise<Buffer> {
  if (mime === "image/gif") {
    // Validate GIF: must start with GIF87a or GIF89a
    const header = buffer.toString("ascii", 0, 6);
    if (header !== "GIF87a" && header !== "GIF89a") {
      throw new Error("Invalid GIF file — magic bytes mismatch");
    }
    return buffer;
  }
  try {
    const img = sharp(buffer);
    const meta = await img.metadata();
    if (meta.width && meta.width > MAX_DIMENSION) {
      img.resize({ width: MAX_DIMENSION, withoutEnlargement: true });
    }
    if (mime === "image/png") return img.png({ quality: 85, compressionLevel: 6 }).toBuffer();
    if (mime === "image/webp") return img.webp({ quality: 80 }).toBuffer();
    return img.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } catch (err) {
    // sharp failed → file is not a valid image of the claimed type
    throw new Error("Invalid image file — could not process");
  }
}

async function generateThumbnail(buffer: Buffer, mime: string): Promise<Buffer | null> {
  if (mime === "image/gif") return buffer;
  try {
    const img = sharp(buffer).resize({ width: THUMB_WIDTH, withoutEnlargement: true });
    return await img.webp({ quality: 75 }).toBuffer();
  } catch {
    return null;
  }
}

/**
 * Returns a thumbnail URL from an original upload URL.
 * e.g. "/uploads/2026/08/abc.webp" → "/uploads/2026/08/abc_thumb.webp"
 */
export function thumbUrlFromOriginal(originalUrl: string): string | null {
  if (!originalUrl.startsWith("/uploads/")) return null;
  const lastSlash = originalUrl.lastIndexOf("/");
  const filename = originalUrl.slice(lastSlash + 1);
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const base = filename.slice(0, dotIdx);
  const ext = filename.slice(dotIdx);
  return `${originalUrl.slice(0, lastSlash + 1)}${base}_thumb${ext}`;
}

export async function saveUpload(buffer: Buffer, mime: string): Promise<{ url: string; filePath: string }> {
  const optimized = await optimizeImage(buffer, mime);
  const now = new Date();
  const yyyy = now.getUTCFullYear().toString();
  const mm = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  const dir = path.join(UPLOAD_DIR, yyyy, mm);
  await mkdir(dir, { recursive: true });
  const ext = outputExt(mime);
  const base = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const name = `${base}.${ext}`;
  const filePath = path.join(dir, name);
  await writeFile(filePath, optimized);

  // Generate thumbnail alongside (non-blocking)
  generateThumbnail(buffer, mime)
    .then((thumb) => { if (thumb && thumb.length > 0) return writeFile(path.join(dir, `${base}_thumb.webp`), thumb); })
    .catch(() => {});

  return { url: `/uploads/${yyyy}/${mm}/${name}`, filePath };
}

export async function deleteUploadByUrl(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return;
  const rel = url.replace("/uploads/", "");
  const filePath = path.join(UPLOAD_DIR, rel);
  try {
    await unlink(filePath);
  } catch {}
  // Also delete thumbnail if it exists
  try {
    const thumbPath = path.join(UPLOAD_DIR, rel.replace(/(\.[^.]+)$/, "_thumb$1"));
    await unlink(thumbPath);
  } catch {}
}
